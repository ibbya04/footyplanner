import { useState } from 'react';

const KEY = 'fp:map-style';
const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services';
const ESRI_ATTRIBUTION =
    'Tiles &copy; <a href="https://www.esri.com">Esri</a>, HERE, Garmin, &copy; OpenStreetMap contributors';
const IMAGERY_ATTRIBUTION = 'Imagery &copy; <a href="https://www.esri.com">Esri</a>, Maxar, Earthstar Geographics';

export interface MapStyle {
    label: string;
    base: string;
    labels?: string;
    maxNativeZoom: number;
    attribution: string;
}

export const MAP_STYLES = {
    dark: {
        label: 'Dark',
        base: `${ESRI}/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}`,
        labels: `${ESRI}/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}`,
        maxNativeZoom: 16,
        attribution: ESRI_ATTRIBUTION,
    },
    light: {
        label: 'Light',
        base: `${ESRI}/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}`,
        labels: `${ESRI}/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}`,
        maxNativeZoom: 16,
        attribution: ESRI_ATTRIBUTION,
    },
    street: {
        label: 'Streets',
        base: `${ESRI}/World_Street_Map/MapServer/tile/{z}/{y}/{x}`,
        maxNativeZoom: 19,
        attribution: ESRI_ATTRIBUTION,
    },
    satellite: {
        label: 'Satellite',
        base: `${ESRI}/World_Imagery/MapServer/tile/{z}/{y}/{x}`,
        labels: `${ESRI}/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}`,
        maxNativeZoom: 19,
        attribution: IMAGERY_ATTRIBUTION,
    },
} satisfies Record<string, MapStyle>;

export type MapStyleKey = keyof typeof MAP_STYLES;

const isStyle = (key: string | null): key is MapStyleKey => key != null && Object.hasOwn(MAP_STYLES, key);

function remembered(): MapStyleKey {
    try {
        const key = localStorage.getItem(KEY);
        return isStyle(key) ? key : 'dark';
    } catch {
        return 'dark';
    }
}

function remember(key: MapStyleKey) {
    try {
        localStorage.setItem(KEY, key);
    } catch {
        return;
    }
}

export function useMapStyle(): [MapStyleKey, (key: string) => void] {
    const [style, setStyle] = useState(remembered);
    const choose = (key: string) => {
        if (!isStyle(key)) return;
        setStyle(key);
        remember(key);
    };
    return [style, choose];
}
