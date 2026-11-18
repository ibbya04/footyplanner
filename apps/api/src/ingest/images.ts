import { and, eq, isNotNull, isNull, lte, or } from 'drizzle-orm';
import type { AnySQLiteColumn } from 'drizzle-orm/sqlite-core';
import type { Db } from '../db';
import { competitions, teams } from '../db/schema';
import { runBatch, type Statement } from './store';

const DAY = 86_400_000;
const MAX_BYTES = 1_000_000;
const EXT: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/svg+xml': 'svg',
    'image/webp': 'webp',
    'image/gif': 'gif',
};

async function download(url: string): Promise<{ body: ArrayBuffer; type: string; ext: string }> {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const type = (res.headers.get('Content-Type') ?? '').split(';')[0]!.trim();
    const ext = EXT[type];
    if (!ext) throw new Error(`not an image (${type || 'no type'})`);
    const body = await res.arrayBuffer();
    if (body.byteLength > MAX_BYTES) throw new Error('too large');
    return { body, type, ext };
}

interface Job {
    url: string;
    keyStem: string;
    done: (key: string) => Statement;
    retry: () => Statement;
}

export async function copyImages(
    db: Db,
    bucket: R2Bucket,
    now: number,
    limit: number,
): Promise<{ copied: number; errors: string[] }> {
    const due = (retryAt: AnySQLiteColumn) => or(isNull(retryAt), lte(retryAt, now));
    const teamRows = await db
        .select({ id: teams.id, url: teams.crestUrl })
        .from(teams)
        .where(and(isNull(teams.crestKey), isNotNull(teams.crestUrl), due(teams.crestRetryAt)))
        .limit(limit);
    const leagueRows =
        teamRows.length < limit
            ? await db
                  .select({ slug: competitions.slug, url: competitions.logoUrl })
                  .from(competitions)
                  .where(
                      and(isNull(competitions.logoKey), isNotNull(competitions.logoUrl), due(competitions.logoRetryAt)),
                  )
                  .limit(limit - teamRows.length)
            : [];

    const jobs: Job[] = [
        ...teamRows.map(t => ({
            url: t.url!,
            keyStem: `teams/${t.id}`,
            done: (key: string) => db.update(teams).set({ crestKey: key }).where(eq(teams.id, t.id)),
            retry: () =>
                db
                    .update(teams)
                    .set({ crestRetryAt: now + DAY })
                    .where(eq(teams.id, t.id)),
        })),
        ...leagueRows.map(c => ({
            url: c.url!,
            keyStem: `leagues/${c.slug}`,
            done: (key: string) => db.update(competitions).set({ logoKey: key }).where(eq(competitions.slug, c.slug)),
            retry: () =>
                db
                    .update(competitions)
                    .set({ logoRetryAt: now + DAY })
                    .where(eq(competitions.slug, c.slug)),
        })),
    ];

    const statements: Statement[] = [];
    const errors: string[] = [];
    for (const job of jobs) {
        try {
            const img = await download(job.url);
            const key = `${job.keyStem}.${img.ext}`;
            await bucket.put(key, img.body, { httpMetadata: { contentType: img.type } });
            statements.push(job.done(key));
        } catch (err) {
            errors.push(`image ${job.keyStem}: ${(err as Error).message}`);
            statements.push(job.retry());
        }
    }
    await runBatch(db, statements);
    return { copied: jobs.length - errors.length, errors };
}
