import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { type CSSProperties, useEffect } from 'react';
import { Circle, MapContainer, Marker, Popup, TileLayer, useMap, ZoomControl } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import 'react-leaflet-cluster/dist/assets/MarkerCluster.css';
import type { Area, FixtureView, Near } from '../browse/viewFixtures';
import styles from './FixtureMap.module.css';
import { clusterIcon, homeIcon, pinIcon } from './pins';

const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services';
const ESRI_ATTRIBUTION =
    'Tiles &copy; <a href="https://www.esri.com">Esri</a>, HERE, Garmin, &copy; OpenStreetMap contributors';
const DARK_BASE = `${ESRI}/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}`;
const DARK_LABELS = `${ESRI}/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}`;

function FixturePopup({ fixture }: { fixture: FixtureView }) {
    const { competition } = fixture;
    return (
        <Popup maxWidth={280} minWidth={260}>
            <div className={styles.popHead} style={{ '--c': competition.group.color } as CSSProperties}>
                {competition.name}
            </div>
            <div className={styles.popBody}>
                <div className={styles.teams}>{fixture.title}</div>
                <div className={styles.meta}>{fixture.kickoffText}</div>
                {fixture.venueText && (
                    <div className={styles.meta}>
                        {fixture.venueText}
                        {fixture.approximate && ' · Location approximate'}
                    </div>
                )}
                {fixture.travelText && <div className={styles.meta}>{fixture.travelText}</div>}
                {fixture.tbc && (
                    <div className={styles.tbc} title={fixture.tbc.long}>
                        {fixture.tbc.short}
                    </div>
                )}
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

function NearLayer({ near }: { near: Near }) {
    const map = useMap();
    const { lat, lng, radius } = near;
    useEffect(() => {
        map.fitBounds(L.latLng(lat, lng).toBounds(radius * 2000), { padding: [20, 20] });
    }, [map, lat, lng, radius]);
    return (
        <>
            <Circle
                center={[lat, lng]}
                radius={radius * 1000}
                pathOptions={{ color: '#10b981', weight: 1.5, dashArray: '6 6', fillOpacity: 0.05 }}
                interactive={false}
            />
            <Marker position={[lat, lng]} icon={homeIcon()} title={near.name} keyboard={false} zIndexOffset={1000} />
        </>
    );
}

interface Props {
    fixtures: FixtureView[];
    near: Near | null;
    onAreaChange: (area: Area) => void;
}

export function FixtureMap({ fixtures, near, onAreaChange }: Props) {
    return (
        <MapContainer className={styles.map} center={[49, 8]} zoom={5} zoomControl={false} worldCopyJump>
            <ZoomControl position="topright" />
            <AreaReporter onChange={onAreaChange} />
            <SizeWatcher />
            <TileLayer url={DARK_BASE} maxNativeZoom={16} maxZoom={19} attribution={ESRI_ATTRIBUTION} />
            <TileLayer url={DARK_LABELS} maxNativeZoom={16} maxZoom={19} />
            {near && <NearLayer near={near} />}
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
                        <Marker key={fixture.id} position={[lat, lng]} icon={pinIcon(fixture)} title={fixture.title}>
                            <FixturePopup fixture={fixture} />
                        </Marker>
                    );
                })}
            </MarkerClusterGroup>
        </MapContainer>
    );
}
