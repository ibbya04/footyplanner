import type { Competition, Fixture } from '@footyplanner/shared';
import 'leaflet/dist/leaflet.css';
import type { CSSProperties } from 'react';
import { MapContainer, Marker, Popup, TileLayer, ZoomControl } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import 'react-leaflet-cluster/dist/assets/MarkerCluster.css';
import { kickoffLabel } from '../dates';
import styles from './FixtureMap.module.css';
import { clusterIcon, pinIcon } from './pins';

const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services';
const ESRI_ATTRIBUTION =
    'Tiles &copy; <a href="https://www.esri.com">Esri</a>, HERE, Garmin, &copy; OpenStreetMap contributors';
const DARK_BASE = `${ESRI}/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}`;
const DARK_LABELS = `${ESRI}/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}`;

interface Props {
    fixtures: Fixture[];
    competitions: Map<string, Competition>;
}

const teamName = (team: Fixture['home']) => team?.shortName ?? team?.name ?? 'TBD';

function FixturePopup({ fixture, competition }: { fixture: Fixture; competition: Competition }) {
    const venue = fixture.venue;
    return (
        <Popup maxWidth={280} minWidth={260}>
            <div className={styles.popHead} style={{ '--c': competition.group.color } as CSSProperties}>
                {competition.name}
            </div>
            <div className={styles.popBody}>
                <div className={styles.teams}>
                    {teamName(fixture.home)} v {teamName(fixture.away)}
                </div>
                <div className={styles.meta}>{kickoffLabel(fixture.kickoff, fixture.timeConfirmed)}</div>
                {venue && <div className={styles.meta}>{[venue.name, venue.city].filter(Boolean).join(', ')}</div>}
            </div>
        </Popup>
    );
}

export function FixtureMap({ fixtures, competitions }: Props) {
    return (
        <MapContainer className={styles.map} center={[49, 8]} zoom={5} zoomControl={false} worldCopyJump>
            <ZoomControl position="topright" />
            <TileLayer url={DARK_BASE} maxNativeZoom={16} maxZoom={19} attribution={ESRI_ATTRIBUTION} />
            <TileLayer url={DARK_LABELS} maxNativeZoom={16} maxZoom={19} />
            <MarkerClusterGroup
                maxClusterRadius={45}
                showCoverageOnHover={false}
                spiderfyOnMaxZoom
                spiderfyDistanceMultiplier={1.6}
                iconCreateFunction={clusterIcon}
            >
                {fixtures.map(fixture => {
                    const competition = competitions.get(fixture.comp);
                    const { lat, lng } = fixture.venue ?? {};
                    if (!competition || lat == null || lng == null) return null;
                    return (
                        <Marker
                            key={fixture.id}
                            position={[lat, lng]}
                            icon={pinIcon(fixture, competition)}
                            title={`${teamName(fixture.home)} v ${teamName(fixture.away)}`}
                        >
                            <FixturePopup fixture={fixture} competition={competition} />
                        </Marker>
                    );
                })}
            </MarkerClusterGroup>
        </MapContainer>
    );
}
