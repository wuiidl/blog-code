import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

/**
 * Hardened EC2 runtime for running an autonomous process.
 *
 * Seals the box so you stop needing to trust whatever's running inside it
 * moment-to-moment. The process gets its own unprivileged user, no network
 * inbound, outbound to 80/443 only, no SSH, no root login, IMDSv2 required,
 * kernel hardened, automatic security updates, encrypted storage.
 *
 * What you run inside is out of scope. Point it at your workload — Claude
 * Code, a Python worker, a Rust daemon — via a systemd unit added in your
 * own user-data extension or via SSM Run Command after deploy.
 */
export class AgentRuntimeStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Default VPC keeps the example small. The instance sits in a public
    // subnet; SSM reaches the control channel via the attached IGW.
    //
    // If you want the instance in a private subnet, you must add VPC
    // endpoints for `ssm`, `ssmmessages`, and `ec2messages`. Without those
    // endpoints SSM Session Manager cannot connect — a private-subnet
    // instance with no IGW and no endpoints is unreachable.
    const vpc = ec2.Vpc.fromLookup(this, "DefaultVpc", { isDefault: true });

    // Security group: no inbound, outbound on 80/443 only. HTTPS is needed
    // for SSM, package updates, and whatever the workload talks to.
    const sg = new ec2.SecurityGroup(this, "RuntimeSg", {
      vpc,
      description: "Agent runtime — no inbound, HTTP/HTTPS outbound only",
      allowAllOutbound: false,
    });
    sg.addEgressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443), "HTTPS out");
    sg.addEgressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), "HTTP out (dnf)");

    // IAM role: SSM access for Session Manager. Nothing else.
    // Your workload will likely need additional least-privilege policies
    // attached here. Keep each one narrow.
    const role = new iam.Role(this, "RuntimeRole", {
      assumedBy: new iam.ServicePrincipal("ec2.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonSSMManagedInstanceCore"),
      ],
    });

    // User-data: one-time hardening done on first boot. Idempotent, so
    // reboots are safe.
    const userData = ec2.UserData.forLinux({ shebang: "#!/bin/bash" });
    userData.addCommands(
      "set -euxo pipefail",

      // Create an unprivileged agent user. The workload runs as this user.
      "useradd -m -s /bin/bash agent || true",

      // Lock the root account. Anyone who reaches the box enters as
      // ssm-user (via Session Manager) and has to sudo -iu agent.
      "passwd -l root",

      // Kernel hardening via sysctl. IP forwarding off (this box isn't a
      // router), SYN cookies on (SYN flood mitigation), reverse-path
      // filtering on (spoofed-source rejection), IPv6 off (reduce surface).
      "cat > /etc/sysctl.d/99-agent-hardening.conf <<'SYSCTL'",
      "net.ipv4.ip_forward = 0",
      "net.ipv4.conf.all.send_redirects = 0",
      "net.ipv4.conf.default.send_redirects = 0",
      "net.ipv4.conf.all.accept_redirects = 0",
      "net.ipv4.conf.default.accept_redirects = 0",
      "net.ipv4.conf.all.rp_filter = 1",
      "net.ipv4.conf.default.rp_filter = 1",
      "net.ipv4.tcp_syncookies = 1",
      "net.ipv6.conf.all.disable_ipv6 = 1",
      "net.ipv6.conf.default.disable_ipv6 = 1",
      "SYSCTL",
      "sysctl --system",

      // Disable services that have no business running on this box.
      // rpcbind/avahi are on by default in some minimal images and are
      // frequent CVE targets. telnet/ftp shouldn't exist in 2026.
      "for svc in rpcbind avahi-daemon; do",
      "  systemctl disable --now $svc 2>/dev/null || true",
      "done",
      "dnf -y remove telnet ftp 2>/dev/null || true",

      // Automatic security updates.
      "dnf -y install dnf-automatic",
      "sed -i 's/^apply_updates = no/apply_updates = yes/' /etc/dnf/automatic.conf",
      "systemctl enable --now dnf-automatic.timer",

      // SSM agent ships on Amazon Linux 2023 but confirm it's running.
      "systemctl enable --now amazon-ssm-agent",
    );

    // EC2 instance. t4g.small is cheap and plenty for most agent workloads.
    // Bump to t4g.medium or t4g.large if your agent needs the RAM.
    const instance = new ec2.Instance(this, "Runtime", {
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.SMALL),
      machineImage: ec2.MachineImage.latestAmazonLinux2023({
        cpuType: ec2.AmazonLinuxCpuType.ARM_64,
      }),
      securityGroup: sg,
      role,
      userData,
      // IMDSv2 required. Cuts off the SSRF → instance-credential-theft path.
      requireImdsv2: true,
      blockDevices: [
        {
          deviceName: "/dev/xvda",
          volume: ec2.BlockDeviceVolume.ebs(20, {
            volumeType: ec2.EbsDeviceVolumeType.GP3,
            encrypted: true,
            deleteOnTermination: true,
          }),
        },
      ],
    });

    new cdk.CfnOutput(this, "InstanceId", {
      value: instance.instanceId,
      description: "Use with: aws ssm start-session --target <id>",
    });
  }
}
