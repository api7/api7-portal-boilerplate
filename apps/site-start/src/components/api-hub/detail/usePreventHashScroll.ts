import { useEffect } from 'react';

/** prevent scroll when hash exists */
export const usePreventHashScroll = () => {
  useEffect(() => {
    // hashchange fires after the browser already scrolled, so restoring on it
    // needs the position from before that jump, not the current one.
    let lastPosition = { x: window.scrollX, y: window.scrollY };
    const trackPosition = () => {
      lastPosition = { x: window.scrollX, y: window.scrollY };
    };

    const stripHash = () => {
      const { origin, pathname, search } = window.location;
      window.history.replaceState(null, '', origin + pathname + search);
    };

    const restoreScroll = () => {
      const target = lastPosition;
      requestAnimationFrame(() => window.scrollTo(target.x, target.y));
    };

    // Same-page hash link clicks fire a cancelable event, so intercept those
    // before the browser navigates/scrolls at all.
    const onClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement)?.closest?.('a[href^="#"]');
      if (!anchor) return;
      e.preventDefault();
      stripHash();
    };

    const onHashChange = () => {
      if (!window.location.hash) return;
      restoreScroll();
      stripHash();
    };

    document.addEventListener('mousedown', trackPosition, true);
    document.addEventListener('keydown', trackPosition, true);
    document.addEventListener('click', onClick, true);
    window.addEventListener('hashchange', onHashChange, true);
    if (window.location.hash) {
      // Loaded with a hash already in the URL — nothing to restore to.
      requestAnimationFrame(() => window.scrollTo(0, 0));
      stripHash();
    }
    return () => {
      document.removeEventListener('mousedown', trackPosition, true);
      document.removeEventListener('keydown', trackPosition, true);
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('hashchange', onHashChange, true);
    };
  }, []);
};
