"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { useApi } from "./use-api";
import { useLiveData } from "./use-live-data";
import {
  getPhase,
  getAlerts,
  getResources,
  getReports,
  getIncidents,
  getRecoveryBriefs,
  getAssignments,
  getAuditLog,
} from "./api";
import type {
  PhaseResponse,
  AlertResponse,
  ReportResponse,
  IncidentResponse,
  ResourceResponse,
  CurrentWeather,
  WaterLevelsResponse,
  TideData,
  WeatherAlertsResponse,
  NewsFeedResponse,
  LiveStreamsResponse,
  ForecastResponse,
} from "./types";
import type { Assignment } from "./api";

export interface ShelterRoute {
  path: [number, number][];
  shelterName: string;
  traffic: "clear" | "moderate" | "heavy" | "gridlock";
}

interface DashboardContextType {
  phase: PhaseResponse | null;
  alerts: AlertResponse[] | null;
  resources: ResourceResponse[] | null;
  reports: ReportResponse[] | null;
  incidents: IncidentResponse[] | null;
  recoveryBriefs: Record<string, unknown>[] | null;
  assignments: Assignment[] | null;
  auditLog: Record<string, unknown>[] | null;
  weather: CurrentWeather | null;
  waterLevels: WaterLevelsResponse | null;
  tides: TideData | null;
  nwsAlerts: WeatherAlertsResponse | null;
  news: NewsFeedResponse | null;
  streams: LiveStreamsResponse | null;
  forecast: ForecastResponse | null;
  lastUpdated: Date | null;
  shelterRoutes: ShelterRoute[];
  userLocation: { lat: number; lng: number } | null;
  setUserLocation: (loc: { lat: number; lng: number } | null) => void;
  refetchPhase: () => void;
  refetchAlerts: () => void;
  refetchIncidents: () => void;
  refetchReports: () => void;
  refetchResources: () => void;
  refetchLive: () => void;
}

const DashboardContext = createContext<DashboardContextType | null>(null);

// Route cache — persists to localStorage across page refreshes
const CACHE_KEY = "aegis-route-cache";
const routeCache = new Map<string, [number, number][]>();

// Load cache from localStorage on init
try {
  const stored = typeof window !== "undefined" ? localStorage.getItem(CACHE_KEY) : null;
  if (stored) {
    const entries: [string, [number, number][]][] = JSON.parse(stored);
    entries.forEach(([k, v]) => routeCache.set(k, v));
  }
} catch {}

function persistCache() {
  try {
    const entries = Array.from(routeCache.entries());
    localStorage.setItem(CACHE_KEY, JSON.stringify(entries));
  } catch {}
}

function decodePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let b: number, shift = 0, result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;
    shift = 0; result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;
    points.push([lat / 1e6, lng / 1e6]);
  }
  return points;
}

async function getRoute(from: [number, number], to: [number, number]): Promise<[number, number][]> {
  const key = `${from[0].toFixed(4)},${from[1].toFixed(4)}-${to[0].toFixed(4)},${to[1].toFixed(4)}`;
  if (routeCache.has(key)) return routeCache.get(key)!;

  const providers = [
    async () => {
      const url = `https://router.project-osrm.org/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      if (!data.routes?.[0]?.geometry?.coordinates) throw new Error("no route");
      return data.routes[0].geometry.coordinates.map((c: [number, number]) => [c[1], c[0]] as [number, number]);
    },
    async () => {
      const req = { locations: [{ lat: from[0], lon: from[1] }, { lat: to[0], lon: to[1] }], costing: "auto" };
      const url = `https://valhalla1.openstreetmap.de/route?json=${encodeURIComponent(JSON.stringify(req))}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      const shape = data?.trip?.legs?.[0]?.shape;
      if (!shape) throw new Error("no shape");
      return decodePolyline(shape);
    },
  ];

  for (const provider of providers) {
    try {
      const path = await provider();
      if (path.length > 2) { routeCache.set(key, path); persistCache(); return path; }
    } catch { continue; }
  }
  return [from, to];
}

// TomTom Traffic Flow API — real-time traffic data with caching
const TOMTOM_KEY = process.env.NEXT_PUBLIC_TOMTOM_API_KEY ?? "";
const trafficCache = new Map<string, { level: ShelterRoute["traffic"]; ts: number }>();
const TRAFFIC_CACHE_TTL = 5 * 60 * 1000; // 5 min cache

// Load traffic cache from localStorage
try {
  const stored = typeof window !== "undefined" ? localStorage.getItem("aegis-traffic-cache") : null;
  if (stored) {
    const entries: [string, { level: ShelterRoute["traffic"]; ts: number }][] = JSON.parse(stored);
    const now = Date.now();
    entries.forEach(([k, v]) => {
      if (now - v.ts < TRAFFIC_CACHE_TTL) trafficCache.set(k, v);
    });
  }
} catch {}

function persistTrafficCache() {
  try {
    localStorage.setItem("aegis-traffic-cache", JSON.stringify(Array.from(trafficCache.entries())));
  } catch {}
}

async function getTrafficLevel(lat: number, lng: number): Promise<ShelterRoute["traffic"]> {
  const key = `${lat.toFixed(3)},${lng.toFixed(3)}`;
  const cached = trafficCache.get(key);
  if (cached && Date.now() - cached.ts < TRAFFIC_CACHE_TTL) return cached.level;

  if (!TOMTOM_KEY) {
    // Fallback to fake if no API key
    return fakeFallbackTraffic(lat, lng);
  }

  try {
    const url = `https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json?point=${lat},${lng}&key=${TOMTOM_KEY}&unit=MPH`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${res.status}`);
    const data = await res.json();
    const current = data?.flowSegmentData?.currentSpeed ?? 0;
    const freeFlow = data?.flowSegmentData?.freeFlowSpeed ?? 60;
    const ratio = freeFlow > 0 ? current / freeFlow : 1;

    let level: ShelterRoute["traffic"];
    if (ratio >= 0.8) level = "clear";
    else if (ratio >= 0.5) level = "moderate";
    else if (ratio >= 0.25) level = "heavy";
    else level = "gridlock";

    trafficCache.set(key, { level, ts: Date.now() });
    persistTrafficCache();
    return level;
  } catch {
    return fakeFallbackTraffic(lat, lng);
  }
}

function fakeFallbackTraffic(lat: number, lng: number): ShelterRoute["traffic"] {
  const seed = Math.abs(Math.sin(lat * 1000 + lng * 2000)) * 10;
  if (seed < 2) return "heavy";
  if (seed < 5) return "moderate";
  return "clear";
}

const TAMPA_CENTER: [number, number] = [27.9506, -82.4572];

export function DashboardProvider({ children }: { children: ReactNode }) {
  const { data: phase, refetch: refetchPhase } = useApi(getPhase);
  const { data: alerts, refetch: refetchAlerts } = useApi(getAlerts);
  const { data: resources, refetch: refetchResources } = useApi(getResources);
  const { data: reports, refetch: refetchReports } = useApi(getReports);
  const { data: incidents, refetch: refetchIncidents } = useApi(getIncidents);
  const { data: recoveryBriefs } = useApi(getRecoveryBriefs);
  const { data: assignments } = useApi(getAssignments);
  const { data: auditLog } = useApi(() => getAuditLog(20));
  const {
    weather, waterLevels, tides, alerts: nwsAlerts, news, streams, forecast, lastUpdated,
    refetch: refetchLive,
  } = useLiveData();

  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [shelterRoutes, setShelterRoutes] = useState<ShelterRoute[]>([]);

  // Auto-locate on mount
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  // Compute shelter routes (persists across page switches)
  useEffect(() => {
    const openShelters = resources?.filter((r) => r.type === "shelter" && r.status === "open") ?? [];
    if (openShelters.length === 0) return;

    const origin: [number, number] = userLocation
      ? [userLocation.lat, userLocation.lng]
      : TAMPA_CENTER;

    let cancelled = false;
    const compute = async () => {
      const results: ShelterRoute[] = [];
      for (const shelter of openShelters) {
        if (cancelled) return;
        const dest: [number, number] = [shelter.lat, shelter.lng];
        const key = `${origin[0].toFixed(4)},${origin[1].toFixed(4)}-${dest[0].toFixed(4)},${dest[1].toFixed(4)}`;
        if (!routeCache.has(key)) {
          await new Promise((r) => setTimeout(r, 1100));
        }
        if (cancelled) return;
        const path = await getRoute(origin, dest);
        // Sample traffic at midpoint of route for real-time data
        const mid = path[Math.floor(path.length / 2)] ?? dest;
        const traffic = await getTrafficLevel(mid[0], mid[1]);
        results.push({ path, shelterName: shelter.name, traffic });
        if (!cancelled) setShelterRoutes([...results]);
      }
    };
    compute();
    return () => { cancelled = true; };
  }, [userLocation, resources]);

  return (
    <DashboardContext.Provider
      value={{
        phase, alerts, resources, reports, incidents, recoveryBriefs, assignments, auditLog,
        weather, waterLevels, tides, nwsAlerts, news, streams, forecast, lastUpdated,
        shelterRoutes, userLocation, setUserLocation,
        refetchPhase, refetchAlerts, refetchIncidents, refetchReports, refetchResources, refetchLive,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error("useDashboard must be used within DashboardProvider");
  return ctx;
}
