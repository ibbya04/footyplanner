# 0003. pnpm workspace monorepo

- Status: Accepted
- Date: 2026-11-18

## Context

The trimming of ESPN events (`slimEvent`), the geocoding helpers and `distanceKm` were copied in both `index.html` and `api/_lib.js`, with comments like "mirrors slimEvent in index.html" to keep them in step by hand. The rebuild adds a TypeScript API and, in step 3, a React app that need the same types and helpers.

## Decision

One repo, organised as a pnpm workspace (`pnpm-workspace.yaml`):

```
apps/api/          @footyplanner/api     the Worker
apps/web/          the frontend (legacy index.html now, React in step 3)
packages/shared/   @footyplanner/shared  ESPN types, slimEvent, distanceKm, inUefaRegion
```

- Apps depend on shared code with `"@footyplanner/shared": "workspace:*"`. It exports its TypeScript source directly, so there's no build step: Wrangler and Vite bundle it.
- Linting, formatting and TypeScript settings live at the root (`eslint.config.js`, `.prettierrc.json`, `tsconfig.base.json`).
- The pnpm version is pinned with `packageManager`, and CI installs with `--frozen-lockfile`.
- No Turborepo or Nx.

## Alternatives considered

- **Separate repos** (as Rate My Uni does). Shared types would need publishing or copying, and a change touching both API and frontend would need two pull requests merged in order.
- **One flat package.** Simpler at first, but the Worker and the frontend would share one set of dependencies, and nothing would enforce what may import what.
- **npm or Yarn workspaces.** Both work. pnpm is faster, shares one copy of each package across projects, and is strict: a package can only import what's in its own `package.json`.
- **Turborepo or Nx.** Their task caching pays off with many packages. With three, `pnpm -r` is enough.

## Consequences

- Each helper exists once, and a change to `packages/shared` is type-checked against every app that uses it.
- `pnpm test`, `pnpm typecheck` and `pnpm lint` cover the whole repo from the root, in dependency order.
- Contributors need pnpm (`corepack enable` provides it).
- pnpm 10 doesn't run dependencies' install scripts by default. `esbuild`, `workerd` and `sharp` are allowed in `onlyBuiltDependencies`.
