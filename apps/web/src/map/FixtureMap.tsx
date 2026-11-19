import 'leaflet/dist/leaflet.css';
import { type CSSProperties, useEffect } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap, ZoomControl } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import 'react-leaflet-cluster/dist/assets/MarkerCluster.css';
import type { Area, FixtureView } from '../browse/viewFixtures';
import { teamName } from '../teams';
import styles from './FixtureMap.module.css';
import { clusterIcon, pinIcon } from './pins';

const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services';
const ESRI_ATTRIBUTION =
    'Tiles &copy; <a href="https://www.esri.com">Esri</a>, HERE, Garmin, &copy; OpenStreetMap contributors';
const DARK_BASE = `${ESRI}/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}`;
const DARK_LABELS = `${ESRI}/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}`;

function kickoffText({ kickoffAt }: FixtureView): string {
    return kickoffAt.time ? `${kickoffAt.date} · ${kickoffAt.time} ${kickoffAt.zone}` : `${kickoffAt.date} · time TBC`;
}

function FixturePopup({ fixture }: { fixture: FixtureView }) {
    const { competition, venue } = fixture;
    return (
        <Popup maxWidth={280} minWidth={260}>
            <div className={styles.popHead} style={{ '--c': competition.group.color } as CSSProperties}>
                {competition.name}
            </div>
            <div className={styles.popBody}>
                <div className={styles.teams}>
                    {teamName(fixture.home)} v {teamName(fixture.away)}
                </div>
                <div className={styles.meta}>{kickoffText(fixture)}</div>
                {venue && <div className={styles.meta}>{[venue.name, venue.city].filter(Boolean).join(', ')}</div>}
            </div>
        </Popup>
    );
}

function AreaReporter({ onChange }: { onChange: (area: Area) => void }) {
    const map = useMap();
    useEffect(() => {
        const report = () => {
            const bounds = map.getBounds();
            onChange({
                south: bounds.getSouth(),
                west: bounds.getWest(),
                north: bounds.getNorth(),
                east: bounds.getEast(),
            });
        };
        report();
        map.on('moveend', report);
        return () => {
            map.off('moveend', report);
        };
    }, [map, onChange]);
    return null;
}

function SizeWatcher() {
    const map = useMap();
    useEffect(() => {
        const observer = new ResizeObserver(() => map.invalidateSize());
        observer.observe(map.getContainer());
        return () => observer.disconnect();
    }, [map]);
    return null;
}

interface Props {
    fixtures: FixtureView[];
    onAreaChange: (area: Area) => void;
}

export function FixtureMap({ fixtures, onAreaChange }: Props) {
    return (
        <MapContainer className={styles.map} center={[49, 8]} zoom={5} zoomControl={false} worldCopyJump>
            <ZoomControl position="topright" />
            <AreaReporter onChange={onAreaChange} />
            <SizeWatcher />
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
                    const { lat, lng } = fixture.venue ?? {};
                    if (lat == null || lng == null) return null;
                    return (
                        <Marker
                            key={fixture.id}
                            position={[lat, lng]}
                            icon={pinIcon(fixture, fixture.competition)}
                            title={`${teamName(fixture.home)} v ${teamName(fixture.away)}`}
                        >
                            <FixturePopup fixture={fixture} />
                        </Marker>
                    );
                })}
            </MarkerClusterGroup>
        </MapContainer>
    );
}
