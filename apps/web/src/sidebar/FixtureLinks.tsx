import type { ReactNode } from 'react';
import type { FixtureView } from '../browse/viewFixtures';
import { downloadIcs, icsFilename } from '../shortlist/download';

interface Props {
    fixture: FixtureView;
    className: string | undefined;
    children?: ReactNode;
}

export function FixtureLinks({ fixture, className, children }: Props) {
    return (
        <div className={className}>
            {children}
            <button type="button" onClick={() => downloadIcs([fixture], icsFilename(fixture))}>
                Add to calendar
            </button>
            {fixture.url && (
                <a href={fixture.url} target="_blank" rel="noopener noreferrer">
                    Match centre
                </a>
            )}
            {fixture.directionsUrl && (
                <a href={fixture.directionsUrl} target="_blank" rel="noopener noreferrer">
                    Directions
                </a>
            )}
        </div>
    );
}
