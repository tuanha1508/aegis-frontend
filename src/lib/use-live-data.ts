"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getLiveWeather,
  getLiveWaterLevels,
  getLiveTides,
  getLiveAlerts,
  getLiveNews,
  getLiveStreams,
  getLiveForecast,
} from "./api";
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
    const [weather, waterLevels, tides, alerts, news, streams, forecast] =
      await Promise.allSettled([
        getLiveWeather(),
        getLiveWaterLevels(),
        getLiveTides(),
        getLiveAlerts(),
        getLiveNews(),
        getLiveStreams(),
        getLiveForecast(),
      ]);

    setData({
      weather: weather.status === "fulfilled" ? weather.value : null,
      waterLevels:
        waterLevels.status === "fulfilled" ? waterLevels.value : null,
      tides: tides.status === "fulfilled" ? tides.value : null,
      alerts: alerts.status === "fulfilled" ? alerts.value : null,
      news: news.status === "fulfilled" ? news.value : null,
      streams: streams.status === "fulfilled" ? streams.value : null,
      forecast: forecast.status === "fulfilled" ? forecast.value : null,
    });
    setLastUpdated(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, intervalMs);
    return () => clearInterval(interval);
  }, [fetchAll, intervalMs]);

  return { ...data, loading, lastUpdated, refetch: fetchAll };
}
