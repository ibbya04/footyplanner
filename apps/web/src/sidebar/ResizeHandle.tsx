import type { KeyboardEvent, PointerEvent } from 'react';
import styles from './Sidebar.module.css';
import { DEFAULT_WIDTH, MIN_WIDTH, type SidebarWidth } from './useSidebarWidth';

const STEP = 20;
const BIG_STEP = 60;

export function ResizeHandle({ width, max, resize }: SidebarWidth) {
    const startDrag = (start: PointerEvent<HTMLDivElement>) => {
        start.preventDefault();
        const handle = start.currentTarget;
        handle.setPointerCapture(start.pointerId);
        const offset = start.clientX - width;
        const move = (e: globalThis.PointerEvent) => resize(e.clientX - offset);
        const stop = () => {
            handle.removeEventListener('pointermove', move);
            handle.removeEventListener('pointerup', stop);
            handle.removeEventListener('pointercancel', stop);
        };
        handle.addEventListener('pointermove', move);
        handle.addEventListener('pointerup', stop);
        handle.addEventListener('pointercancel', stop);
    };

    const nudge = (e: KeyboardEvent<HTMLDivElement>) => {
        const step = e.shiftKey ? BIG_STEP : STEP;
        if (e.key === 'ArrowLeft') resize(width - step);
        else if (e.key === 'ArrowRight') resize(width + step);
        else return;
        e.preventDefault();
    };

    return (
        <div
            className={styles.resize}
            role="separator"
            aria-label="Resize sidebar"
            aria-orientation="vertical"
            aria-valuemin={MIN_WIDTH}
            aria-valuemax={max}
            aria-valuenow={width}
            tabIndex={0}
            onPointerDown={startDrag}
            onDoubleClick={() => resize(DEFAULT_WIDTH)}
            onKeyDown={nudge}
        />
    );
}
