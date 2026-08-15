"use client";

import { useSyncExternalStore } from "react";

const NEVER_CHANGES = () => () => {};
const CLIENT = () => true;
const SERVER = () => false;

/**
 * Hydration tamamlandı mı.
 *
 * `useState(false)` + `useEffect(() => setMounted(true))` kalıbının aksine ne
 * mismatch ne de cascading render riski var: `useSyncExternalStore` sunucu
 * snapshot'ı (false) ile hydration'ı garanti eşler. Tarayıcıda ancak istemcide
 * çözülebilen şeyler (tema, `matchMedia`, `document`) için kapı olarak kullanılır.
 */
export function useHydrated() {
  return useSyncExternalStore(NEVER_CHANGES, CLIENT, SERVER);
}
