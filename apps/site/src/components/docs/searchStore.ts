import { atom } from 'nanostores';

/** Shared open state for the docs search dialog, so any trigger (sidebar,
 *  mobile drawer, ⌘K) can open the single dialog instance. */
export const $searchOpen = atom(false);

export const openSearch = () => $searchOpen.set(true);
export const closeSearch = () => $searchOpen.set(false);
