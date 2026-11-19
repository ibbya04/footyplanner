const ID_LENGTH = 10;
const TOKEN_BYTES = 32;
const URL_SAFE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

const encoder = new TextEncoder();

function base64url(bytes: Uint8Array): string {
    return btoa(String.fromCharCode(...bytes))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

export function newTripId(): string {
    const bytes = crypto.getRandomValues(new Uint8Array(ID_LENGTH));
    return Array.from(bytes, b => URL_SAFE[b % URL_SAFE.length]).join('');
}

export function newEditToken(): string {
    return base64url(crypto.getRandomValues(new Uint8Array(TOKEN_BYTES)));
}

export async function hashToken(token: string): Promise<string> {
    const digest = await crypto.subtle.digest('SHA-256', encoder.encode(token));
    return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
}

export async function tokenMatches(token: string, storedHash: string): Promise<boolean> {
    const given = encoder.encode(await hashToken(token));
    const stored = encoder.encode(storedHash);
    return given.byteLength === stored.byteLength && crypto.subtle.timingSafeEqual(given, stored);
}
