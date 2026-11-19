import { type ReactNode, type RefObject, useEffect, useRef } from 'react';
import styles from './Popover.module.css';

interface Props {
    label: string;
    title: string;
    trigger: ReactNode;
    open: boolean;
    set?: boolean;
    align?: 'start' | 'end';
    onOpenChange: (open: boolean) => void;
    children: ReactNode;
}

const FOCUS_FIRST = '[data-autofocus], input, button';

function useCloseOnOutsideOrEscape(
    open: boolean,
    wrap: RefObject<HTMLDivElement | null>,
    trigger: RefObject<HTMLButtonElement | null>,
    close: () => void,
) {
    useEffect(() => {
        if (!open) return;
        const onMouseDown = (e: MouseEvent) => {
            if (!wrap.current?.contains(e.target as Node)) close();
        };
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return;
            close();
            trigger.current?.focus();
        };
        document.addEventListener('mousedown', onMouseDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('mousedown', onMouseDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [open, wrap, trigger, close]);
}

export function Popover({ label, title, trigger, open, set, align = 'start', onOpenChange, children }: Props) {
    const wrap = useRef<HTMLDivElement>(null);
    const button = useRef<HTMLButtonElement>(null);
    const panel = useRef<HTMLDivElement>(null);
    useCloseOnOutsideOrEscape(open, wrap, button, () => onOpenChange(false));
    useEffect(() => {
        if (open) panel.current?.querySelector<HTMLElement>(FOCUS_FIRST)?.focus();
    }, [open]);

    return (
        <div className={styles.wrap} ref={wrap}>
            <button
                ref={button}
                type="button"
                className={styles.trigger}
                aria-label={label}
                aria-haspopup="dialog"
                aria-expanded={open}
                data-set={set || undefined}
                onClick={() => onOpenChange(!open)}
            >
                {trigger}
            </button>
            {open && (
                <div ref={panel} className={styles.panel} data-align={align} role="dialog" aria-label={title}>
                    {children}
                </div>
            )}
        </div>
    );
}
