// One cron run. The Free plan gives each run 10 ms of CPU and 50 subrequests (fetches, D1 queries
// and R2 calls all count), so a run does a small, bounded amount of work:
//   even minutes with matches on: refresh today's scores for those competitions ("live")
//   otherwise: fetch the next few due league-months ("sweep")
//   then: locate one new venue and copy a few crests
// Worst case is about 35 subrequests.
import { leagueLogo, type EspnScoreboard } from '@footyplanner/shared';
import { and, eq, gte, isNull, lt, lte, ne, sql } from 'drizzle-orm';
import { getDb, type Db } from '../db';
import { competitions, fixtures, ingestRuns } from '../db/schema';
import { getJson } from '../upstream';
import { copyImages } from './images';
import { parseEvent } from './parse';
import { claim, failed, plan, succeeded, type QueueItem } from './queue';
import { dayWindow, monthWindow, queueMonths } from './schedule';
import { prepareWrites, runBatch, type Statement } from './store';
import { geocodeNext } from './venues';

const MINUTE = 60_000;
// No order or rotation: with more than 6 competitions on, the same 6 are likely picked every time.
// Follow-up in docs/PLAN.md.
const LIVE_MAX = 6;
const IMAGES_PER_RUN = 3;
const RUN_HISTORY = 7 * 24 * 60 * MINUTE;

export interface RunSummary {
    mode: 'sweep' | 'live';
    espnCalls: number;
    fixturesWritten: number;
    errors: string[];
}

function fetchScoreboard(env: Env, comp: string, dates: string): Promise<EspnScoreboard> {
    return getJson<EspnScoreboard>(`${env.ESPN_BASE}/${comp}/scoreboard?dates=${dates}&limit=1000`);
}

// Fetches one league-month or league-day and writes it, plus any `extra` statements, in one batch.
async function ingest(
    db: Db,
    env: Env,
    comp: string,
    dates: string,
    window: { from: string; to: string },
    now: number,
    extra: Statement[],
): Promise<number> {
    const board = await fetchScoreboard(env, comp, dates);
    const parsed = (board.events ?? []).flatMap(ev => parseEvent(comp, ev) ?? []);
    const result = await prepareWrites(db, comp, parsed, window, now);
    const logo = leagueLogo(board.leagues);
    if (logo) {
        result.statements.push(
            db
                .update(competitions)
                .set({ logoUrl: logo, logoKey: null, logoRetryAt: null })
                .where(and(eq(competitions.slug, comp), sql`${competitions.logoUrl} IS NOT ${logo}`)),
        );
    }
    await runBatch(db, [...result.statements, ...extra]);
    return result.fixturesWritten;
}

// Competitions with a match that has kicked off in the last 3 hours, or kicks off in the next 10 minutes.
async function liveTargets(db: Db, now: number): Promise<{ comp: string; day: string }[]> {
    return db
        .selectDistinct({ comp: fixtures.comp, day: sql<string>`substr(${fixtures.kickoff}, 1, 10)` })
        .from(fixtures)
        .where(
            and(
                isNull(fixtures.removedAt),
                ne(fixtures.state, 'post'),
                gte(fixtures.kickoff, new Date(now - 180 * MINUTE).toISOString()),
                lte(fixtures.kickoff, new Date(now + 10 * MINUTE).toISOString()),
            ),
        )
        .limit(LIVE_MAX);
}

export async function runIngest(env: Env, now = Date.now()): Promise<RunSummary> {
    const db = getDb(env.DB);
    const summary: RunSummary = { mode: 'sweep', espnCalls: 0, fixturesWritten: 0, errors: [] };
    const minute = new Date(now).getUTCMinutes();
    const months = queueMonths(env.SEASON_START, now, Number(env.HORIZON_MONTHS));

    if (minute === 0) {
        await plan(db, months, now);
        await db.delete(ingestRuns).where(lt(ingestRuns.startedAt, now - RUN_HISTORY));
    }

    const live = minute % 2 === 0 ? await liveTargets(db, now) : [];
    if (live.length) {
        summary.mode = 'live';
        // ESPN groups matches by US Eastern date. European kick-offs fall on the same date in UTC and ET.
        for (const { comp, day } of live) {
            summary.espnCalls++;
            try {
                summary.fixturesWritten += await ingest(
                    db,
                    env,
                    comp,
                    day.replaceAll('-', ''),
                    dayWindow(day),
                    now,
                    [],
                );
            } catch (err) {
                summary.errors.push(`live ${comp} ${day}: ${(err as Error).message}`);
            }
        }
    } else {
        const limit = Number(env.INGEST_MONTHS_PER_RUN);
        let items: QueueItem[] = await claim(db, now, limit);
        if (!items.length && minute !== 0) {
            // First run after a deploy, or a new competition: fill the queue rather than wait for the hour.
            await plan(db, months, now);
            items = await claim(db, now, limit);
        }
        for (const item of items) {
            summary.espnCalls++;
            try {
                summary.fixturesWritten += await ingest(
                    db,
                    env,
                    item.comp,
                    item.month.replace('-', ''),
                    monthWindow(item.month),
                    now,
                    [succeeded(db, item, now)],
                );
            } catch (err) {
                const message = (err as Error).message;
                summary.errors.push(`${item.comp} ${item.month}: ${message}`);
                await runBatch(db, [failed(db, item, message, now)]);
            }
        }
    }

    try {
        const error = await geocodeNext(db, env.PHOTON_URL, now);
        if (error) summary.errors.push(error);
        const images = await copyImages(db, env.IMAGES, now, IMAGES_PER_RUN);
        summary.errors.push(...images.errors);
    } catch (err) {
        summary.errors.push(`housekeeping: ${(err as Error).message}`);
    }

    await db.insert(ingestRuns).values({
        startedAt: now,
        finishedAt: Date.now(),
        mode: summary.mode,
        espnCalls: summary.espnCalls,
        fixturesWritten: summary.fixturesWritten,
        errors: summary.errors.length ? summary.errors : null,
    });
    if (summary.errors.length) console.warn('ingest errors', summary.errors);
    return summary;
}
