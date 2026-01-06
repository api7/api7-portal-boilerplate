'use client';

import { createContext, useContext } from 'react';

export const ApplicationIdContext = createContext<string | undefined>(undefined);

export const useApplicationId = () => {
  const applicationId = useContext(ApplicationIdContext);
  if (!applicationId) {
    throw new Error('useApplicationId must be used within ApplicationIdContext.Provider');
  }
  return applicationId;
};
