import { useEffect, useState } from 'react';

const KEY = 'fp:sidebar';
export const DEFAULT_WIDTH = 400;
export const MIN_WIDTH = 300;
const MAX_WIDTH = 760;
const MAP_ROOM = 320;

const maxFor = (windowWidth: number) => Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, windowWidth - MAP_ROOM));

function remembered(): number {
    try {
        return Number(localStorage.getItem(KEY)) || DEFAULT_WIDTH;
    } catch {
        return DEFAULT_WIDTH;
    }
}

function remember(px: number) {
    try {
        localStorage.setItem(KEY, String(px));
    } catch {
        return;
    }
}

export interface SidebarWidth {
    width: number;
    max: number;
    resize: (px: number) => void;
}

export function useSidebarWidth(): SidebarWidth {
    const [wanted, setWanted] = useState(remembered);
    const [max, setMax] = useState(() => maxFor(window.innerWidth));

    useEffect(() => {
        const onResize = () => setMax(maxFor(window.innerWidth));
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    const clamp = (px: number) => Math.round(Math.min(max, Math.max(MIN_WIDTH, px)));
    const resize = (px: number) => {
        const next = clamp(px);
        setWanted(next);
        remember(next);
    };

    return { width: clamp(wanted), max, resize };
}
