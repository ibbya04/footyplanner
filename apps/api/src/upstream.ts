const UA = 'footyplanner (https://github.com/ibbya04/footyplanner)';

export class UpstreamError extends Error {
    constructor(readonly status: number) {
        super(`HTTP ${status}`);
    }
}

export async function getJson<T>(url: string, timeoutMs = 8000): Promise<T> {
    const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok) throw new UpstreamError(res.status);
    return res.json<T>();
}
