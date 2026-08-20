"use client";

import { useSyncExternalStore } from "react";

/**
 * The side rail's collapsed preference, persisted so it survives navigation.
 *
 * Modelled as an external store rather than `useState` + `useEffect`, because
 * that is what localStorage is. The effect version sets state during an effect,
 * which React 19 rejects as a cascading render, and it also flashes the
 * expanded rail for one frame before correcting itself.
 */

const KEY = "primecart-rail-collapsed";

const listeners = new Set<() => void>();

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

/** Booleans are primitives, so this is a stable snapshot across reads. */
function getSnapshot(): boolean {
  return localStorage.getItem(KEY) === "1";
}

/** The rail renders expanded on the server; the client corrects on hydration. */
function getServerSnapshot(): boolean {
  return false;
}

export function useRailCollapsed(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function setRailCollapsed(collapsed: boolean): void {
  localStorage.setItem(KEY, collapsed ? "1" : "0");
  listeners.forEach((listener) => listener());
}
