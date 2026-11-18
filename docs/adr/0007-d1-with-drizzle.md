# 0007. D1 with Drizzle for the database

- Status: Accepted
- Date: 2026-11-18

## Context

Step 2 stores fixtures, teams, venues, competitions, the ingestion queue and run logs. The data is small (a season across 26 competitions is a few thousand fixtures) and relational: fixtures point at teams, venues and competitions. The main read is "every fixture between two dates in these competitions, with teams and venue coordinates". Ingestion needs conditional upserts ("write only if something changed") and an atomic "claim the next due rows". Everything else runs on Workers ([0001](0001-move-from-vercel-to-cloudflare-workers.md)).

## Decision

- **D1** (Cloudflare's SQLite), bound to the Worker as `DB`.
- **Drizzle ORM** for the schema (`apps/api/src/db/schema.ts`) and typed queries. Raw `sql` is used where Drizzle has no builder: `json_each`, `INSERT … SELECT` and `UPDATE … RETURNING`.
- **drizzle-kit** writes migration SQL into `apps/api/migrations/`. **Wrangler** applies it (`wrangler d1 migrations apply`) locally, in tests and in CI before each deploy. Seed data (competitions, 259 venues, overrides) is a hand-written migration generated once from the old page's tables.
- Times are integer milliseconds; kick-offs are full ISO strings in UTC, so they sort and compare as text.

## Alternatives considered

- **Postgres** (Neon, Supabase, or Railway as Rate My Uni uses). More features, but a second provider, a connection string and pooling (Hyperdrive) for no gain at this size.
- **KV.** No queries, only lookups by key. 1,000 writes a day on the Free plan, which live scores alone would exceed.
- **Durable Objects with SQLite.** Strong consistency and per-object storage, but the data has no natural partition, and a single object would be a bottleneck for reads.
- **Raw SQL without an ORM.** Fewer dependencies, but hand-written types for every row and query. Drizzle's types caught several mistakes while writing the joins.

## Consequences

- One query answers `/api/fixtures`, with an index on `(comp, kickoff)`.
- Free-plan limits shape the code: 100 bound parameters per query (lists are passed as one JSON parameter to `json_each`), 50 queries per invocation (writes go in one `db.batch`), and 100k rows written a day (unchanged rows are never rewritten, see [0008](0008-cron-only-ingestion.md)). Hitting the daily write limit stops all queries until midnight UTC.
- Drizzle can't put raw `db.run(sql)` statements in a D1 batch, so the queue-planning statement runs on its own.
- Preview versions share the production database, so migrations must be backwards compatible: add, don't rename or drop.
- SQLite doesn't guarantee that `RETURNING` rows follow a subquery's `ORDER BY`, so code doesn't rely on the order rows come back in.
