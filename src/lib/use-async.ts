"use client";

import { useCallback, useEffect, useRef, useState, type DependencyList } from "react";

export type AsyncState<T> =
  | { status: "loading"; data?: undefined; error?: undefined }
  | { status: "ready"; data: T; error?: undefined }
  | { status: "error"; data?: undefined; error: Error };

/**
 * Loads data when `deps` change. `reload()` refreshes in the background: what's on screen stays
 * until the new data arrives, so lists don't flash back to skeletons after every edit.
 */
export function useAsync<T>(fn: () => Promise<T>, deps: DependencyList) {
  const [state, setState] = useState<AsyncState<T>>({ status: "loading" });
  const [nonce, setNonce] = useState(0);
  const reloading = useRef(false);

  useEffect(() => {
    let live = true;
    if (!reloading.current) setState({ status: "loading" });
    reloading.current = false;
    fn().then(
      (data) => live && setState({ status: "ready", data }),
      (error: Error) => live && setState({ status: "error", error }),
    );
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  const reload = useCallback(() => {
    reloading.current = true;
    setNonce((n) => n + 1);
  }, []);
  return [state, reload] as const;
}
