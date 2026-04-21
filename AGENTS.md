# blog-code

Public repo. Companion code examples for posts on
[waltergugenberger.com](https://waltergugenberger.com). Each top-level
folder is one self-contained example referenced from one post.

Agents working here: read this file before doing anything else.

## Rules

- DO NOT push. Only the human pushes.
- DO NOT commit unless explicitly told to.
- DO NOT merge to `main` without explicit approval.
- DO NOT add secrets, real AWS account IDs, real email addresses, or
  any other private identifiers. This repo is public; everything here
  is readable by the world.
- DO NOT start non-trivial work without a task spec in
  `docs/task-specs/`. Trivial tweaks (typo, rename, a sentence) are
  fine without one.
- DO NOT invent outside scope. The examples exist to illustrate a
  post's claim. Keep them minimal. Don't ship a production-ready
  platform when ten lines will do.
- DO NOT generate filler. No AI slop. If it reads like AI wrote it,
  rewrite it or flag it.

## Purpose

Posts that reference infrastructure, code patterns, or specific AWS
services come with a companion folder here. The goal:

- A reader can fork the folder, fill in their own account details,
  and deploy.
- No private infrastructure details leak from the real systems that
  inspired the example.
- Each folder stands alone — no cross-imports, no shared tooling at
  the repo root (beyond `AGENTS.md` and this README).

## Where things live

- `AGENTS.md` — this file.
- `.claude/CLAUDE.md` — one-liner that imports `@../AGENTS.md`.
- `README.md` — public-facing entry point. Lists the examples.
- `<NNN>-<slug>/` — one example per post. Each has its own
  `package.json` (or equivalent), its own `README.md`, and deploys
  independently.
- `docs/task-specs/` — dated specs for changes to this repo
  (adding an example, restructuring, etc.). Same
  `YYYY-MM-DD_<slug>.md` convention as the sibling repos.

## Workflow

Spec-driven for anything beyond a trivial tweak:

1. Create a task spec in `docs/task-specs/` with today's date.
2. Work on a short-lived branch from `main`. Naming:
   - `feat/<slug>` — new example, new tooling
   - `content/<slug>` — documentation / README edits
   - `chore/<slug>` — repo/tooling/spec changes
   - `fix/<slug>` — corrections
3. PR, review, **squash merge**.

## Commits

Conventional Commits: `feat`, `fix`, `content`, `docs`, `chore`.
Imperative, brief, detailed body for non-trivial changes.

## Example guidelines

- Minimal. Each example exists to demonstrate the post's claim, not
  to be a reference architecture for everyone forever.
- Deployable. If it needs a secret or an account, use placeholder
  values and document what the reader fills in.
- Self-contained. Don't share code across folders. If two examples
  need the same pattern, duplicate it. Easier for a reader than
  chasing imports.
- Documented. Every folder has a `README.md` with: what this shows,
  what's required to deploy, what's intentionally left out.
- Generic. If an AWS account ID, email, or personal VPC shows up in
  a commit, that's a bug. Fix before merging.
