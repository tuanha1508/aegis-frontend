"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Circle,
  Marker,
  Popup,
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
  const [tileStyle, setTileStyle] = useState<TileStyle>("light");
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

  const handleResetView = () => {
    setFlyTarget({ lat: TAMPA_CENTER[0], lng: TAMPA_CENTER[1], zoom: 12 });
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
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B6B6B]"
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
            className="w-full pl-9 pr-8 py-2.5 bg-white/95 backdrop-blur-sm rounded-xl border border-[#E5E4E2] text-sm text-[#1A1A1A] placeholder:text-[#6B6B6B]/50 outline-none focus:border-[#1A1A1A]/30 shadow-sm"
          />
          {addressLoading && (
            <Icon
              icon={icons.loader}
              className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#6B6B6B] animate-spin"
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
                className="h-3.5 w-3.5 text-[#6B6B6B]"
              />
            </button>
          )}
        </div>

        {showDropdown && query.trim().length >= 2 && (
          <div className="mt-1.5 bg-white/95 backdrop-blur-sm rounded-xl border border-[#E5E4E2] shadow-sm overflow-hidden max-h-72 overflow-y-auto">
            {localFiltered.length > 0 && (
              <>
                <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-[#6B6B6B]/50 bg-[#FAFAF9] border-b border-[#E5E4E2]/40">
                  Aegis data
                </div>
                {localFiltered.map((item, i) => (
                  <button
                    key={`local-${i}`}
                    onClick={() => handleSelectLocal(item)}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-[#F0EFED]/50 transition-colors flex items-center justify-between gap-2 border-b border-[#E5E4E2]/40"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-[#1A1A1A] truncate">
                        {item.label}
                      </p>
                      <p className="text-[10px] text-[#6B6B6B] truncate">
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
                <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-[#6B6B6B]/50 bg-[#FAFAF9] border-b border-[#E5E4E2]/40">
                  Places
                </div>
                {addressResults.map((place, i) => (
                  <button
                    key={`addr-${place.lat}-${place.lng}-${i}`}
                    onClick={() => handleSelectAddress(place)}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-[#F0EFED]/50 transition-colors flex items-center gap-2.5 border-b border-[#E5E4E2]/40 last:border-0"
                  >
                    <Icon
                      icon={icons.mapPin}
                      className="h-3.5 w-3.5 text-[#6B6B6B] shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-sm text-[#1A1A1A] truncate">
                        {place.label}
                      </p>
                      <p className="text-[10px] text-[#6B6B6B] truncate">
                        {place.sub}
                      </p>
                    </div>
                  </button>
                ))}
              </>
            )}

            {!hasResults && !addressLoading && (
              <div className="px-3.5 py-3 text-center">
                <p className="text-xs text-[#6B6B6B]">No results</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right controls — zoom, fullscreen, map style */}
      <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2 items-end">
        {/* Legend */}
        <div className="bg-white/95 backdrop-blur-sm rounded-xl border border-[#E5E4E2] p-4 shadow-sm">
          <p className="text-xs font-medium text-[#1A1A1A] mb-2">
            Risk Level
          </p>
          <div className="space-y-1.5">
            {[
              { color: "#ef4444", label: "Critical (Evacuate)" },
              { color: "#f59e0b", label: "High (Shelter)" },
              { color: "#3b82f6", label: "Moderate" },
              { color: "#22c55e", label: "Low" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <div
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-[10px] text-[#6B6B6B]">
                  {item.label}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-2 border-t border-[#E5E4E2]/60 space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 bg-emerald-500 rounded-sm" />
              <span className="text-[10px] text-[#6B6B6B]">Shelter</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 bg-orange-500 rounded-sm" />
              <span className="text-[10px] text-[#6B6B6B]">Incident</span>
            </div>
          </div>
        </div>

        {/* Map style picker */}
        <div className="relative">
          <button
            onClick={() => setShowStylePicker(!showStylePicker)}
            className="h-9 w-9 bg-white/95 backdrop-blur-sm rounded-xl border border-[#E5E4E2] shadow-sm flex items-center justify-center hover:bg-[#F0EFED] transition-colors"
            title="Map style"
          >
            <Icon icon="ph:stack-bold" className="h-3.5 w-3.5 text-[#1A1A1A]" />
          </button>
          {showStylePicker && (
            <div className="absolute top-0 right-11 bg-white/95 backdrop-blur-sm rounded-xl border border-[#E5E4E2] shadow-sm overflow-hidden">
              {(Object.keys(TILE_STYLES) as TileStyle[]).map((key) => (
                <button
                  key={key}
                  onClick={() => {
                    setTileStyle(key);
                    setShowStylePicker(false);
                  }}
                  className={`w-full text-left px-3.5 py-2 text-xs transition-colors border-b border-[#E5E4E2]/40 last:border-0 whitespace-nowrap ${
                    tileStyle === key
                      ? "bg-[#F0EFED] text-[#1A1A1A] font-medium"
                      : "text-[#6B6B6B] hover:bg-[#F0EFED]/50"
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
          className="h-10 w-10 bg-white/95 backdrop-blur-sm rounded-xl border border-[#E5E4E2] shadow-sm flex items-center justify-center hover:bg-[#F0EFED] transition-colors disabled:opacity-50"
          title="My location"
        >
          {locating ? (
            <Icon
              icon={icons.loader}
              className="h-4 w-4 text-[#6B6B6B] animate-spin"
            />
          ) : (
            <Icon
              icon={icons.navigation}
              className="h-4 w-4 text-[#1A1A1A]"
            />
          )}
        </button>
        <button
          onClick={handleResetView}
          className="h-10 w-10 bg-white/95 backdrop-blur-sm rounded-xl border border-[#E5E4E2] shadow-sm flex items-center justify-center hover:bg-[#F0EFED] transition-colors"
          title="Reset to Tampa Bay"
        >
          <Icon icon={icons.compass} className="h-4 w-4 text-[#1A1A1A]" />
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

        {/* Shelters */}
        {resources
          .filter((r) => r.type === "shelter")
          .map((shelter) => (
            <CircleMarker
              key={`shelter-${shelter.id}`}
              center={[shelter.lat, shelter.lng]}
              radius={8}
              pathOptions={{
                color: "#22c55e",
                fillColor: "#22c55e",
                fillOpacity: 0.8,
                weight: 2,
              }}
            >
              <Popup>
                <div className="text-xs">
                  <p className="font-semibold">{shelter.name}</p>
                  <p>{shelter.address}</p>
                  <p>
                    Occupancy: {shelter.current_occupancy}/
                    {shelter.capacity ?? "?"}
                  </p>
                  <p>Status: {shelter.status}</p>
                </div>
              </Popup>
            </CircleMarker>
          ))}

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
        <MapCapture onMap={(m) => { mapRef.current = m; }} />
      </MapContainer>

      {/* Right bottom — zoom + fullscreen (outside MapContainer, using mapRef) */}
      <div className="absolute bottom-6 right-4 z-[1000] flex flex-col gap-2">
        <div className="flex flex-col gap-0 rounded-xl overflow-hidden border border-[#E5E4E2] shadow-sm">
          <button
            onClick={() => mapRef.current?.zoomIn()}
            className="h-9 w-9 bg-white/95 backdrop-blur-sm flex items-center justify-center hover:bg-[#F0EFED] transition-colors border-b border-[#E5E4E2]"
            title="Zoom in"
          >
            <Icon icon="ph:plus-bold" className="h-3.5 w-3.5 text-[#1A1A1A]" />
          </button>
          <button
            onClick={() => mapRef.current?.zoomOut()}
            className="h-9 w-9 bg-white/95 backdrop-blur-sm flex items-center justify-center hover:bg-[#F0EFED] transition-colors"
            title="Zoom out"
          >
            <Icon icon="ph:minus-bold" className="h-3.5 w-3.5 text-[#1A1A1A]" />
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
          className="h-9 w-9 bg-white/95 backdrop-blur-sm rounded-xl border border-[#E5E4E2] shadow-sm flex items-center justify-center hover:bg-[#F0EFED] transition-colors"
          title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
        >
          <Icon
            icon={isFullscreen ? "ph:corners-in-bold" : "ph:corners-out-bold"}
            className="h-3.5 w-3.5 text-[#1A1A1A]"
          />
        </button>
      </div>
    </div>
  );
}
