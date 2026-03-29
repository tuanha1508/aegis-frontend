"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Circle,
  Marker,
  Popup,
  Polyline,
  Polygon,
  ScaleControl,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import { Icon } from "@iconify/react";
import { icons } from "@/lib/icons";
import { MapSimulation } from "./map-simulation";
import type {
  RiskAssessment,
  ResourceResponse,
  IncidentResponse,
} from "@/lib/types";

// Fix default marker icon
const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});
L.Marker.prototype.options.icon = DefaultIcon;

const TAMPA_CENTER: [number, number] = [27.9506, -82.4572];

// Tile providers
const TILE_STYLES = {
  light: {
    label: "Light",
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
  },
  dark: {
    label: "Dark",
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
  },
  satellite: {
    label: "Satellite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: '&copy; <a href="https://www.esri.com/">Esri</a>',
  },
  street: {
    label: "Street",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
  },
} as const;

type TileStyle = keyof typeof TILE_STYLES;

const riskColor = (risk: number) => {
  if (risk >= 0.8) return "#ef4444";
  if (risk >= 0.6) return "#f59e0b";
  if (risk >= 0.4) return "#3b82f6";
  return "#22c55e";
};

const recommendationLabel = (rec: string) => {
  if (rec === "evacuate") return "Evacuate";
  if (rec === "shelter_in_place") return "Shelter in Place";
  return "Monitor";
};

// Hurricane Milton track — smoothed path approaching Tampa Bay
const MILTON_TRACK: [number, number][] = [
  [22.4, -93.1], [22.6, -91.0], [22.5, -88.4], [22.7, -87.5],
  [23.2, -86.3], [23.8, -86.0], [24.3, -85.5], [25.0, -84.8],
  [25.8, -84.0], [26.5, -83.3], [27.0, -82.9], [27.2, -82.8],
  [27.5, -82.2], [27.8, -81.5], [28.2, -80.8], [28.5, -80.0],
  [29.0, -78.5], [29.5, -76.3],
];

// Cone of uncertainty — wider polygon around the track near FL
const MILTON_CONE: [number, number][] = [
  [25.5, -84.7], [26.0, -84.0], [26.6, -83.6], [27.1, -83.3],
  [27.5, -83.0], [27.8, -82.6], [28.3, -81.3], [28.8, -80.3],
  // return path (wider)
  [28.6, -79.5], [28.0, -80.5], [27.4, -81.4], [27.0, -82.3],
  [26.4, -82.8], [25.8, -83.5], [25.2, -84.2], [25.5, -84.7],
];

// Storm eye position (landfall)
const MILTON_EYE: [number, number] = [27.2, -82.8];

// Evacuation zones removed — replaced by dynamic incident hotspots

type TrafficLevel = "clear" | "moderate" | "heavy" | "gridlock";

const trafficColor: Record<TrafficLevel, string> = {
  clear: "#22c55e",
  moderate: "#f59e0b",
  heavy: "#ef4444",
  gridlock: "#991b1b",
};

// Fake traffic — assign based on route distance + randomized seed from coordinates
function fakeTraffic(from: [number, number], to: [number, number]): TrafficLevel {
  const dist = Math.sqrt(Math.pow(to[0] - from[0], 2) + Math.pow(to[1] - from[1], 2));
  // Use coordinate hash for deterministic "randomness"
  const seed = Math.abs(Math.sin(from[0] * 1000 + to[1] * 2000)) * 10;
  // Shorter routes through downtown = heavier traffic
  if (dist < 0.04 && seed < 4) return "gridlock";
  if (dist < 0.06 && seed < 6) return "heavy";
  if (seed < 3) return "heavy";
  if (seed < 6) return "moderate";
  return "clear";
}

// Decode Google polyline encoding (used by Valhalla)
function decodePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  while (index < encoded.length) {
    let b: number;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;
    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;
    points.push([lat / 1e6, lng / 1e6]);
  }
  return points;
}

// Valhalla routing (OSRM is down) with cache
const routeCache = new Map<string, [number, number][]>();

async function getRoute(
  from: [number, number],
  to: [number, number]
): Promise<[number, number][]> {
  const key = `${from[0].toFixed(4)},${from[1].toFixed(4)}-${to[0].toFixed(4)},${to[1].toFixed(4)}`;
  if (routeCache.has(key)) return routeCache.get(key)!;
  // Try multiple routing providers (OSRM first — has CORS support from browsers)
  const providers = [
    // OSRM (1 req/sec limit, but fine for 3 routes)
    async () => {
      const url = `https://router.project-osrm.org/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      if (!data.routes?.[0]?.geometry?.coordinates) throw new Error("no route");
      return data.routes[0].geometry.coordinates.map((c: [number, number]) => [c[1], c[0]] as [number, number]);
    },
    // Valhalla backup (may have CORS issues from localhost)
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
      if (path.length > 2) {
        routeCache.set(key, path);
        return path;
      }
    } catch {
      continue;
    }
  }
  // All providers failed — straight line fallback
  return [from, to];
}

interface LocalSearchItem {
  label: string;
  sub: string;
  type: "zone" | "shelter" | "incident";
  lat: number;
  lng: number;
  zoom: number;
}

interface PlaceResult {
  label: string;
  sub: string;
  lat: number;
  lng: number;
}

async function nominatimSearch(q: string): Promise<PlaceResult[]> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&addressdetails=1`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Aegis-HackUSF2026" },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.map(
      (r: { display_name: string; lat: string; lon: string }) => ({
        label: r.display_name.split(",")[0],
        sub: r.display_name.split(",").slice(1, 3).join(",").trim(),
        lat: parseFloat(r.lat),
        lng: parseFloat(r.lon),
      })
    );
  } catch {
    return [];
  }
}

function useAddressSearch(query: string) {
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 3) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      const r = await nominatimSearch(query);
      setResults(r);
      setLoading(false);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  return { results, loading };
}

function FlyTo({ lat, lng, zoom }: { lat: number; lng: number; zoom: number }) {
  const map = useMap();
  map.flyTo([lat, lng], zoom, { duration: 0.8 });
  return null;
}

// Captures the map instance for use outside MapContainer
function MapCapture({ onMap }: { onMap: (map: L.Map) => void }) {
  const map = useMap();
  useEffect(() => { onMap(map); }, [map, onMap]);
  return null;
}

interface ShelterRouteData {
  path: [number, number][];
  shelterName: string;
  traffic: "clear" | "moderate" | "heavy" | "gridlock";
}

interface MapViewProps {
  risks: RiskAssessment[];
  resources: ResourceResponse[];
  incidents: IncidentResponse[];
  shelterRoutes?: ShelterRouteData[];
  userLocation?: { lat: number; lng: number } | null;
  onUserLocation?: (loc: { lat: number; lng: number } | null) => void;
}

export default function MapView({ risks, resources, incidents, shelterRoutes: externalRoutes, userLocation: externalUserLoc, onUserLocation }: MapViewProps) {
  const [query, setQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [tileStyle, setTileStyle] = useState<TileStyle>("dark");
  const [flyTarget, setFlyTarget] = useState<{
    lat: number;
    lng: number;
    zoom: number;
  } | null>(null);
  const [addressPin, setAddressPin] = useState<{
    lat: number;
    lng: number;
    label?: string;
  } | null>(null);
  const [internalUserLoc, setInternalUserLoc] = useState<{
    lat: number;
    lng: number;
    accuracy: number;
  } | null>(null);
  const userLocation = externalUserLoc
    ? { ...externalUserLoc, accuracy: 50 }
    : internalUserLoc;
  const setUserLocation = (loc: { lat: number; lng: number; accuracy: number }) => {
    setInternalUserLoc(loc);
    onUserLocation?.({ lat: loc.lat, lng: loc.lng });
  };
  const [locating, setLocating] = useState(false);
  const [showStylePicker, setShowStylePicker] = useState(false);
  const [showHurricaneTrack, setShowHurricaneTrack] = useState(true);
  const [showHotspots, setShowHotspots] = useState(true);
  const [showShelterRoutes, setShowShelterRoutes] = useState(true);
  const shelterRoutes = externalRoutes ?? [];
  const [simRunning, setSimRunning] = useState(false);
  const [simSpeed, setSimSpeed] = useState(60); // seconds for full sim
  const [simProgress, setSimProgress] = useState(0);
  const renderStaticTrack = showHurricaneTrack && !simRunning;

  // Compute incident hotspots — cluster nearby incidents into heat zones
  const hotspots = useMemo(() => {
    const activeIncidents = incidents.filter((i) => !i.resolved && i.lat && i.lng);
    if (activeIncidents.length === 0) return [];

    // Simple clustering: group incidents within ~0.02 degrees (~2km)
    const clusters: { lat: number; lng: number; count: number; severity: number; types: string[] }[] = [];
    const used = new Set<number>();

    for (let i = 0; i < activeIncidents.length; i++) {
      if (used.has(i)) continue;
      const inc = activeIncidents[i];
      const cluster = {
        lat: inc.lat,
        lng: inc.lng,
        count: 1,
        severity: inc.severity_score ?? 50,
        types: [inc.incident_type],
      };
      used.add(i);

      for (let j = i + 1; j < activeIncidents.length; j++) {
        if (used.has(j)) continue;
        const other = activeIncidents[j];
        const dist = Math.sqrt(Math.pow(other.lat - inc.lat, 2) + Math.pow(other.lng - inc.lng, 2));
        if (dist < 0.02) {
          cluster.lat = (cluster.lat * cluster.count + other.lat) / (cluster.count + 1);
          cluster.lng = (cluster.lng * cluster.count + other.lng) / (cluster.count + 1);
          cluster.count++;
          cluster.severity = Math.max(cluster.severity, other.severity_score ?? 50);
          if (!cluster.types.includes(other.incident_type)) {
            cluster.types.push(other.incident_type);
          }
          used.add(j);
        }
      }
      clusters.push(cluster);
    }
    return clusters;
  }, [incidents]);
  const inputRef = useRef<HTMLInputElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const { results: addressResults, loading: addressLoading } =
    useAddressSearch(query);

  const localItems = useMemo<LocalSearchItem[]>(() => {
    const items: LocalSearchItem[] = [];
    risks.forEach((z) =>
      items.push({
        label: z.neighborhood,
        sub: `Zone ${z.zone ?? "—"} · ${recommendationLabel(z.recommendation)}`,
        type: "zone",
        lat: z.lat,
        lng: z.lng,
        zoom: 14,
      })
    );
    resources
      .filter((r) => r.type === "shelter")
      .forEach((s) =>
        items.push({
          label: s.name,
          sub: s.address ?? "Shelter",
          type: "shelter",
          lat: s.lat,
          lng: s.lng,
          zoom: 16,
        })
      );
    incidents
      .filter((i) => !i.resolved)
      .forEach((i) =>
        items.push({
          label: i.incident_type,
          sub: i.location_text ?? "Incident",
          type: "incident",
          lat: i.lat,
          lng: i.lng,
          zoom: 16,
        })
      );
    return items;
  }, [risks, resources, incidents]);

  const localFiltered = query.trim()
    ? localItems.filter(
        (item) =>
          item.label.toLowerCase().includes(query.toLowerCase()) ||
          item.sub.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  const hasResults = localFiltered.length > 0 || addressResults.length > 0;

  const handleSelectLocal = (item: LocalSearchItem) => {
    setFlyTarget({ lat: item.lat, lng: item.lng, zoom: item.zoom });
    setAddressPin(null);
    setQuery("");
    setShowDropdown(false);
    inputRef.current?.blur();
  };

  const handleSelectAddress = (place: PlaceResult) => {
    setFlyTarget({ lat: place.lat, lng: place.lng, zoom: 17 });
    setAddressPin({ lat: place.lat, lng: place.lng, label: place.label });
    setQuery("");
    setShowDropdown(false);
    inputRef.current?.blur();
  };

  // Auto-locate handled by dashboard context

  const handleLocateMe = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        };
        setUserLocation(loc);
        setFlyTarget({ lat: loc.lat, lng: loc.lng, zoom: 15 });
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Routes come from dashboard context — no internal computation needed

  const handleResetView = () => {
    setFlyTarget({ lat: TAMPA_CENTER[0], lng: TAMPA_CENTER[1], zoom: 12 });
  };

  const handleFindShelter = () => {
    if (!userLocation) {
      handleLocateMe();
      return;
    }
    // Routes already computed — just fit map to show them
    if (shelterRoutes.length > 0 && mapRef.current) {
      const allPoints = shelterRoutes.flatMap((r) => r.path);
      if (allPoints.length > 1) {
        const bounds = L.latLngBounds(allPoints.map((p) => L.latLng(p[0], p[1])));
        mapRef.current.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  };

  const isDark = tileStyle === "dark";
  const typeColor: Record<string, string> = {
    zone: "bg-blue-50 text-blue-700",
    shelter: "bg-emerald-50 text-emerald-700",
    incident: "bg-orange-50 text-orange-700",
  };

  const currentTile = TILE_STYLES[tileStyle];

  return (
    <div className="relative h-full w-full">
      {/* Search bar */}
      <div className="absolute top-4 left-4 z-[1000] w-80">
        <div className="relative">
          <svg
            style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", width: 16, height: 16, zIndex: 1 }}
            xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="rgb(155,155,155)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
            placeholder="Search address, shelter, area..."
            className="w-full pl-10 pr-8 py-2.5 bg-surface/95 backdrop-blur-sm rounded-xl border border-border text-sm text-foreground placeholder:text-foreground-muted outline-none focus:border-foreground/30 shadow-sm"
          />
          {addressLoading && (
            <Icon
              icon={icons.loader}
              className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-foreground-secondary animate-spin"
            />
          )}
          {!addressLoading && query && (
            <button
              onClick={() => {
                setQuery("");
                setShowDropdown(false);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <Icon
                icon={icons.close}
                className="h-3.5 w-3.5 text-foreground-secondary"
              />
            </button>
          )}
        </div>

        {showDropdown && query.trim().length >= 2 && (
          <div className="mt-1.5 bg-surface/95 backdrop-blur-sm rounded-xl border border-border shadow-sm overflow-hidden max-h-72 overflow-y-auto">
            {localFiltered.length > 0 && (
              <>
                <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-foreground-secondary/50 bg-surface border-b border-border/40">
                  Aegis data
                </div>
                {localFiltered.map((item, i) => (
                  <button
                    key={`local-${i}`}
                    onClick={() => handleSelectLocal(item)}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-surface/50 transition-colors flex items-center justify-between gap-2 border-b border-border/40"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-foreground truncate">
                        {item.label}
                      </p>
                      <p className="text-[10px] text-foreground-secondary truncate">
                        {item.sub}
                      </p>
                    </div>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-md shrink-0 ${typeColor[item.type] ?? ""}`}
                    >
                      {item.type}
                    </span>
                  </button>
                ))}
              </>
            )}

            {addressResults.length > 0 && (
              <>
                <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-foreground-secondary/50 bg-surface border-b border-border/40">
                  Places
                </div>
                {addressResults.map((place, i) => (
                  <button
                    key={`addr-${place.lat}-${place.lng}-${i}`}
                    onClick={() => handleSelectAddress(place)}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-surface/50 transition-colors flex items-center gap-2.5 border-b border-border/40 last:border-0"
                  >
                    <Icon
                      icon={icons.mapPin}
                      className="h-3.5 w-3.5 text-foreground-secondary shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-sm text-foreground truncate">
                        {place.label}
                      </p>
                      <p className="text-[10px] text-foreground-secondary truncate">
                        {place.sub}
                      </p>
                    </div>
                  </button>
                ))}
              </>
            )}

            {!hasResults && !addressLoading && (
              <div className="px-3.5 py-3 text-center">
                <p className="text-xs text-foreground-secondary">No results</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right controls — zoom, fullscreen, map style */}
      <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2 items-end">
        {/* Legend + Layer toggles */}
        <div className="bg-surface/95 backdrop-blur-sm rounded-xl border border-border p-3 shadow-sm w-44">
          <p className="text-[8px] font-mono font-bold text-foreground-muted uppercase tracking-widest mb-2">Layers</p>
          <div className="space-y-1">
            {[
              { key: "track", label: "Storm Track", color: "#a855f6", active: showHurricaneTrack, toggle: () => setShowHurricaneTrack(!showHurricaneTrack) },
              { key: "hotspots", label: "Hotspots", color: "#ef4444", active: showHotspots, toggle: () => setShowHotspots(!showHotspots) },
              { key: "routes", label: "Routes", color: "#22c55e", active: showShelterRoutes, toggle: () => setShowShelterRoutes(!showShelterRoutes) },
            ].map((layer) => (
              <button
                key={layer.key}
                onClick={layer.toggle}
                className={`flex items-center gap-2 w-full text-left px-1 py-0.5 rounded transition-opacity ${layer.active ? "opacity-100" : "opacity-40"}`}
              >
                <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: layer.color }} />
                <span className="text-[10px] text-foreground-secondary">{layer.label}</span>
              </button>
            ))}
          </div>

          <p className="text-[8px] font-mono font-bold text-foreground-muted uppercase tracking-widest mt-3 mb-1.5">Hotspots</p>
          <div className="space-y-1">
            <div className="flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-[#ef4444]" /><span className="text-[9px] text-foreground-muted">Critical (80+)</span></div>
            <div className="flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-[#f59e0b]" /><span className="text-[9px] text-foreground-muted">Active (50-79)</span></div>
            <div className="flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-[#3b82f6]" /><span className="text-[9px] text-foreground-muted">Low (&lt;50)</span></div>
          </div>

          <p className="text-[8px] font-mono font-bold text-foreground-muted uppercase tracking-widest mt-3 mb-1.5">Traffic</p>
          <div className="space-y-1">
            <div className="flex items-center gap-2"><div className="h-1.5 w-4 rounded-full bg-[#22c55e]" /><span className="text-[9px] text-foreground-muted">Clear</span></div>
            <div className="flex items-center gap-2"><div className="h-1.5 w-4 rounded-full bg-[#f59e0b]" /><span className="text-[9px] text-foreground-muted">Moderate</span></div>
            <div className="flex items-center gap-2"><div className="h-1.5 w-4 rounded-full bg-[#ef4444]" /><span className="text-[9px] text-foreground-muted">Heavy</span></div>
            <div className="flex items-center gap-2"><div className="h-1.5 w-4 rounded-full bg-[#991b1b]" /><span className="text-[9px] text-foreground-muted">Gridlock</span></div>
          </div>

          <p className="text-[8px] font-mono font-bold text-foreground-muted uppercase tracking-widest mt-3 mb-1.5">Markers</p>
          <div className="space-y-1">
            <div className="flex items-center gap-2"><div className="h-2 w-2 rounded bg-[#22c55e]" /><span className="text-[9px] text-foreground-muted">Shelter</span></div>
            <div className="flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-[#f97316]" /><span className="text-[9px] text-foreground-muted">Incident</span></div>
            <div className="flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-[#a855f6]" /><span className="text-[9px] text-foreground-muted">Storm Eye</span></div>
          </div>
        </div>

        {/* Map style picker */}
        <div className="relative">
          <button
            onClick={() => setShowStylePicker(!showStylePicker)}
            className="h-9 w-9 bg-surface/95 backdrop-blur-sm rounded-xl border border-border shadow-sm flex items-center justify-center hover:bg-surface transition-colors"
            title="Map style"
          >
            <Icon icon="ph:stack-bold" className="h-3.5 w-3.5 text-foreground" />
          </button>
          {showStylePicker && (
            <div className="absolute top-0 right-11 bg-surface/95 backdrop-blur-sm rounded-xl border border-border shadow-sm overflow-hidden">
              {(Object.keys(TILE_STYLES) as TileStyle[]).map((key) => (
                <button
                  key={key}
                  onClick={() => {
                    setTileStyle(key);
                    setShowStylePicker(false);
                  }}
                  className={`w-full text-left px-3.5 py-2 text-xs transition-colors border-b border-border/40 last:border-0 whitespace-nowrap ${
                    tileStyle === key
                      ? "bg-surface text-foreground font-medium"
                      : "text-foreground-secondary hover:bg-surface/50"
                  }`}
                >
                  {TILE_STYLES[key].label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Left controls — locate, reset */}
      <div className="absolute bottom-6 left-4 z-[1000] flex flex-col gap-2">
        <button
          onClick={handleLocateMe}
          disabled={locating}
          className="h-10 w-10 bg-surface/95 backdrop-blur-sm rounded-xl border border-border shadow-sm flex items-center justify-center hover:bg-surface transition-colors disabled:opacity-50"
          title="My location"
        >
          {locating ? (
            <Icon
              icon={icons.loader}
              className="h-4 w-4 text-foreground-secondary animate-spin"
            />
          ) : (
            <Icon
              icon={icons.navigation}
              className="h-4 w-4 text-foreground"
            />
          )}
        </button>
        <button
          onClick={handleResetView}
          className="h-10 w-10 bg-surface/95 backdrop-blur-sm rounded-xl border border-border shadow-sm flex items-center justify-center hover:bg-surface transition-colors"
          title="Reset to Tampa Bay"
        >
          <Icon icon={icons.compass} className="h-4 w-4 text-foreground" />
        </button>
        {/* Simulation play button */}
        <button
          onClick={() => {
            if (simRunning) {
              setSimRunning(false);
              setSimProgress(0);
            } else {
              setSimProgress(0);
              setSimRunning(true);
            }
          }}
          className={`h-10 w-10 backdrop-blur-sm rounded-xl shadow-sm flex items-center justify-center transition-colors ${
            simRunning
              ? "bg-destructive/90 hover:bg-destructive"
              : "bg-accent/90 hover:bg-accent"
          }`}
          title={simRunning ? "Stop simulation" : "Play Hurricane Milton simulation"}
        >
          <Icon
            icon={simRunning ? "ph:stop-bold" : "ph:play-bold"}
            className="h-4 w-4 text-white"
          />
        </button>
      </div>

      <MapContainer
        center={TAMPA_CENTER}
        zoom={12}
        className="h-full w-full"
        zoomControl={false}
      >
        <TileLayer
          key={tileStyle}
          attribution={currentTile.attribution}
          url={currentTile.url}
        />
        <ScaleControl position="bottomright" imperial metric />

        {flyTarget && (
          <FlyTo
            lat={flyTarget.lat}
            lng={flyTarget.lng}
            zoom={flyTarget.zoom}
          />
        )}

        {/* Address pin */}
        {addressPin && (
          <Marker position={[addressPin.lat, addressPin.lng]}>
            <Popup>
              <p className="text-xs font-medium">
                {addressPin.label ?? "Searched location"}
              </p>
            </Popup>
          </Marker>
        )}

        {/* User location */}
        {userLocation && (
          <>
            <Marker
              position={[userLocation.lat, userLocation.lng]}
              icon={L.divIcon({
                className: "",
                iconSize: [32, 32],
                iconAnchor: [16, 16],
                html: `<div style="width:32px;height:32px;display:flex;align-items:center;justify-content:center;">
                  <div style="width:20px;height:20px;background:#3b82f6;border:3px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(59,130,246,0.4);position:relative;">
                    <div style="position:absolute;top:-8px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-bottom:8px solid #3b82f6;"></div>
                  </div>
                </div>`,
              })}
            >
              <Popup>
                <p className="text-xs font-medium">Your location</p>
              </Popup>
            </Marker>
            <Circle
              center={[userLocation.lat, userLocation.lng]}
              radius={userLocation.accuracy}
              pathOptions={{
                color: "#3b82f6",
                fillColor: "#3b82f6",
                fillOpacity: 0.08,
                weight: 1,
              }}
            />
          </>
        )}

        {/* Neighborhood risk markers — small dots with info */}
        {risks.map((zone) => (
          <Marker
            key={zone.neighborhood}
            position={[zone.lat, zone.lng]}
            icon={L.divIcon({
              className: "",
              iconSize: [8, 8],
              iconAnchor: [4, 4],
              html: `<div style="width:8px;height:8px;border-radius:50%;background:${riskColor(zone.flood_risk)};opacity:0.6;border:1px solid ${riskColor(zone.flood_risk)};"></div>`,
            })}
          >
            <Popup>
              <div className="text-xs">
                <p className="font-semibold">{zone.neighborhood}</p>
                <p>Flood risk: {Math.round(zone.flood_risk * 100)}%</p>
                <p>Storm surge: {zone.storm_surge_ft} ft</p>
                <p>Recommendation: {recommendationLabel(zone.recommendation)}</p>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* (Shelters rendered in new layers section with improved markers) */}

        {/* Incidents */}
        {incidents
          .filter((i) => !i.resolved)
          .map((incident) => (
            <CircleMarker
              key={`incident-${incident.id}`}
              center={[incident.lat, incident.lng]}
              radius={6}
              pathOptions={{
                color: "#f97316",
                fillColor: "#f97316",
                fillOpacity: 0.8,
                weight: 2,
              }}
            >
              <Popup>
                <div className="text-xs">
                  <p className="font-semibold">{incident.incident_type}</p>
                  <p>{incident.location_text}</p>
                  {incident.severity_label && (
                    <p>Severity: {incident.severity_label}</p>
                  )}
                  {incident.recommended_action && (
                    <p>Action: {incident.recommended_action}</p>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          ))}
        {/* === NEW LAYERS === */}

        {/* Hurricane Milton — cone of uncertainty + track + eye */}
        {renderStaticTrack && (
          <>
            {/* Cone of uncertainty — translucent polygon */}
            <Polygon
              positions={MILTON_CONE}
              pathOptions={{
                color: "#a855f6",
                fillColor: "#a855f6",
                fillOpacity: 0.06,
                weight: 1,
                dashArray: "4 4",
                opacity: 0.4,
              }}
            />
            {/* Center track line */}
            <Polyline
              positions={MILTON_TRACK}
              pathOptions={{
                color: "#a855f6",
                weight: 2.5,
                opacity: 0.8,
              }}
            />
            {/* Track dots — advisory positions */}
            {MILTON_TRACK.filter((_, i) => i % 2 === 0).map((pos, i) => (
              <CircleMarker
                key={`track-${i}`}
                center={pos}
                radius={3}
                pathOptions={{ color: "#a855f6", fillColor: "#a855f6", fillOpacity: 0.8, weight: 0 }}
              />
            ))}
            {/* Storm eye at landfall — pulsing hurricane symbol */}
            <Marker
              position={MILTON_EYE}
              icon={L.divIcon({
                className: "",
                iconSize: [40, 40],
                iconAnchor: [20, 20],
                html: `<div style="width:40px;height:40px;display:flex;align-items:center;justify-content:center;">
                  <div style="position:absolute;width:36px;height:36px;border-radius:50%;border:2px solid rgba(168,85,246,0.5);animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>
                  <div style="width:20px;height:20px;border-radius:50%;background:rgba(168,85,246,0.3);border:2px solid #a855f6;display:flex;align-items:center;justify-content:center;">
                    <div style="width:6px;height:6px;border-radius:50%;background:#a855f6;"></div>
                  </div>
                </div>`,
              })}
            >
              <Popup>
                <div className="text-xs">
                  <p className="font-bold">Hurricane Milton</p>
                  <p className="font-semibold">Category 3 at Landfall</p>
                  <p>Oct 9, 2024 — 8:00 PM EDT</p>
                  <p>Siesta Key, FL</p>
                  <p>Max winds: 120 mph</p>
                  <p>Min pressure: 950 mb</p>
                </div>
              </Popup>
            </Marker>
          </>
        )}

        {/* Incident hotspots — dynamic zones based on report density */}
        {showHotspots && hotspots.map((spot, i) => {
          const isCritical = spot.severity >= 80;
          const color = isCritical ? "#ef4444" : spot.severity >= 50 ? "#f59e0b" : "#3b82f6";
          // Radius scales with incident count (min 500m, max 3km)
          const radius = Math.min(500 + spot.count * 600, 3000);
          return (
            <Circle
              key={`hotspot-${i}`}
              center={[spot.lat, spot.lng]}
              radius={radius}
              pathOptions={{
                color,
                fillColor: color,
                fillOpacity: 0.10 + spot.count * 0.03,
                weight: 1.5,
                opacity: 0.5,
              }}
            >
              <Popup>
                <div className="text-xs">
                  <p className="font-bold" style={{ color }}>
                    {isCritical ? "CRITICAL ZONE" : "ACTIVE ZONE"} — {spot.count} report{spot.count > 1 ? "s" : ""}
                  </p>
                  <p>Types: {spot.types.map((t) => t.replace(/_/g, " ")).join(", ")}</p>
                  <p>Max severity: {spot.severity}/100</p>
                  {isCritical && <p className="font-bold mt-1" style={{ color: "#ef4444" }}>⚠ Immediate assistance needed</p>}
                </div>
              </Popup>
            </Circle>
          );
        })}

        {/* Routes to shelters — color escalates during simulation */}
        {showShelterRoutes && shelterRoutes.map((route, i) => {
          // During simulation, traffic worsens as storm approaches
          let effectiveTraffic = route.traffic;
          if (simRunning && simProgress > 0) {
            if (simProgress > 0.6) {
              // Landfall — almost everything gridlocked
              effectiveTraffic = route.traffic === "clear" ? "heavy" : "gridlock";
            } else if (simProgress > 0.45) {
              // Approaching — traffic worsening
              effectiveTraffic = route.traffic === "clear" ? "moderate" : route.traffic === "moderate" ? "heavy" : "gridlock";
            } else if (simProgress > 0.3) {
              // Evacuation starting — clear routes become moderate
              effectiveTraffic = route.traffic === "clear" ? "moderate" : "heavy";
            }
          }
          return (
            <Polyline
              key={`shelter-route-${i}`}
              positions={route.path}
              pathOptions={{
                color: trafficColor[effectiveTraffic],
                weight: effectiveTraffic === "gridlock" ? 5 : 4,
                opacity: 0.8,
                lineCap: "round",
                lineJoin: "round",
              }}
            >
              <Popup>
                <div className="text-xs">
                  <p className="font-semibold">→ {route.shelterName}</p>
                  <p>Traffic: <span style={{ color: trafficColor[effectiveTraffic], fontWeight: 600 }}>{effectiveTraffic.toUpperCase()}</span></p>
                  {simRunning && simProgress > 0.45 && <p className="text-red-400 mt-1">⚠ Evacuate now</p>}
                </div>
              </Popup>
            </Polyline>
          );
        })}

        {/* Shelter markers — improved with labels */}
        {resources
          .filter((r) => r.type === "shelter")
          .map((shelter) => {
            const pct = shelter.capacity
              ? Math.round((shelter.current_occupancy / shelter.capacity) * 100)
              : 0;
            const spotsLeft = (shelter.capacity ?? 0) - shelter.current_occupancy;
            const markerColor = spotsLeft <= 0 ? "#ef4444" : pct > 80 ? "#f59e0b" : "#22c55e";
            return (
              <Marker
                key={`shelter-label-${shelter.id}`}
                position={[shelter.lat, shelter.lng]}
                icon={L.divIcon({
                  className: "",
                  iconSize: [24, 24],
                  iconAnchor: [12, 12],
                  html: `<div style="width:24px;height:24px;border-radius:6px;background:${markerColor};border:2px solid rgba(255,255,255,0.3);display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.3);">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                  </div>`,
                })}
              >
                <Popup>
                  <div className="text-xs">
                    <p className="font-semibold">{shelter.name}</p>
                    <p>{shelter.address}</p>
                    <p>Capacity: {shelter.current_occupancy}/{shelter.capacity ?? "?"} ({pct}%)</p>
                    <p>Available: <span style={{ color: markerColor, fontWeight: 600 }}>{spotsLeft > 0 ? `${spotsLeft} spots` : "FULL"}</span></p>
                    <p>Status: {shelter.status}</p>
                  </div>
                </Popup>
              </Marker>
            );
          })}

        {/* Hurricane simulation overlay */}
        <MapSimulation running={simRunning} speed={simSpeed} onProgress={setSimProgress} />

        <MapCapture onMap={(m) => { mapRef.current = m; }} />
      </MapContainer>

      {/* Right bottom — zoom + fullscreen (outside MapContainer, using mapRef) */}
      <div className="absolute bottom-6 right-4 z-[1000] flex flex-col gap-2">
        <div className="flex flex-col gap-0 rounded-xl overflow-hidden border border-border shadow-sm">
          <button
            onClick={() => mapRef.current?.zoomIn()}
            className="h-9 w-9 bg-surface/95 backdrop-blur-sm flex items-center justify-center hover:bg-surface transition-colors border-b border-border"
            title="Zoom in"
          >
            <Icon icon="ph:plus-bold" className="h-3.5 w-3.5 text-foreground" />
          </button>
          <button
            onClick={() => mapRef.current?.zoomOut()}
            className="h-9 w-9 bg-surface/95 backdrop-blur-sm flex items-center justify-center hover:bg-surface transition-colors"
            title="Zoom out"
          >
            <Icon icon="ph:minus-bold" className="h-3.5 w-3.5 text-foreground" />
          </button>
        </div>
        <button
          onClick={() => {
            const container = mapRef.current?.getContainer();
            if (!container) return;
            if (!document.fullscreenElement) {
              container.requestFullscreen?.();
            } else {
              document.exitFullscreen?.();
            }
          }}
          className="h-9 w-9 bg-surface/95 backdrop-blur-sm rounded-xl border border-border shadow-sm flex items-center justify-center hover:bg-surface transition-colors"
          title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
        >
          <Icon
            icon={isFullscreen ? "ph:corners-in-bold" : "ph:corners-out-bold"}
            className="h-3.5 w-3.5 text-foreground"
          />
        </button>
      </div>

      {/* Simulation progress bar — outside MapContainer so it renders correctly */}
      {simRunning && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000] bg-surface/95 backdrop-blur-sm border border-border rounded-xl px-4 py-2.5 flex items-center gap-3">
          <div className="w-52 h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.max(simProgress * 100, 0.5)}%`,
                backgroundColor: simProgress > 0.5 ? "#ef4444" : "#a855f6",
              }}
            />
          </div>
          <span className="text-[9px] font-mono font-bold whitespace-nowrap" style={{ color: simProgress > 0.5 ? "#ef4444" : "#a855f6" }}>
            {simProgress < 0.3 ? "CAT 5" : simProgress < 0.5 ? "APPROACHING" : simProgress < 0.65 ? "LANDFALL" : simProgress < 0.85 ? "CROSSING FL" : "POST-STORM"}
          </span>
          <span className="text-[9px] font-mono text-foreground-muted">
            {Math.round(simProgress * 100)}%
          </span>
        </div>
      )}
    </div>
  );
}
