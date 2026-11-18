import { env } from 'cloudflare:test';
import { vi } from 'vitest';
import { app } from '../src';

// Calls the Hono app directly; it runs in the same isolate as the test, so stubbing fetch catches upstream calls.
export function api(path: string) {
    return app.request(path, {}, env);
}

type Upstream = (url: URL) => Response | Promise<Response>;

export function mockUpstream(handler: Upstream) {
    return vi.spyOn(globalThis, 'fetch').mockImplementation(async input => {
        const url = new URL(input instanceof Request ? input.url : String(input));
        return handler(url);
    });
}

export const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
