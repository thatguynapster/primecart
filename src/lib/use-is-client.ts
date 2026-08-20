"use client";

import { useSyncExternalStore } from "react";

/** Never emits; the value only differs between server and client. */
const subscribe = () => () => {};
const onClient = () => true;
const onServer = () => false;

/**
 * False while server-rendering and during hydration, true afterwards.
 *
 * Anything read from `localStorage` — the cart — is invisible to the server, so
 * rendering it on the first pass produces a hydration mismatch. The usual
 * `useState(false)` + `useEffect(() => setMounted(true))` does the same job but
 * sets state inside an effect, which React 19 flags as a cascading render.
 * `useSyncExternalStore` expresses the same idea directly: it has a separate
 * server snapshot.
 */
export function useIsClient(): boolean {
  return useSyncExternalStore(subscribe, onClient, onServer);
}
