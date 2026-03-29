"use client";

import { useState, useEffect, useCallback } from "react";
import { getLiveAll } from "./api";
import type {
  CurrentWeather,
  WaterLevelsResponse,
  TideData,
  WeatherAlertsResponse,
  NewsFeedResponse,
  LiveStreamsResponse,
  ForecastResponse,
} from "./types";

interface LiveData {
  weather: CurrentWeather | null;
  waterLevels: WaterLevelsResponse | null;
  tides: TideData | null;
  alerts: WeatherAlertsResponse | null;
  news: NewsFeedResponse | null;
  streams: LiveStreamsResponse | null;
  forecast: ForecastResponse | null;
}

const LIVE_CACHE_KEY = "aegis-api-live";

function readLiveCache(): LiveData | null {
  try {
    const stored = localStorage.getItem(LIVE_CACHE_KEY);
    if (!stored) return null;
    const { data, ts } = JSON.parse(stored);
    // Live data cache valid for 1 minute
    if (Date.now() - ts > 60 * 1000) return null;
    return data as LiveData;
  } catch {
    return null;
  }
}

function writeLiveCache(data: LiveData) {
  try {
    localStorage.setItem(LIVE_CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
  } catch {}
}

export function useLiveData(intervalMs = 60_000) {
  const [data, setData] = useState<LiveData>(() => {
    return readLiveCache() ?? {
      weather: null,
      waterLevels: null,
      tides: null,
      alerts: null,
      news: null,
      streams: null,
      forecast: null,
    };
  });
  const [loading, setLoading] = useState(!readLiveCache());
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const res = await getLiveAll();
      const newData: LiveData = {
        weather: res.weather ?? null,
        waterLevels: res.water_levels ?? null,
        tides: res.tides ?? null,
        alerts: res.alerts ?? null,
        news: res.news ?? null,
        streams: res.streams ?? null,
        forecast: res.forecast ?? null,
      };
      setData(newData);
      writeLiveCache(newData);
      setLastUpdated(new Date());
    } catch {
      // Keep previous data on error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, intervalMs);
    return () => clearInterval(interval);
  }, [fetchAll, intervalMs]);

  return { ...data, loading, lastUpdated, refetch: fetchAll };
}
