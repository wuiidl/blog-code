# 004 — Agent runtime

Companion to the post *The box is the trust boundary* on
[waltergugenberger.com](https://waltergugenberger.com).

A minimal CDK stack for a hardened EC2 instance designed to run an
autonomous process (AI coding agent, long-running automation,
anything with real credentials). The point: seal the box, and you
stop needing to trust what the process inside it does minute to
minute.

## What this shows

- **No SSH.** Access via SSM Session Manager only. One whole
  attack surface removed.
- **Root locked.** Operations run as an unprivileged `agent` user.
- **IMDSv2 required.** Blocks the SSRF → credential-theft path.
- **Kernel hardening.** IP forwarding off, SYN cookies on, reverse
  path filter on, IPv6 off.
- **Unnecessary services disabled.** No rpcbind, no avahi, no
  telnet, no ftp.
- **Automatic security updates** via dnf-automatic.
- **Sealed outbound.** Security group allows 80/443 out only. No
  inbound at all.
- **Encrypted EBS.** GP3, 20 GiB, encrypted with an AWS-managed key.
- **ARM64 (Graviton).** Cheaper, cooler, no downside for most
  workloads. Uses the `t4g` family.

## What this does NOT show

This is the runtime, not the workload. What you run inside the box
(Claude Code, a Python worker, a Rust daemon) is deliberately out of
scope. The post argues the box *is* the trust boundary; the workload
is whatever you point at it.

## Further hardening

The stack above is deliberately minimal. Here's what you'd layer on
for a production deployment. Treat this as a checklist, not a
prescription. Pick the ones that match your threat model and
regulatory floor.

### More host hardening (add to user-data)

- **Remove `openssh-server`.** AL2023 ships with the daemon running.
  Since access is SSM-only, it should not be installed.
  `systemctl disable --now sshd; dnf -y remove openssh-server`.
- **Additional sysctl flags** beyond what's in the example:
  - `kernel.kptr_restrict = 2`, `kernel.dmesg_restrict = 1` —
    hide kernel internals from userland.
  - `kernel.yama.ptrace_scope = 2` — stop user processes from
    snooping each other's memory.
  - `kernel.unprivileged_bpf_disabled = 1`,
    `net.core.bpf_jit_harden = 2` — reduce BPF attack surface.
  - `net.ipv4.conf.{all,default}.accept_source_route = 0` —
    reject source-routed packets.
  - `net.ipv4.conf.{all,default}.log_martians = 1` — log
    spoofed-source packets.
  - `net.ipv4.icmp_echo_ignore_broadcasts = 1`,
    `net.ipv4.icmp_ignore_bogus_error_responses = 1`.
  - `net.ipv4.conf.{all,default}.secure_redirects = 0`.
  - `fs.suid_dumpable = 0` — no core dumps from suid binaries.
- **Mount hardening.** `/tmp`, `/var/tmp`, and `/dev/shm` with
  `nosuid,nodev,noexec`. Prevents privilege escalation via
  writable-execution paths.
- **SELinux enforcing.** AL2023 ships with SELinux in enforcing mode
  by default. Verify on first boot: `setenforce 1` and confirm
  `/etc/selinux/config` has `SELINUX=enforcing`.
- **Auto-reboot on kernel updates.** In `/etc/dnf/automatic.conf`,
  set `reboot = when-needed`. Without it, kernel CVEs get patched
  but aren't active until someone reboots manually.
- **auditd rules.** Watch `/etc/passwd`, `/etc/shadow`, `/etc/sudoers`;
  log execve of suid binaries; log changes to `/etc/hosts` and
  `/etc/resolv.conf`. Rules go in `/etc/audit/rules.d/`.

### CDK-level additions

- **IMDS hop limit = 1.** Set `httpPutResponseHopLimit: 1` on the
  instance. Stops any container running on the box from reaching
  IMDS through the host.
- **Scheduled start/stop.** EventBridge Scheduler targeting
  `ec2:StartInstances` and `ec2:StopInstances`. Cost win, plus a
  smaller attack window when you're not using the instance.
- **SSM Session Manager session logging.** A `SessionManagerRunShell`
  SSM Document routing session output to CloudWatch Logs or S3 with
  optional KMS encryption. Gives you an audit trail of "what the
  operator typed."
- **CloudWatch agent.** Ship `/var/log/audit/audit.log`,
  `/var/log/secure`, `/var/log/dnf-automatic.log`, and the systemd
  journal off-box. Requires `CloudWatchAgentServerPolicy` on the
  IAM role.

### Architecture variants

- **Private subnet + VPC endpoints.** Remove the IGW and put the
  instance in a private subnet. Add VPC interface endpoints for
  `ssm`, `ssmmessages`, and `ec2messages`. SSM continues to work;
  the box has no public internet.
- **Credential bootstrap via SSM Parameter Store.** Store secrets as
  `SecureString` parameters, fetch at boot via user-data, restart the
  workload on refresh. Never on disk in the AMI, never in git.
- **Workload isolation via systemd unit hardening.** When you point
  this at an actual process, add `NoNewPrivileges=true`,
  `ProtectSystem=strict`, `ProtectHome=true`, `PrivateTmp=true`, and
  the minimum `ReadWritePaths=` needed. Defense in depth.
- **Instance refresh / AMI updates.** CDK doesn't bake immutable
  infrastructure updates in for you. For long-lived instances,
  combine with an AutoScaling Group of size 1 and instance refresh
  on new AMI builds.

## Deploy

Prerequisites: Node.js 24, `pnpm`, an AWS account, AWS CLI
configured (`aws configure` or a named profile), CDK bootstrapped in
your account+region (`cdk bootstrap` once per account+region).

```sh
pnpm install
pnpm run synth   # CloudFormation output — inspect before deploying
pnpm run deploy  # creates the stack
```

## Connect

Find the instance ID:

```sh
aws cloudformation describe-stacks \
  --stack-name AgentRuntimeStack \
  --query 'Stacks[0].Outputs[?OutputKey==`InstanceId`].OutputValue' \
  --output text
```

Open a session:

```sh
aws ssm start-session --target <instance-id>
```

You'll land as `ssm-user`. Switch to the agent user:

```sh
sudo -iu agent
```

No SSH key needed. No port open. No password.

## Destroy

```sh
pnpm run destroy
```

## Files

- `bin/app.ts` — CDK app entry
- `lib/agent-runtime-stack.ts` — the stack
- `cdk.json` — CDK config
- `package.json` — dependencies + scripts
- `tsconfig.json` — TypeScript config

## What to change before deploying

This stack deploys into your account's default region with no
environment pinning. If you want to pin region/account, edit
`bin/app.ts` and set `env` explicitly:

```ts
new AgentRuntimeStack(app, "AgentRuntimeStack", {
  env: { account: "YOUR_ACCOUNT_ID", region: "us-east-1" },
});
```

Everything else should work as-is. The stack uses the default VPC in
the target region; if you don't have one, add a `Vpc` construct or
point the stack at an existing one.
