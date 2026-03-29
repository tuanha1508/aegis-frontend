"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const CACHE_PREFIX = "aegis-api-";

function readCache<T>(key: string): T | null {
  try {
    const stored = localStorage.getItem(CACHE_PREFIX + key);
    if (!stored) return null;
    const { data, ts } = JSON.parse(stored);
    // Cache valid for 1 minute — show stale data instantly, refresh in background
    if (Date.now() - ts > 60 * 1000) return null;
    return data as T;
  } catch {
    return null;
  }
}

function writeCache<T>(key: string, data: T) {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ data, ts: Date.now() }));
  } catch {}
}

export function useApi<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = [],
  cacheKey?: string,
  pollInterval: number = 60_000 // auto-refresh every 60s
) {
  const [data, setData] = useState<T | null>(() => {
    if (cacheKey) return readCache<T>(cacheKey);
    return null;
  });
  const [loading, setLoading] = useState(!data);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refetch = useCallback(() => {
    setError(null);
    fetcher()
      .then((result) => {
        setData(result);
        if (cacheKey) writeCache(cacheKey, result);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    refetch();
    // Auto-poll every interval
    intervalRef.current = setInterval(refetch, pollInterval);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [refetch, pollInterval]);

  return { data, loading, error, refetch };
}
