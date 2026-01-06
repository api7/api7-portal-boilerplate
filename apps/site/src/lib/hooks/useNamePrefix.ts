import { createContext, useContext } from 'react';

const NamePrefixContext = createContext<string>('');

export const useNamePrefix = () => {
  const prefix = useContext(NamePrefixContext) || '';
  return (name: string) => (prefix ? [prefix, name].join('.') : name);
};

export const NamePrefixProvider = NamePrefixContext.Provider;

