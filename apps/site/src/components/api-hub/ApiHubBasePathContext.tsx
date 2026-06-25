'use client';

import { createContext, useContext } from 'react';

import { PATH_API_HUB } from '@/constants/path-prefix';

export const ApiHubBasePathContext = createContext(PATH_API_HUB);

export const useApiHubBasePathContext = () => useContext(ApiHubBasePathContext);
