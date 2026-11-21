import { useCallback, useState } from 'react';

export interface Selection {
    id: string;
    source: 'map' | 'list';
}

export function useSelection(): [Selection | null, (id: string, source: Selection['source']) => void] {
    const [selection, setSelection] = useState<Selection | null>(null);
    const select = useCallback((id: string, source: Selection['source']) => setSelection({ id, source }), []);
    return [selection, select];
}
