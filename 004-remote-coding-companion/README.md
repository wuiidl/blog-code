# 004 — Remote coding companion

Companion to the post *I built a product from my phone* on
[waltergugenberger.com](https://waltergugenberger.com).

> **Not a security review.** I'm a software engineer, not a security
> professional. The hardening flags here are sensible defaults the
> AI agent generated for me, not a reviewed security posture. See
> the repo [README](../README.md#disclaimer) for the full disclaimer.
> For a serious, multi-user, actively-maintained self-hostable
> autonomous-agent runtime, look at **OpenClaw**. What's here is the
> minimum kit I actually run.

The minimum cloud setup to run Claude Code on a box you own,
reachable from the Claude iOS app. One EC2 instance. Hardened
defaults. SSM for access. tmux for session persistence. Claude Code
installed on first boot.

## What this shows

- **An EC2 instance you own**, reachable from the Claude iOS app via
  SSM. No SSH, no exposed ports.
- **First-boot bootstrap** installs tmux, Node, and Claude Code for
  an unprivileged `agent` user.
- **Session persistence** via tmux. Start a named session, detach,
  come back fifteen minutes or two days later, pick up where you
  left off.
- **Hardening defaults** baked into the stack: IMDSv2, SSM-only
  access, root locked, kernel sysctl, IPv6 off, dnf-automatic for
  security updates, encrypted EBS, outbound restricted to 80/443.
- **ARM64 (Graviton)**. Cheaper, cooler, no downside.

## What this is not

- **Not a production platform.** It's a starting kit you can have
  running in an afternoon.
- **Not a substitute for OpenClaw.** If you want a mature
  self-hostable autonomous-agent runtime with real multi-user,
  monitoring, and community support, go there.
- **Not security-reviewed for shared use.** Single operator, single
  AWS account. Running this with other people's credentials or on
  behalf of a team needs more.

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
  --stack-name RemoteCodingCompanionStack \
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

No SSH key, no port open, no password.

## First-time setup

User-data has already installed tmux, Node, and Claude Code globally
for the `agent` user. You authenticate Claude Code once and start a
named tmux session.

```sh
# Once connected and switched to agent user:
tmux new -s claude
# inside tmux:
claude    # authenticate on first run; answer the prompts
```

Detach with `Ctrl-b` then `d`. The agent keeps thinking. When you
come back — from your laptop, from the Claude iOS app, hours or days
later — reconnect and reattach:

```sh
aws ssm start-session --target <instance-id>
sudo -iu agent
tmux attach -t claude
```

The tmux session lives on the box, not in your SSM session. That's
what makes the phone-on-the-couch, laptop-in-the-morning flow work.

## Further hardening

The defaults above are a reasonable floor. Not a ceiling. If you're
running this against real credentials, layer on what matches your
threat model:

- Remove `openssh-server`, enable SELinux enforcing, add `auditd`
  rules, harden mounts (`nosuid,nodev,noexec` on `/tmp`).
- CDK additions: IMDS hop limit 1, scheduled start/stop, SSM session
  logging to CloudWatch or S3, CloudWatch agent shipping audit logs.
- Architecture variants: private subnet + VPC endpoints, credential
  bootstrap via Parameter Store, systemd unit hardening on the
  workload, immutable infrastructure via AutoScaling Group with
  instance refresh.

None of this is exhaustive. OpenClaw is a good reference for what a
production-grade version looks like.

## Destroy

```sh
pnpm run destroy
```

## Files

- `bin/app.ts` — CDK app entry
- `lib/remote-coding-companion-stack.ts` — the stack
- `cdk.json` — CDK config
- `package.json` — dependencies + scripts
- `tsconfig.json` — TypeScript config

## What to change before deploying

This stack deploys into your account's default region with no
environment pinning. If you want to pin region/account, edit
`bin/app.ts` and set `env` explicitly:

```ts
new RemoteCodingCompanionStack(app, "RemoteCodingCompanionStack", {
  env: { account: "YOUR_ACCOUNT_ID", region: "us-east-1" },
});
```

Everything else should work as-is. The stack uses the default VPC in
the target region; if you don't have one, add a `Vpc` construct or
point the stack at an existing one.
