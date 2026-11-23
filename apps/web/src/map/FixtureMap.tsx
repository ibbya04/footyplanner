import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import type { Competition } from '@footyplanner/shared';
import { type CSSProperties, memo, type RefObject, useCallback, useEffect, useMemo, useRef } from 'react';
import { Circle, MapContainer, Marker, Polyline, Popup, TileLayer, useMap, ZoomControl } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import 'react-leaflet-cluster/dist/assets/MarkerCluster.css';
import type { Area, FixtureView, Near } from '../browse/viewFixtures';
import type { Selection } from '../selection';
import styles from './FixtureMap.module.css';
import { FixtureLinks } from '../sidebar/FixtureLinks';
import { StarButton } from '../sidebar/StarButton';
import { legendGroups } from './legend';
import { MAP_STYLES, type MapStyle, type MapStyleKey, useMapStyle } from './mapStyles';
import { clusterIcon, homeIcon, pinIcon } from './pins';

interface PopupProps {
    fixture: FixtureView;
    saved: boolean;
    onToggle?: (id: string) => void;
}

function FixturePopup({ fixture, saved, onToggle }: PopupProps) {
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
                <FixtureLinks fixture={fixture} className={styles.popActions}>
                    {onToggle && (
                        <StarButton title={fixture.title} saved={saved} onToggle={() => onToggle(fixture.id)} />
                    )}
                </FixtureLinks>
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

const NEAR_CIRCLE = { color: '#10b981', weight: 1.5, dashArray: '6 6', fillOpacity: 0.05 };

function NearLayer({ near }: { near: Near }) {
    const map = useMap();
    const { lat, lng, radius } = near;
    const center = useMemo<LatLng>(() => [lat, lng], [lat, lng]);
    const icon = useMemo(() => homeIcon(), []);
    useEffect(() => {
        map.fitBounds(L.latLng(lat, lng).toBounds(radius * 2000), { padding: [20, 20] });
    }, [map, lat, lng, radius]);
    return (
        <>
            <Circle center={center} radius={radius * 1000} pathOptions={NEAR_CIRCLE} interactive={false} />
            <Marker position={center} icon={icon} title={near.name} keyboard={false} zIndexOffset={1000} />
        </>
    );
}

type LatLng = [number, number];

function located(fixture: FixtureView): LatLng[] {
    const { lat, lng } = fixture.venue ?? {};
    return lat == null || lng == null ? [] : [[lat, lng]];
}

const CITY_ZOOM = 11;

type Markers = RefObject<Map<string, L.Marker>>;

interface SelectionProps {
    selection: Selection | null;
    markers: Markers;
    cluster: RefObject<L.MarkerClusterGroup | null>;
}

function remember(markers: Markers, id: string, marker: L.Marker | null) {
    if (!marker) return;
    markers.current.set(id, marker);
    return () => {
        markers.current.delete(id);
    };
}

function isSpiderfied(marker: L.Marker): boolean {
    return '_preSpiderfyLatlng' in marker;
}

function FlyToSelection({ selection, markers, cluster }: SelectionProps) {
    const map = useMap();
    useEffect(() => {
        const marker = selection && markers.current.get(selection.id);
        const group = cluster.current;
        if (!marker || !group) return;
        if (isSpiderfied(marker) || map.getZoom() >= CITY_ZOOM) {
            group.zoomToShowLayer(marker, () => marker.openPopup());
            return;
        }
        const show = () => {
            if (map.getZoom() < CITY_ZOOM) return;
            map.off('moveend', show);
            group.zoomToShowLayer(marker, () => marker.openPopup());
        };
        map.on('moveend', show);
        map.flyTo(marker.getLatLng(), CITY_ZOOM, { duration: 0.8 });
        return () => {
            map.off('moveend', show);
        };
    }, [map, selection, markers, cluster]);
    return null;
}

interface MarkerProps {
    fixture: FixtureView;
    saved: boolean;
    selected: boolean;
    markers: Markers;
    onSelect: (id: string) => void;
    onToggle?: (id: string) => void;
}

const FixtureMarker = memo(function FixtureMarker({
    fixture,
    saved,
    selected,
    markers,
    onSelect,
    onToggle,
}: MarkerProps) {
    const lat = fixture.venue?.lat;
    const lng = fixture.venue?.lng;
    const position = useMemo<LatLng | null>(() => (lat == null || lng == null ? null : [lat, lng]), [lat, lng]);
    const live = fixture.status.state === 'in';
    const { competition, approximate } = fixture;
    const icon = useMemo(
        () => pinIcon({ competition, live, approximate, saved, selected }),
        [competition, live, approximate, saved, selected],
    );
    const ref = useCallback((marker: L.Marker | null) => remember(markers, fixture.id, marker), [markers, fixture.id]);
    const eventHandlers = useMemo(() => ({ click: () => onSelect(fixture.id) }), [onSelect, fixture.id]);
    if (!position) return null;
    return (
        <Marker position={position} icon={icon} title={fixture.title} ref={ref} eventHandlers={eventHandlers}>
            <FixturePopup fixture={fixture} saved={saved} onToggle={onToggle} />
        </Marker>
    );
});

function fitTo(map: L.Map, points: LatLng[]) {
    if (points.length) map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 11 });
}

function RouteLayer({ route }: { route: FixtureView[] }) {
    const map = useMap();
    const points = route.flatMap(located);
    const signature = JSON.stringify(points);
    useEffect(() => {
        fitTo(map, JSON.parse(signature) as LatLng[]);
    }, [map, signature]);
    if (points.length < 2) return null;
    return (
        <Polyline
            positions={points}
            className="route"
            pathOptions={{ color: '#facc15', weight: 2.5, opacity: 0.8, dashArray: '6 8' }}
            interactive={false}
        />
    );
}

function StyleLayers({ style }: { style: MapStyleKey }) {
    const { base, labels, attribution, maxNativeZoom }: MapStyle = MAP_STYLES[style];
    return (
        <>
            <TileLayer key={base} url={base} maxNativeZoom={maxNativeZoom} maxZoom={19} attribution={attribution} />
            {labels && <TileLayer key={labels} url={labels} maxNativeZoom={maxNativeZoom} maxZoom={19} />}
        </>
    );
}

interface ToolsProps {
    style: MapStyleKey;
    onStyle: (key: string) => void;
    onFit: () => void;
}

function MapTools({ style, onStyle, onFit }: ToolsProps) {
    return (
        <div className={styles.tools}>
            <select aria-label="Map style" value={style} onChange={event => onStyle(event.target.value)}>
                {Object.entries(MAP_STYLES).map(([key, { label }]) => (
                    <option key={key} value={key}>
                        {label}
                    </option>
                ))}
            </select>
            <button type="button" title="Zoom to all listed matches" onClick={onFit}>
                Fit matches
            </button>
        </div>
    );
}

function Legend({ competitions, fixtures }: { competitions: Competition[]; fixtures: FixtureView[] }) {
    const groups = legendGroups(competitions, fixtures);
    if (!groups.length) return null;
    return (
        <ul className={styles.legend} aria-label="Legend">
            {groups.map(group => (
                <li key={group.key}>
                    <span className={styles.dot} style={{ background: group.color }} />
                    {group.name}
                </li>
            ))}
            <li className={styles.note}>Dashed pin = city, not exact ground</li>
        </ul>
    );
}

interface Props {
    competitions: Competition[];
    fixtures: FixtureView[];
    near: Near | null;
    onAreaChange: (area: Area) => void;
    savedIds: Set<string>;
    onToggle?: (id: string) => void;
    route: FixtureView[] | null;
    selection: Selection | null;
    onSelect: (id: string) => void;
}

export function FixtureMap({
    competitions,
    fixtures,
    near,
    onAreaChange,
    savedIds,
    onToggle,
    route,
    selection,
    onSelect,
}: Props) {
    const map = useRef<L.Map | null>(null);
    const cluster = useRef<L.MarkerClusterGroup | null>(null);
    const markers = useRef(new Map<string, L.Marker>());
    const [style, setStyle] = useMapStyle();
    return (
        <>
            <MapContainer ref={map} className={styles.map} center={[49, 8]} zoom={5} zoomControl={false} worldCopyJump>
                <ZoomControl position="topright" />
                <AreaReporter onChange={onAreaChange} />
                <SizeWatcher />
                <StyleLayers style={style} />
                {near && <NearLayer near={near} />}
                {route && <RouteLayer route={route} />}
                <FlyToSelection selection={selection} markers={markers} cluster={cluster} />
                <MarkerClusterGroup
                    ref={cluster}
                    maxClusterRadius={45}
                    showCoverageOnHover={false}
                    spiderfyOnMaxZoom
                    spiderfyDistanceMultiplier={1.6}
                    iconCreateFunction={clusterIcon}
                >
                    {fixtures.map(fixture => (
                        <FixtureMarker
                            key={fixture.id}
                            fixture={fixture}
                            saved={savedIds.has(fixture.id)}
                            selected={selection?.id === fixture.id}
                            markers={markers}
                            onSelect={onSelect}
                            onToggle={onToggle}
                        />
                    ))}
                </MarkerClusterGroup>
            </MapContainer>
            <MapTools
                style={style}
                onStyle={setStyle}
                onFit={() => map.current && fitTo(map.current, fixtures.flatMap(located))}
            />
            <Legend competitions={competitions} fixtures={fixtures} />
        </>
    );
}
