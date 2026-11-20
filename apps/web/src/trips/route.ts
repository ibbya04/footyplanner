import { browserStorage } from '../browserStorage';
import type { Tab } from '../sidebar/Sidebar';
import { editTokenIn, tripIdIn } from './link';
import { readTripLink } from './store';

export type Route =
    { kind: 'planner'; tab: Tab } | { kind: 'trip'; id: string } | { kind: 'handoff'; id: string; editToken: string };

export function openRoute(location: Location, history: History): Route {
    const id = tripIdIn(location.pathname);
    if (!id) return { kind: 'planner', tab: 'fixtures' };
    const editToken = editTokenIn(location.hash);
    if (editToken) {
        history.replaceState(null, '', `/t/${id}`);
        return { kind: 'handoff', id, editToken };
    }
    if (readTripLink(browserStorage)?.id === id) {
        history.replaceState(null, '', '/');
        return { kind: 'planner', tab: 'shortlist' };
    }
    return { kind: 'trip', id };
}
