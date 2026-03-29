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

export function useLiveData(intervalMs = 60_000) {
  const [data, setData] = useState<LiveData>({
    weather: null,
    waterLevels: null,
    tides: null,
    alerts: null,
    news: null,
    streams: null,
    forecast: null,
  });
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const res = await getLiveAll();
      setData({
        weather: res.weather ?? null,
        waterLevels: res.water_levels ?? null,
        tides: res.tides ?? null,
        alerts: res.alerts ?? null,
        news: res.news ?? null,
        streams: res.streams ?? null,
        forecast: res.forecast ?? null,
      });
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
