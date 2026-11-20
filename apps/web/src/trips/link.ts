const TRIP_PATH = /^\/t\/([A-Za-z0-9_-]{10})\/?$/;
const EDIT_HASH = /^#edit=([A-Za-z0-9_-]+)$/;

export function tripIdIn(pathname: string): string | null {
    return TRIP_PATH.exec(pathname)?.[1] ?? null;
}

export function editTokenIn(hash: string): string | null {
    return EDIT_HASH.exec(hash)?.[1] ?? null;
}

export interface TripLinks {
    page: string;
    edit: string;
    feed: string;
    subscribe: string;
}

export function tripLinks(origin: string, id: string, editToken: string | null): TripLinks {
    const page = `${origin}/t/${id}`;
    const feed = `${page}.ics`;
    return {
        page,
        edit: editToken ? `${page}#edit=${editToken}` : page,
        feed,
        subscribe: feed.replace(/^https?:/, 'webcal:'),
    };
}
