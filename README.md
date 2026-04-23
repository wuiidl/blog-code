# blog-code

Working code examples referenced from [waltergugenberger.com](https://waltergugenberger.com).

## Disclaimer

I'm a software engineer, not a security professional. These examples
come from patterns I use on my own projects, documented so anyone
following along has something concrete to fork. They are **not** a
substitute for a real security review and they are **not**
comprehensive.

Every example here is a reasonable starting floor, not a ceiling.
Before trusting any of this with real credentials, production data,
or anything you can't afford to lose, get it reviewed by someone with
deeper security experience than mine. The `Further hardening` section
in each folder calls out what's missing that I know about; there's
almost certainly more I don't. If you spot a gap, open an issue.

---


Each post that talks about real infrastructure or patterns has a folder here with a minimal, deployable example. The examples are intentionally generic: no personal AWS accounts, no private account IDs, no secrets. Fork, fill in your own context, deploy.

## Layout

Each folder is a standalone example. Pick the one that matches the post you're reading:

| Folder | Post | What it shows |
|--------|------|---------------|
| [`004-remote-coding-companion/`](./004-remote-coding-companion/) | I built a product from my phone | Minimum cloud setup to run Claude Code on a box you own, reachable from the Claude iOS app. EC2 + SSM + tmux + Claude Code. |

Folders are numbered to match the post index. Each folder is self-contained — separate `package.json`, separate CDK app, separate deploy.

## Why a separate repo

The real infrastructure I run (the actual `remote-claude` instance I work on every day, the Marquis stack, etc.) stays private. What goes here is the pattern — stripped to essentials, documented, reproducible. If you want to run the same thing, this is enough to get started. If you want to copy my personal setup, that's a different ask.

## Contributing

Not accepting PRs. These are companion examples to the blog; fork if you want to build on them.

## License

MIT. See [LICENSE](./LICENSE).
