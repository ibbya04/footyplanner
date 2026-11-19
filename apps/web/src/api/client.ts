import type { AppType } from '@footyplanner/api';
import { hc } from 'hono/client';

export const client = hc<AppType>(window.location.origin);
