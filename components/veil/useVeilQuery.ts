"use client";

import { useCallback, useEffect, useState } from "react";

import { friendlyErrorMessage } from "./errors";

export type QueryState<T> =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; data: T };

/**
 * Loads data on mount and whenever `key` changes. `load` must be a stable
 * function (a veilApi method), never an inline closure, or it refetches forever.
 */
export function useVeilQuery<T, K>(key: K, load: (key: K) => Promise<T>) {
  const [state, setState] = useState<QueryState<T>>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let isCurrent = true;
    load(key).then(
      (data) => {
        if (isCurrent) setState({ status: "success", data });
      },
      (error: unknown) => {
        if (isCurrent) {
          setState({ status: "error", message: friendlyErrorMessage(error) });
        }
      },
    );
    return () => {
      isCurrent = false;
    };
  }, [key, load, attempt]);

  const retry = useCallback(() => {
    setState({ status: "loading" });
    setAttempt((count) => count + 1);
  }, []);

  const update = useCallback((updater: (data: T) => T) => {
    setState((current) =>
      current.status === "success"
        ? { status: "success", data: updater(current.data) }
        : current,
    );
  }, []);

  return { state, retry, update };
}
