# blog-code

Working code examples referenced from [waltergugenberger.com](https://waltergugenberger.com).

Each post that talks about real infrastructure or patterns has a folder here with a minimal, deployable example. The examples are intentionally generic: no personal AWS accounts, no private account IDs, no secrets. Fork, fill in your own context, deploy.

## Layout

Each folder is a standalone example. Pick the one that matches the post you're reading:

| Folder | Post | What it shows |
|--------|------|---------------|
| [`004-agent-runtime/`](./004-agent-runtime/) | The box is the trust boundary | Minimal CDK stack for a hardened EC2 instance that runs autonomous processes. SSM-only access, no SSH, root locked, IMDSv2, kernel hardening. |

Folders are numbered to match the post index. Each folder is self-contained — separate `package.json`, separate CDK app, separate deploy.

## Why a separate repo

The real infrastructure I run (the actual `remote-claude` instance I work on every day, the Marquis stack, etc.) stays private. What goes here is the pattern — stripped to essentials, documented, reproducible. If you want to run the same thing, this is enough to get started. If you want to copy my personal setup, that's a different ask.

## Contributing

Not accepting PRs. These are companion examples to the blog; fork if you want to build on them.

## License

MIT. See [LICENSE](./LICENSE).
