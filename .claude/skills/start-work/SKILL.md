---
name: start-work
description: Set up a fresh git worktree from the latest main before changing anything in footyplanner. Use when starting a plan step, a follow-up, or any other change to the repo.
---

Every change in this repo happens in its own worktree on its own branch, cut from the latest `main`. Run these steps in order before writing any code or docs.

1. **Leave any worktree.** If this session is in a worktree, call `ExitWorktree` with `action: "keep"`. Done when the working directory is `/Users/ibrah/Documents/footyplanner`.
2. **Pull.** In the main checkout, run `git pull --ff-only` on `main`. Done when `git status -sb` shows `main...origin/main` with nothing ahead or behind. If the checkout has local changes or isn't on `main`, stop and ask the user.
3. **Create the worktree.** Pick a short kebab-case name for the work (e.g. `step-3b-filters`), then run `git worktree add -b <name> .claude/worktrees/<name> main`. Creating it with `git worktree add` names the branch `<name>` exactly.
4. **Enter it.** Call `EnterWorktree` with `path: "/Users/ibrah/Documents/footyplanner/.claude/worktrees/<name>"`. From here on, run every command from inside the worktree with paths relative to it, one plain command per `git` call.
5. **Install.** Run `pnpm install --frozen-lockfile`. A new worktree has no `node_modules`, so checks fail until this runs.
6. **Check logins.** Run `gh auth status` and, from `apps/api`, `npx wrangler whoami`. If either is logged out, ask the user to run it themselves with an absolute path, e.g. `! gh auth login` or `! cd /Users/ibrah/Documents/footyplanner/.claude/worktrees/<name>/apps/api && npx wrangler login`, and wait for them.

Done when the session is inside `.claude/worktrees/<name>` on branch `<name>`, level with `origin/main`, with dependencies installed and both CLIs logged in.
