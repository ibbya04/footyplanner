import type { Competition, Fixture } from '@footyplanner/shared';
import L from 'leaflet';
import styles from './FixtureMap.module.css';

function badge(competition: Competition): HTMLElement {
    const el = document.createElement('div');
    el.textContent = competition.short;
    if (!competition.logo) return el;
    const img = document.createElement('img');
    img.src = competition.logo;
    img.alt = competition.short;
    img.onerror = () => {
        el.classList.remove(styles.logo ?? '');
        el.replaceChildren(competition.short);
    };
    el.replaceChildren(img);
    el.classList.add(styles.logo ?? '');
    return el;
}

export function pinIcon(fixture: Fixture, competition: Competition): L.DivIcon {
    const el = badge(competition);
    el.classList.add(styles.pin ?? '');
    if (fixture.status.state === 'in') el.classList.add(styles.live ?? '');
    if (fixture.venue?.precision === 'city') el.classList.add(styles.approx ?? '');
    el.style.setProperty('--c', competition.group.color);
    el.title = competition.name;
    return L.divIcon({ className: 'pin-icon', html: el, iconSize: [0, 0] });
}

export function clusterIcon(cluster: L.MarkerCluster): L.DivIcon {
    const count = document.createElement('div');
    count.textContent = String(cluster.getChildCount());
    return L.divIcon({ className: styles.cluster ?? '', html: count, iconSize: [40, 40] });
}
