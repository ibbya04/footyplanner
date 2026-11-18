// The work queue: one row per active competition and month, claimed by cron runs when due.
import { and, eq, sql } from 'drizzle-orm';
import type { Db } from '../db';
import { competitions, ingestQueue } from '../db/schema';
import { CLAIM_LEASE, monthOf, monthsBetween, refreshDelay, retryDelay } from './schedule';
import type { Statement } from './store';

export interface QueueItem {
    comp: string;
    month: string;
    failures: number;
}

// Adds any missing rows (new months, newly activated competitions). Existing rows are left alone.
// New rows are due now, nearest month first, so the first sweep fills the weeks people look at soonest.
// Runs on its own: Drizzle can't put raw SQL in a D1 batch.
export async function plan(db: Db, months: string[], now: number): Promise<void> {
    const current = monthOf(now);
    // All due now; nearer months a little "more overdue", so they're claimed first.
    const due = months.map(month => ({
        month,
        at: now - (months.length - Math.abs(monthsBetween(current, month))) * 1000,
    }));
    await db.run(sql`
        INSERT OR IGNORE INTO ${ingestQueue} (comp, month, next_run_at, failures)
        SELECT c.slug, json_extract(m.value, '$.month'), json_extract(m.value, '$.at'), 0
        FROM ${competitions} c, json_each(${JSON.stringify(due)}) m
        WHERE c.active = 1`);
}

// Atomically takes up to `limit` due rows and pushes them a lease ahead, so overlapping runs never share work.
export async function claim(db: Db, now: number, limit: number): Promise<QueueItem[]> {
    return db.all<QueueItem>(sql`
        UPDATE ${ingestQueue} SET next_run_at = ${now + CLAIM_LEASE}, last_run_at = ${now}
        WHERE rowid IN (
            SELECT q.rowid FROM ${ingestQueue} q JOIN ${competitions} c ON c.slug = q.comp AND c.active = 1
            WHERE q.next_run_at <= ${now} ORDER BY q.next_run_at LIMIT ${limit}
        )
        RETURNING comp, month, failures`);
}

const where = (item: QueueItem) => and(eq(ingestQueue.comp, item.comp), eq(ingestQueue.month, item.month));

export function succeeded(db: Db, item: QueueItem, now: number): Statement {
    return db
        .update(ingestQueue)
        .set({ nextRunAt: now + refreshDelay(item.month, now), lastOkAt: now, failures: 0, lastError: null })
        .where(where(item));
}

export function failed(db: Db, item: QueueItem, error: string, now: number): Statement {
    const failures = item.failures + 1;
    return db
        .update(ingestQueue)
        .set({ nextRunAt: now + retryDelay(failures), failures, lastError: error.slice(0, 200) })
        .where(where(item));
}
