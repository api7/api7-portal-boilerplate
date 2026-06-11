import { useEffect } from 'react';

/** prevent scroll when hash exists */
export const usePreventHashScroll = () => {
  useEffect(() => {
    const preventScroll = (e: Event) => {
      const { origin, pathname, search } = window.location;
      if (window.location.hash) {
        e.preventDefault();
        const baseUrl = origin + pathname + search;
        window.history.replaceState(null, '', baseUrl);
      }
    };
    window.addEventListener('hashchange', preventScroll, true);
    if (window.location.hash) preventScroll(new Event('hashchange'));
    return () => window.removeEventListener('hashchange', preventScroll, true);
  }, []);
};
