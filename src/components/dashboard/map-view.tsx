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

// Evacuation zone polygons — simplified, fewer zones
const EVACUATION_ZONES: { zone: string; center: [number, number]; radius: number; color: string }[] = [
  { zone: "A", center: [27.916, -82.477], radius: 3500, color: "#ef4444" },  // South Tampa / Davis Islands combined
  { zone: "A", center: [27.722, -82.431], radius: 2500, color: "#ef4444" },  // Ruskin
  { zone: "B", center: [27.950, -82.460], radius: 3000, color: "#f59e0b" },  // Central Tampa
  { zone: "B", center: [27.863, -82.324], radius: 2500, color: "#f59e0b" },  // Riverview
];

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

// OSRM routing — returns road-following coordinates
async function getRoute(
  from: [number, number],
  to: [number, number]
): Promise<[number, number][]> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.routes?.[0]?.geometry?.coordinates) {
      return data.routes[0].geometry.coordinates.map(
        (c: [number, number]) => [c[1], c[0]] as [number, number]
      );
    }
  } catch {}
  // Fallback: straight line
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

interface MapViewProps {
  risks: RiskAssessment[];
  resources: ResourceResponse[];
  incidents: IncidentResponse[];
}

export default function MapView({ risks, resources, incidents }: MapViewProps) {
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
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
    accuracy: number;
  } | null>(null);
  const [locating, setLocating] = useState(false);
  const [showStylePicker, setShowStylePicker] = useState(false);
  const [showHurricaneTrack, setShowHurricaneTrack] = useState(true);
  const [showEvacZones, setShowEvacZones] = useState(true);
  const [showShelterRoutes, setShowShelterRoutes] = useState(true);
  const [shelterRoute, setShelterRoute] = useState<[number, number][] | null>(null);
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

  // Auto-locate on first load — show marker but don't pan away from Tampa
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

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

  // Compute routed paths from each zone to nearest shelter
  const [shelterRoutes, setShelterRoutes] = useState<
    { path: [number, number][]; shelterName: string; zone: string; traffic: TrafficLevel }[]
  >([]);

  useEffect(() => {
    const openShelters = resources.filter((r) => r.type === "shelter" && r.status === "open");
    if (openShelters.length === 0) return;

    let cancelled = false;
    const computeRoutes = async () => {
      const allRoutes: { path: [number, number][]; shelterName: string; zone: string; traffic: TrafficLevel }[] = [];
      for (const zone of EVACUATION_ZONES) {
        for (let i = 0; i < openShelters.length; i += 4) {
          if (cancelled) return;
          const batch = openShelters.slice(i, i + 4);
          const results = await Promise.all(
            batch.map(async (shelter) => {
              const dest: [number, number] = [shelter.lat, shelter.lng];
              const path = await getRoute(zone.center, dest);
              const traffic = fakeTraffic(zone.center, dest);
              return { path, shelterName: shelter.name, zone: zone.zone, traffic };
            })
          );
          allRoutes.push(...results);
          if (!cancelled) setShelterRoutes([...allRoutes]);
        }
      }
    };
    computeRoutes();
    return () => { cancelled = true; };
  }, [resources]);

  const handleResetView = () => {
    setFlyTarget({ lat: TAMPA_CENTER[0], lng: TAMPA_CENTER[1], zoom: 12 });
  };

  const handleFindShelter = async () => {
    if (!userLocation) {
      handleLocateMe();
      return;
    }
    const shelters = resources.filter((r) => r.type === "shelter" && r.status === "open");
    if (shelters.length === 0) return;
    let nearest = shelters[0];
    let minDist = Infinity;
    for (const s of shelters) {
      const d = Math.pow(s.lat - userLocation.lat, 2) + Math.pow(s.lng - userLocation.lng, 2);
      if (d < minDist) { minDist = d; nearest = s; }
    }
    const path = await getRoute(
      [userLocation.lat, userLocation.lng],
      [nearest.lat, nearest.lng]
    );
    setShelterRoute(path);
    // Fit map to show full route
    if (mapRef.current && path.length > 1) {
      const bounds = L.latLngBounds(path.map((p) => L.latLng(p[0], p[1])));
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
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
          <Icon
            icon={icons.search}
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-secondary"
          />
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
            className="w-full pl-9 pr-8 py-2.5 bg-surface/95 backdrop-blur-sm rounded-xl border border-border text-sm text-foreground placeholder:text-foreground-secondary/50 outline-none focus:border-foreground/30 shadow-sm"
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
        <div className="bg-surface/95 backdrop-blur-sm rounded-xl border border-border p-3 shadow-sm w-48">
          <p className="text-[9px] font-mono font-bold text-foreground-muted uppercase tracking-widest mb-2">Layers</p>
          <div className="space-y-1.5">
            {[
              { key: "track", label: "Hurricane Track", color: "#a855f6", active: showHurricaneTrack, toggle: () => setShowHurricaneTrack(!showHurricaneTrack) },
              { key: "evac", label: "Evacuation Zones", color: "#ef4444", active: showEvacZones, toggle: () => setShowEvacZones(!showEvacZones) },
              { key: "routes", label: "Shelter Routes", color: "#f59e0b", active: showShelterRoutes, toggle: () => setShowShelterRoutes(!showShelterRoutes) },
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
          <div className="mt-2 pt-2 border-t border-border/60 space-y-1.5">
            {[
              { color: "#ef4444", label: "Zone A — Evacuate" },
              { color: "#f59e0b", label: "Zone B — Shelter" },
              { color: "#22c55e", label: "Clear Route / Shelter" },
              { color: "#f59e0b", label: "Moderate Traffic" },
              { color: "#ef4444", label: "Heavy Traffic" },
              { color: "#991b1b", label: "Gridlock" },
              { color: "#f97316", label: "Incident" },
              { color: "#a855f6", label: "Storm Path / Cone" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-[9px] text-foreground-muted">{item.label}</span>
              </div>
            ))}
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
        <button
          onClick={handleFindShelter}
          className="h-10 w-10 bg-emerald-600/90 backdrop-blur-sm rounded-xl shadow-sm flex items-center justify-center hover:bg-emerald-500 transition-colors"
          title="Find nearest shelter"
        >
          <Icon icon={icons.firstAid} className="h-4 w-4 text-white" />
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

        {/* Risk zones */}
        {risks.map((zone) => (
          <CircleMarker
            key={zone.neighborhood}
            center={[zone.lat, zone.lng]}
            radius={zone.flood_risk * 30 + 10}
            pathOptions={{
              color: riskColor(zone.flood_risk),
              fillColor: riskColor(zone.flood_risk),
              fillOpacity: 0.2,
              weight: 1.5,
            }}
          >
            <Popup>
              <div className="text-xs">
                <p className="font-semibold">{zone.neighborhood}</p>
                <p>Flood risk: {Math.round(zone.flood_risk * 100)}%</p>
                <p>Storm surge: {zone.storm_surge_ft} ft</p>
                <p>
                  Recommendation: {recommendationLabel(zone.recommendation)}
                </p>
              </div>
            </Popup>
          </CircleMarker>
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
        {showHurricaneTrack && (
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

        {/* Evacuation zones */}
        {showEvacZones && EVACUATION_ZONES.map((zone, i) => (
          <Circle
            key={`evac-${i}`}
            center={zone.center}
            radius={zone.radius}
            pathOptions={{
              color: zone.color,
              fillColor: zone.color,
              fillOpacity: 0.08,
              weight: 1,
              opacity: 0.5,
              dashArray: zone.zone === "B" ? "6 4" : undefined,
            }}
          >
            <Popup>
              <div className="text-xs">
                <p className="font-semibold">Zone {zone.zone} — {zone.zone === "A" ? "Mandatory Evacuation" : "Evacuate if Advised"}</p>
              </div>
            </Popup>
          </Circle>
        ))}

        {/* Routed paths from evacuation zones to shelters — colored by traffic */}
        {showShelterRoutes && shelterRoutes.map((route, i) => (
          <Polyline
            key={`shelter-route-${i}`}
            positions={route.path}
            pathOptions={{
              color: trafficColor[route.traffic],
              weight: route.traffic === "gridlock" ? 4 : 3,
              opacity: route.traffic === "clear" ? 0.4 : 0.7,
              lineCap: "round",
              lineJoin: "round",
            }}
          >
            <Popup>
              <div className="text-xs">
                <p className="font-semibold">Zone {route.zone} → {route.shelterName}</p>
                <p>Traffic: <span style={{ color: trafficColor[route.traffic], fontWeight: 600 }}>{route.traffic.toUpperCase()}</span></p>
              </div>
            </Popup>
          </Polyline>
        ))}

        {/* Route to nearest shelter */}
        {shelterRoute && (
          <Polyline
            positions={shelterRoute}
            pathOptions={{
              color: "#22c55e",
              weight: 4,
              opacity: 0.8,
              dashArray: "10 8",
            }}
          />
        )}

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
    </div>
  );
}
