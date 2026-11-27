# 0001. Separate repository for FootyPlanner v2

- **Status:** Accepted
- **Date:** 2026-11-27
- **Reversibility:** Moderate (trivial to undo before histories diverge; unnecessary once v2 is underway)

## Context

FootyPlanner v1 is a live Node/TypeScript/pnpm monorepo running on Cloudflare Workers, D1, and R2, with GitHub Actions auto-deploying `main` and applying production D1 migrations. FootyPlanner v2 is a ground-up learning rebuild moving the backend to Java 21, Spring Boot 3, PostgreSQL/PostGIS, Docker, and eventually multiple services, while initially reusing the existing React frontend (`apps/web`).

We need to decide where v2's code, git history, CI pipelines, and documentation should live.

## Decision

Create a **new, separate repository** for v2 by duplicating the current repo (naming it `footyplanner-v2` / `v2`), stripping out the v1 Cloudflare backend/deploy plumbing in the new copy, and leaving the v1 repository untouched.

Key reasons:

1. **Clean reference point for comparison:** Keeps v1 intact as a working baseline to compare architecture, code complexity, latency, and operational trade-offs side by side with v2.
2. **Zero risk to v1's live deployment:** Eliminates any chance of accidentally triggering v1's `main` auto-deploy, D1 migrations, or Cloudflare Worker bindings while experimenting or breaking things intentionally in v2.
3. **Clean toolchain & CI/CD separation:** Avoids mixing Node/pnpm/Wrangler/ESLint hooks with Java/Spring Boot/Maven-or-Gradle/Docker/Testcontainers in one repository.
4. **Focused git history:** Gives v2 a clean, readable commit and PR history organized around the v2 roadmap and learning chunks.
5. **Fast head start on the frontend:** Duplicating the repo lets us keep `apps/web` (and saved ESPN test fixtures/seed data) right away instead of rebuilding the UI from scratch.

## Alternatives considered

- **Subdirectory in the existing repo (e.g. `v2/`):** Keeps everything in one place, but tangles two completely different toolchains, `.gitignore` rules, pre-commit hooks, and CI workflows, and risks touching v1's deploy pipeline.
- **Long-lived `v2` branch in the existing repo:** Avoids creating a second repo, but makes side-by-side comparison awkward (switching branches or managing worktrees) and risks accidental merges into `main`.
- **Completely empty repo from scratch:** Cleanest possible history, but requires manually copying over `apps/web`, saved ESPN fixture payloads, and reference docs.

## Consequences & Trade-offs

- **Cleaner local and CI setup:** v2 gets its own CI workflows, pre-commit hooks, and ADR sequence starting from `0001`.
- **Small initial cleanup step:** Right after duplicating into the new repo, we will remove v1-only artifacts (`apps/api`, Cloudflare CI workflows, v1 Wrangler config) and promote `docs/PLAN-V2.md` / `docs/adr-v2/` to be the repo's primary plan and ADR directory.
- **Divergent frontends:** Changes to `apps/web` in v2 will not flow back to v1—acceptable since v1 is intentionally frozen as a reference point.

## What would make us revisit this?

Only if we later decided to split v2 itself from a single multi-module repo into **polyrepo** (one Git repository per microservice) during Phase 5—which would be a separate ADR at that point.
