import { useEffect, useState } from 'react';
import { useStatus } from '../api/queries';
import styles from './Sidebar.module.css';

const MINUTE = 60_000;

function ago(iso: string, now: number): string {
    const minutes = Math.floor((now - Date.parse(iso)) / MINUTE);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} h ago`;
    return `${Math.floor(hours / 24)} days ago`;
}

function useNow(every: number): number {
    const [now, setNow] = useState(Date.now);
    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), every);
        return () => clearInterval(timer);
    }, [every]);
    return now;
}

export function DataUpdated() {
    const status = useStatus();
    const now = useNow(30_000);
    const finished = status.data?.lastRun?.finishedAt;
    if (!finished) return null;
    return <span className={styles.updated}>Data updated {ago(finished, now)}</span>;
}
