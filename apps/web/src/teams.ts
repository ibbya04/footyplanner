import type { Fixture } from '@footyplanner/shared';

export const teamName = (team: Fixture['home']) => team?.shortName ?? team?.name ?? 'TBD';
