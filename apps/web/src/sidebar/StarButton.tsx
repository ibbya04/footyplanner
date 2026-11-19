import styles from './Sidebar.module.css';

interface Props {
    title: string;
    saved: boolean;
    onToggle: () => void;
    className?: string;
}

export function StarButton({ title, saved, onToggle, className = styles.star }: Props) {
    return (
        <button
            type="button"
            className={className}
            aria-pressed={saved}
            aria-label={saved ? `Remove ${title} from shortlist` : `Save ${title} to shortlist`}
            title={saved ? 'Remove from shortlist' : 'Save to shortlist'}
            onClick={onToggle}
        >
            {saved ? '★' : '☆'}
        </button>
    );
}
