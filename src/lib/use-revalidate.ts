"use client";

import { useEffect, useRef } from "react";

/**
 * Re-run `fn` whenever the page becomes visible again — tab refocus, window
 * focus, or a bfcache restore (browser back/forward). This is the SWR
 * `revalidateOnFocus` pattern: client-fetched data (the applications list,
 * board and dashboard) has no other way to learn that a mutation happened on a
 * different route or tab, so we refresh it on return.
 *
 * `fn` is kept in a ref so callers can pass an inline closure without
 * re-subscribing on every render.
 */
export function useRevalidateOnFocus(fn: () => void, enabled = true) {
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    if (!enabled) return;
    const run = () => fnRef.current();
    const onVisible = () => {
      if (document.visibilityState === "visible") run();
    };
    window.addEventListener("focus", run);
    window.addEventListener("pageshow", run);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", run);
      window.removeEventListener("pageshow", run);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled]);
}
