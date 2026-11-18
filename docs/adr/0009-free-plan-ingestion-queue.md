# 0009. A work queue to fit the Free plan's limits

- Status: Accepted
- Date: 2026-11-18

## Context

A full sweep is about 26 competitions × 13 months ≈ 340 ESPN calls. On the Workers Free plan each cron run gets **10 ms of CPU** and **50 subrequests**, and fetches, D1 queries and R2 calls all count as subrequests (checked against the docs on 2026-11-18). Parsing one month's JSON (about 400 KB) takes 1–2 ms; a year's (4 MB) takes 12–15 ms, so year-sized calls can't be used. The Paid plan ($5/month) allows 15 minutes of CPU for crons running hourly or less often, enough for the whole sweep in one run.

## Decision

Stay on the Free plan and split the sweep into small runs, coordinated by an `ingest_queue` table in D1:

- One row per active competition and month, with `next_run_at`, `last_ok_at`, `failures` and `last_error`.
- Each run **claims** up to `INGEST_MONTHS_PER_RUN` (2) due rows with one `UPDATE … WHERE rowid IN (SELECT … LIMIT n) RETURNING`, pushing them 10 minutes ahead. Overlapping runs can't take the same rows, and a run that dies is retried after the lease.
- Success sets the next refresh from how near the month is. Failure backs off: 15 min, 30 min, 1 h … up to 6 h.
- New rows (new months, a newly activated competition) are added hourly with one `INSERT OR IGNORE … SELECT`, nearest months first, and immediately when the queue is empty, such as after the first deploy.
- Each league-month costs 3 subrequests: the fetch, one read of the stored fixtures, and one batch with every write including the queue update. A whole run stays around 35 at worst.

## Alternatives considered

- **Workers Paid, one hourly cron for the whole sweep.** Simpler code, $5/month. The queue can be turned into this by raising `INGEST_MONTHS_PER_RUN`.
- **Cloudflare Queues** (10k operations a day on Free). One message per league-month would work, but adds a producer, a consumer and a second retry mechanism for what one table does.
- **Workflows.** Durable multi-step runs, but the same 10 ms per step on Free, and more machinery than needed.

## Consequences

- £0 a month. The first full sweep finishes in roughly 3–5 hours, nearest months first.
- `/api/status` reads straight from the queue: months fetched, last success and failures per competition.
- CPU can't be measured inside a Worker, because the clock only advances on I/O. If runs start exceeding 10 ms, Workers Logs show it, and the fix is lowering `INGEST_MONTHS_PER_RUN` to 1.
- Moving to the Paid plan later is a config change, not a rewrite.
