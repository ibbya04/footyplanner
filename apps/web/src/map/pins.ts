import type { Competition } from '@footyplanner/shared';
import type { FixtureView } from '../browse/viewFixtures';
import L from 'leaflet';
import styles from './FixtureMap.module.css';

function crest(competition: Competition): HTMLElement {
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

export function pinIcon(fixture: FixtureView): L.DivIcon {
    const { competition } = fixture;
    const el = crest(competition);
    el.classList.add(styles.pin ?? '');
    if (fixture.status.state === 'in') el.classList.add(styles.live ?? '');
    if (fixture.approximate) el.classList.add(styles.approx ?? '');
    el.style.setProperty('--c', competition.group.color);
    el.title = competition.name;
    return L.divIcon({ className: 'pin-icon', html: el, iconSize: [0, 0] });
}

export function clusterIcon(cluster: L.MarkerCluster): L.DivIcon {
    const count = document.createElement('div');
    count.textContent = String(cluster.getChildCount());
    return L.divIcon({ className: styles.cluster ?? '', html: count, iconSize: [40, 40] });
}
