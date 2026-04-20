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

Also out of scope in this example (each is a real pattern worth
including in production, but would bloat a companion example):

- Scheduled start/stop for cost + reduced attack window. Add via
  EventBridge rules targeting `ec2:StartInstances` / `StopInstances`
  in a follow-up.
- Credential bootstrap (SSM Parameter Store + user-data fetch at
  boot). Use placeholder `SecureString` parameters and read them in
  your workload's systemd unit.
- VPC endpoints for SSM. The stack here uses public-subnet + IGW for
  simplicity. For tighter isolation, put the instance in a private
  subnet with endpoints for `ssm`, `ssmmessages`, `ec2messages`.
- CloudWatch logs / metrics for the workload.
- Instance refresh / AMI updates.

## Deploy

Prerequisites: Node.js 18+, `pnpm`, an AWS account, AWS CLI
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
