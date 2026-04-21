# Scaffold blog-code + first example (004 agent runtime)

**Date:** 2026-04-20
**Status:** In progress

## Goal

Stand up the `blog-code` public repo and populate its first example: a
minimal hardened-EC2 CDK stack that pairs with the post
*The box is the trust boundary*.

## Deliverables

Repo root:
- `README.md` — public-facing entry, lists examples, links back to
  the blog.
- `AGENTS.md` — agent rules mirroring the other repos (no push, no
  commit without approval, spec-driven, conventional commits, squash
  merge, plus a public-repo-specific rule against committing
  real identifiers).
- `.claude/CLAUDE.md` — one-line import of `AGENTS.md`.
- `.gitignore` — node_modules, cdk.out, editor/OS noise, env files.
- `LICENSE` — MIT.

`004-agent-runtime/`:
- `README.md` — what the example shows, what's deliberately out of
  scope, how to deploy, how to connect via SSM, how to destroy.
- `package.json` — aws-cdk + aws-cdk-lib, ts-node, typescript. Same
  versions as other CDK repos in the org.
- `tsconfig.json` — strict TS, CDK-compatible target.
- `cdk.json` — ts-node app entry, `@aws-cdk/aws-ec2:restrictDefaultSecurityGroup`
  enabled.
- `bin/app.ts` — CDK app entry, no environment pinning (uses CLI's
  current account/region by default).
- `lib/agent-runtime-stack.ts` — the stack. EC2 t4g.small on ARM64
  Amazon Linux 2023, public subnet in the default VPC, security
  group (no inbound, 80/443 out only), IAM role with
  `AmazonSSMManagedInstanceCore`, IMDSv2 required, encrypted GP3
  20GiB, user-data that locks root, creates an `agent` user,
  applies sysctl hardening, disables rpcbind/avahi/telnet/ftp,
  enables dnf-automatic.

## Decisions

- **Numbered folders (`004-agent-runtime/`).** Ties each example to
  a post via the same numeric index used in `thegugenberger`'s
  content bank / task specs.
- **Self-contained folders.** Each example has its own
  `package.json`. No repo-level tooling. Simpler to reason about for
  readers who only want one example.
- **Default VPC lookup.** Keeps the example small. A production
  deployer would want explicit VPC with private subnets + VPC
  endpoints. Documented as a follow-up in the folder README.
- **ARM64 / Graviton.** Matches `remote-claude`. Cheaper, no
  downside for this workload.
- **Generic, not a copy of remote-claude.** The post argues the
  *pattern*. The private repo is Walter's implementation. Reader gets
  the pattern here, implementation stays private.
- **License: MIT.** Standard for reference code; lets anyone fork.

## Follow-ups (separate examples when future posts need them)

- Scheduled start/stop example. Minimal EventBridge + Lambda or
  EventBridge Scheduler targeting `ec2:StartInstances` /
  `ec2:StopInstances`.
- Credential bootstrap via SSM Parameter Store: how to store secrets,
  fetch at boot, restart the workload.
- Private subnet + VPC endpoints variant for teams that want the
  instance off the public internet.
- Monitoring: CloudWatch logs for a systemd workload, alarms for
  CPU/disk, runbook link from the alarm.

## Verification

- Repo clones from `github.com/wuiidl/blog-code`.
- `cd 004-agent-runtime && pnpm install && pnpm run synth` produces
  valid CloudFormation.
- Deploying the stack in a sandbox AWS account provisions an
  instance reachable via `aws ssm start-session`.
- `passwd -S root` on the instance reports `L` (locked).
- `sudo cat /etc/sysctl.d/99-agent-hardening.conf` shows the
  expected settings.
