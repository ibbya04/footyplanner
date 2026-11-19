import type { Competition } from '@footyplanner/shared';
import { type CSSProperties, useState } from 'react';
import type { UrlFilters } from '../browse/urlFilters';
import styles from './Sidebar.module.css';

interface Props {
    competitions: Competition[];
    chosen: UrlFilters['comps'];
    onChange: (comps: UrlFilters['comps']) => void;
}

function groupsOf(competitions: Competition[]) {
    const groups = new Map<string, { name: string; color: string; competitions: Competition[] }>();
    for (const competition of competitions) {
        const { key, name, color } = competition.group;
        const group = groups.get(key) ?? { name, color, competitions: [] };
        group.competitions.push(competition);
        groups.set(key, group);
    }
    return [...groups.values()];
}

export function CompetitionPicker({ competitions, chosen, onChange }: Props) {
    const [open, setOpen] = useState(false);
    const all = competitions.map(c => c.slug);
    const on = new Set(chosen === 'all' ? all : chosen);
    const summary = chosen === 'all' ? 'All' : `${on.size} of ${all.length}`;

    const choose = (slugs: string[]) => onChange(slugs.length === all.length || !slugs.length ? 'all' : slugs);
    const toggle = (slug: string) => choose(all.filter(s => (s === slug ? !on.has(s) : on.has(s))));

    return (
        <section className={styles.comps}>
            <button type="button" className={styles.compsToggle} aria-expanded={open} onClick={() => setOpen(!open)}>
                Competitions <span className={styles.count}>{summary}</span>
            </button>
            {open && (
                <div className={styles.compsPanel}>
                    <div className={styles.compsActions}>
                        <button type="button" className={styles.chip} onClick={() => onChange('all')}>
                            All
                        </button>
                        <button
                            type="button"
                            className={styles.chip}
                            onClick={() => choose(competitions.filter(c => c.featured).map(c => c.slug))}
                        >
                            Big 5 + UEFA
                        </button>
                    </div>
                    {groupsOf(competitions).map(group => (
                        <div key={group.name} className={styles.compGroup}>
                            <div className={styles.compGroupName}>{group.name}</div>
                            <div className={styles.compChips}>
                                {group.competitions.map(c => (
                                    <button
                                        key={c.slug}
                                        type="button"
                                        className={styles.compChip}
                                        style={{ '--c': group.color } as CSSProperties}
                                        aria-pressed={on.has(c.slug)}
                                        onClick={() => toggle(c.slug)}
                                    >
                                        {c.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}
