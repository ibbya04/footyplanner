import type { Point } from '@footyplanner/shared';
import { type KeyboardEvent, useState } from 'react';
import { DEFAULT_RADIUS_KM, RADII_KM } from '../browse/urlFilters';
import type { Near, SortBy } from '../browse/viewFixtures';
import type { Place } from '../near/photon';
import { usePlaces } from '../near/usePlaces';
import { Popover } from './Popover';
import styles from './Sidebar.module.css';

interface Props {
    near: Near | null;
    sort: SortBy;
    bias: Point | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onNear: (near: Near | null) => void;
    onSort: (sort: SortBy) => void;
}

const LISTBOX = 'near-suggestions';
const LOCATION_ERRORS: Record<number, string> = { 1: 'Location permission was denied' };

function PinIcon() {
    return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
            <circle cx="12" cy="9.5" r="2.5" />
        </svg>
    );
}

interface SuggestionsProps {
    places: ReturnType<typeof usePlaces>;
    active: number;
    onChoose: (place: Place) => void;
}

function Suggestions({ places, active, onChoose }: SuggestionsProps) {
    if (places.isPending) return null;
    if (places.isError) return <div className={styles.suggestMessage}>Place search is unavailable right now</div>;
    if (!places.data.length) return <div className={styles.suggestMessage}>No places found</div>;
    return (
        <ul id={LISTBOX} className={styles.suggest} role="listbox" aria-label="Places">
            {places.data.map((place, i) => (
                <li
                    key={`${place.lat},${place.lng},${place.name}`}
                    id={`${LISTBOX}-${i}`}
                    role="option"
                    aria-selected={i === active}
                    className={styles.suggestion}
                    onMouseDown={e => {
                        e.preventDefault();
                        onChoose(place);
                    }}
                >
                    {place.name}
                    <small>{place.detail}</small>
                </li>
            ))}
        </ul>
    );
}

function NearPanel({
    near,
    sort,
    bias,
    onNear,
    onSort,
    onDone,
}: Omit<Props, 'open' | 'onOpenChange'> & { onDone: () => void }) {
    const [text, setText] = useState(near?.name ?? '');
    const [active, setActive] = useState(-1);
    const [radius, setRadius] = useState(near?.radius ?? DEFAULT_RADIUS_KM);
    const [locating, setLocating] = useState(false);
    const [problem, setProblem] = useState<string | null>(null);
    const places = usePlaces(text, bias);
    const options = places.data ?? [];

    const choose = (place: Pick<Near, 'name' | 'lat' | 'lng'>) => {
        onNear({ name: place.name, lat: place.lat, lng: place.lng, radius });
        onDone();
    };

    const onKeyDown = (e: KeyboardEvent) => {
        if (!options.length) return;
        if (e.key === 'ArrowDown') setActive((active + 1) % options.length);
        else if (e.key === 'ArrowUp') setActive((active - 1 + options.length) % options.length);
        else if (e.key === 'Enter') choose(options[Math.max(active, 0)] as Place);
        else return;
        e.preventDefault();
    };

    const locate = () => {
        if (!navigator.geolocation) return setProblem('Your browser can’t share its location');
        setLocating(true);
        navigator.geolocation.getCurrentPosition(
            pos => {
                setLocating(false);
                choose({ name: 'My location', lat: pos.coords.latitude, lng: pos.coords.longitude });
            },
            err => {
                setLocating(false);
                setProblem(LOCATION_ERRORS[err.code] ?? 'Couldn’t get your location');
            },
            { enableHighAccuracy: false, timeout: 10_000, maximumAge: 600_000 },
        );
    };

    const changeRadius = (km: number) => {
        setRadius(km);
        if (near) onNear({ ...near, radius: km });
    };

    return (
        <>
            <div className={styles.nearBox}>
                <input
                    type="text"
                    role="combobox"
                    className={styles.field}
                    placeholder="City, hotel or address"
                    autoComplete="off"
                    aria-label="Find fixtures near a place"
                    aria-autocomplete="list"
                    aria-expanded={options.length > 0}
                    aria-controls={LISTBOX}
                    aria-activedescendant={active >= 0 ? `${LISTBOX}-${active}` : undefined}
                    data-autofocus
                    value={text}
                    onChange={e => {
                        setText(e.target.value);
                        setActive(-1);
                    }}
                    onKeyDown={onKeyDown}
                />
                {near && (
                    <button
                        type="button"
                        className={styles.nearClear}
                        aria-label="Clear place"
                        onClick={() => {
                            setText('');
                            onNear(null);
                        }}
                    >
                        ×
                    </button>
                )}
                {text !== near?.name && <Suggestions places={places} active={active} onChoose={choose} />}
            </div>
            <div className={styles.presets}>
                <button type="button" className={styles.chip} aria-busy={locating} onClick={locate}>
                    📍 My location
                </button>
            </div>
            {problem && (
                <p className={styles.problem} role="status">
                    {problem}
                </p>
            )}
            <div className={styles.popLabel}>Within</div>
            <div className={styles.presets}>
                {RADII_KM.map(km => (
                    <button
                        key={km}
                        type="button"
                        className={styles.chip}
                        aria-pressed={km === radius}
                        onClick={() => changeRadius(km)}
                    >
                        {km} km
                    </button>
                ))}
            </div>
            {near && (
                <>
                    <div className={styles.popLabel}>Sort fixtures by</div>
                    <div className={styles.segment} role="group" aria-label="Sort fixtures by">
                        {(['time', 'distance'] as const).map(by => (
                            <button key={by} type="button" aria-pressed={sort === by} onClick={() => onSort(by)}>
                                {by === 'time' ? 'Time' : 'Distance'}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </>
    );
}

export function NearPicker({ open, onOpenChange, ...panel }: Props) {
    const { near } = panel;
    const summary = near ? `${near.name} · ${near.radius} km` : 'Anywhere';
    return (
        <Popover
            label={`Near a place: ${summary}`}
            title="Near a place"
            open={open}
            set={!!near}
            align="end"
            onOpenChange={onOpenChange}
            trigger={
                <>
                    <PinIcon />
                    <span className={styles.triggerText}>{summary}</span>
                </>
            }
        >
            <NearPanel {...panel} onDone={() => onOpenChange(false)} />
        </Popover>
    );
}
