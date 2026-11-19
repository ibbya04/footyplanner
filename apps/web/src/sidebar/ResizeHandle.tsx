import type { KeyboardEvent, PointerEvent } from 'react';
import styles from './Sidebar.module.css';
import { DEFAULT_WIDTH, MIN_WIDTH, type SidebarWidth } from './useSidebarWidth';

const STEP = 20;
const BIG_STEP = 60;

export function ResizeHandle({ width, max, resize }: SidebarWidth) {
    const startDrag = (start: PointerEvent<HTMLDivElement>) => {
        start.preventDefault();
        const handle = start.currentTarget;
        const { pointerId } = start;
        const page = document.documentElement;
        const offset = start.clientX - width;

        const end = () => {
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', end);
            window.removeEventListener('pointercancel', end);
            handle.removeEventListener('lostpointercapture', end);
            if (handle.hasPointerCapture(pointerId)) handle.releasePointerCapture(pointerId);
            page.style.removeProperty('cursor');
            page.style.removeProperty('user-select');
        };
        const move = (e: globalThis.PointerEvent) => {
            if (e.buttons === 0) end();
            else resize(e.clientX - offset);
        };

        handle.setPointerCapture(pointerId);
        page.style.cursor = 'col-resize';
        page.style.userSelect = 'none';
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', end);
        window.addEventListener('pointercancel', end);
        handle.addEventListener('lostpointercapture', end);
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
