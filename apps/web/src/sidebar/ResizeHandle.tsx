import { type KeyboardEvent, type PointerEvent, useState } from 'react';
import styles from './Sidebar.module.css';

const KEY = 'fp:sidebar';
const DEFAULT = 400;
const MIN = 300;
const MAX = 640;
const STEP = 20;

const clamp = (px: number) => Math.min(MAX, Math.max(MIN, Math.round(px)));

function remembered(): number {
    try {
        const saved = Number(localStorage.getItem(KEY));
        return saved ? clamp(saved) : DEFAULT;
    } catch {
        return DEFAULT;
    }
}

function remember(px: number) {
    try {
        localStorage.setItem(KEY, String(px));
    } catch {
        return;
    }
}

export function useSidebarWidth(): [number, (px: number) => void] {
    const [width, setWidth] = useState(remembered);
    const resize = (px: number) => {
        const next = clamp(px);
        setWidth(next);
        remember(next);
    };
    return [width, resize];
}

interface Props {
    width: number;
    onResize: (px: number) => void;
}

export function ResizeHandle({ width, onResize }: Props) {
    const startDrag = (start: PointerEvent<HTMLDivElement>) => {
        const handle = start.currentTarget;
        handle.setPointerCapture(start.pointerId);
        const from = start.clientX - width;
        const move = (e: globalThis.PointerEvent) => onResize(e.clientX - from);
        const stop = () => {
            handle.removeEventListener('pointermove', move);
            handle.removeEventListener('pointerup', stop);
        };
        handle.addEventListener('pointermove', move);
        handle.addEventListener('pointerup', stop);
    };

    const nudge = (e: KeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'ArrowLeft') onResize(width - STEP);
        if (e.key === 'ArrowRight') onResize(width + STEP);
    };

    return (
        <div
            className={styles.resize}
            role="separator"
            aria-label="Resize sidebar"
            aria-orientation="vertical"
            aria-valuemin={MIN}
            aria-valuemax={MAX}
            aria-valuenow={width}
            tabIndex={0}
            onPointerDown={startDrag}
            onKeyDown={nudge}
        />
    );
}
