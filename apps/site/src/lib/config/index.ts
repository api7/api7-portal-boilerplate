import '@tanstack/react-start/server-only';

import { createServerOnlyFn } from '@tanstack/react-start';

import { clearConfigCache, loadConfig } from './load-config';

export const getConfig = createServerOnlyFn(loadConfig);

export { clearConfigCache };
