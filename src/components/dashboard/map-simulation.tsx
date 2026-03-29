"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { CircleMarker, Circle, Marker, Polyline, Polygon, Popup, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";

const TRACK: [number, number][] = [
  [22.4, -93.1], [22.6, -91.0], [22.5, -88.4], [22.7, -87.5],
  [23.2, -86.3], [23.8, -86.0], [24.3, -85.5], [25.0, -84.8],
  [25.8, -84.0], [26.5, -83.3], [27.0, -82.9], [27.2, -82.8],
  [27.5, -82.2], [27.8, -81.5], [28.2, -80.8], [28.5, -80.0],
  [29.0, -78.5], [29.5, -76.3],
];

const SPAWN_INCIDENTS: {
  progress: number;
  lat: number;
  lng: number;
  type: string;
  severity: "critical" | "high" | "moderate";
  text: string;
}[] = [
  { progress: 0.45, lat: 27.912, lng: -82.493, type: "flooding", severity: "moderate", text: "Flooding on Bay to Bay Blvd" },
  { progress: 0.50, lat: 27.923, lng: -82.497, type: "flooding", severity: "high", text: "Storm surge entering Palma Ceia homes" },
  { progress: 0.52, lat: 27.943, lng: -82.449, type: "power_outage", severity: "moderate", text: "Power outage in Channelside" },
  { progress: 0.55, lat: 27.929, lng: -82.515, type: "trapped_person", severity: "critical", text: "Family trapped Henderson Blvd, 2 adults 2 children" },
  { progress: 0.57, lat: 27.960, lng: -82.437, type: "road_blocked", severity: "moderate", text: "Trees blocking Dale Mabry at Gandy" },
  { progress: 0.58, lat: 27.910, lng: -82.490, type: "flooding", severity: "critical", text: "South Tampa underwater, 4ft storm surge" },
  { progress: 0.60, lat: 27.921, lng: -82.463, type: "flooding", severity: "critical", text: "Davis Islands completely flooded" },
  { progress: 0.62, lat: 27.994, lng: -82.457, type: "power_outage", severity: "high", text: "Seminole Heights lost all power" },
  { progress: 0.65, lat: 27.722, lng: -82.431, type: "flooding", severity: "critical", text: "Ruskin — water over rooftops" },
  { progress: 0.68, lat: 27.940, lng: -82.475, type: "structural", severity: "high", text: "Roof torn off apartment Hyde Park" },
  { progress: 0.70, lat: 27.955, lng: -82.525, type: "supply_needed", severity: "moderate", text: "Westshore shelter needs water" },
  { progress: 0.75, lat: 27.863, lng: -82.324, type: "flooding", severity: "high", text: "Riverview — Alafia River overflowing" },
];

const SURGE_ZONES: { center: [number, number]; maxRadius: number; startProgress: number }[] = [
  { center: [27.916, -82.477], maxRadius: 4000, startProgress: 0.45 },
  { center: [27.921, -82.463], maxRadius: 3000, startProgress: 0.50 },
  { center: [27.943, -82.449], maxRadius: 2000, startProgress: 0.55 },
  { center: [27.722, -82.431], maxRadius: 3500, startProgress: 0.55 },
];

const severityColor: Record<string, string> = {
  critical: "#ef4444",
  high: "#f97316",
  moderate: "#f59e0b",
};

function interpolateTrack(progress: number): [number, number] {
  const p = Math.max(0, Math.min(1, progress));
  const totalSegments = TRACK.length - 1;
  const segment = Math.floor(p * totalSegments);
  const segProgress = (p * totalSegments) - segment;
  const from = TRACK[Math.min(segment, TRACK.length - 1)];
  const to = TRACK[Math.min(segment + 1, TRACK.length - 1)];
  return [
    from[0] + (to[0] - from[0]) * segProgress,
    from[1] + (to[1] - from[1]) * segProgress,
  ];
}

// NHC wind radii by quadrant (NE, SE, SW, NW) in nautical miles
// Converted to meters (1 NM = 1852 m)
const NM = 1852;

interface WindQuadrants {
  ne: number; se: number; sw: number; nw: number;
}

interface WindField {
  ts: WindQuadrants;   // 34kt tropical storm
  strong: WindQuadrants; // 50kt strong TS
  hurr: WindQuadrants; // 64kt hurricane force
  eye: number;         // eye wall radius (symmetric)
}

function windFieldRadii(progress: number): WindField {
  if (progress < 0.25) {
    // Cat 5, compact but intense
    return {
      ts:     { ne: 80*NM, se: 70*NM, sw: 50*NM, nw: 80*NM },
      strong: { ne: 40*NM, se: 35*NM, sw: 25*NM, nw: 40*NM },
      hurr:   { ne: 20*NM, se: 20*NM, sw: 15*NM, nw: 15*NM },
      eye: 30000,
    };
  }
  if (progress < 0.40) {
    // Cat 4, expanding
    return {
      ts:     { ne: 120*NM, se: 110*NM, sw: 70*NM, nw: 120*NM },
      strong: { ne: 50*NM, se: 45*NM, sw: 40*NM, nw: 55*NM },
      hurr:   { ne: 25*NM, se: 25*NM, sw: 10*NM, nw: 15*NM },
      eye: 35000,
    };
  }
  if (progress < 0.55) {
    // Approaching landfall — actual NHC data
    return {
      ts:     { ne: 180*NM, se: 170*NM, sw: 110*NM, nw: 180*NM },
      strong: { ne: 60*NM, se: 60*NM, sw: 70*NM, nw: 80*NM },
      hurr:   { ne: 30*NM, se: 30*NM, sw: 0, nw: 0 },
      eye: 56000,
    };
  }
  if (progress < 0.70) {
    // Landfall — winds concentrated NE
    return {
      ts:     { ne: 180*NM, se: 170*NM, sw: 110*NM, nw: 180*NM },
      strong: { ne: 60*NM, se: 60*NM, sw: 70*NM, nw: 80*NM },
      hurr:   { ne: 30*NM, se: 30*NM, sw: 0, nw: 0 },
      eye: 50000,
    };
  }
  // Weakening over land
  return {
    ts:     { ne: 100*NM, se: 90*NM, sw: 60*NM, nw: 80*NM },
    strong: { ne: 40*NM, se: 30*NM, sw: 20*NM, nw: 30*NM },
    hurr:   { ne: 0, se: 0, sw: 0, nw: 0 },
    eye: 25000,
  };
}

// Generate polygon points for asymmetric wind field
// NHC convention: angle 0° = North, clockwise
// NE = 0-90°, SE = 90-180°, SW = 180-270°, NW = 270-360°
function quadrantPolygon(
  center: [number, number],
  quadrants: WindQuadrants,
  segments: number = 48
): [number, number][] {
  const points: [number, number][] = [];
  for (let i = 0; i <= segments; i++) {
    // Bearing in degrees (0=N, 90=E, 180=S, 270=W)
    const bearing = (i / segments) * 360;
    // Get radius for this bearing by smooth interpolation between quadrants
    let radius: number;
    if (bearing <= 90) {
      // NE quadrant: N(0°) to E(90°)
      const t = bearing / 90;
      radius = quadrants.ne * (1 - t * 0.3) + quadrants.ne * t * 0.3; // mostly NE
      radius = quadrants.ne; // NHC: constant within quadrant
    } else if (bearing <= 180) {
      // SE quadrant: E(90°) to S(180°)
      radius = quadrants.se;
    } else if (bearing <= 270) {
      // SW quadrant: S(180°) to W(270°)
      radius = quadrants.sw;
    } else {
      // NW quadrant: W(270°) to N(360°)
      radius = quadrants.nw;
    }

    // Smooth transitions between quadrants (blend 20° around boundaries)
    const blend = 20;
    if (bearing > 90 - blend && bearing < 90 + blend) {
      const t = (bearing - (90 - blend)) / (2 * blend);
      radius = quadrants.ne * (1 - t) + quadrants.se * t;
    } else if (bearing > 180 - blend && bearing < 180 + blend) {
      const t = (bearing - (180 - blend)) / (2 * blend);
      radius = quadrants.se * (1 - t) + quadrants.sw * t;
    } else if (bearing > 270 - blend && bearing < 270 + blend) {
      const t = (bearing - (270 - blend)) / (2 * blend);
      radius = quadrants.sw * (1 - t) + quadrants.nw * t;
    } else if (bearing > 360 - blend || bearing < blend) {
      const b = bearing > 180 ? bearing - 360 : bearing;
      const t = (b + blend) / (2 * blend);
      radius = quadrants.nw * (1 - t) + quadrants.ne * t;
    }

    if (radius <= 0) continue;

    // Convert bearing + distance to lat/lng offset
    const bearingRad = (bearing * Math.PI) / 180;
    const latOffset = (radius / 111320) * Math.cos(bearingRad);
    const lngOffset = (radius / (111320 * Math.cos(center[0] * Math.PI / 180))) * Math.sin(bearingRad);
    points.push([center[0] + latOffset, center[1] + lngOffset]);
  }
  return points;
}

interface MapSimulationProps {
  running: boolean;
  speed: number;
  onProgress?: (progress: number) => void;
}

export function MapSimulation({ running, speed, onProgress }: MapSimulationProps) {
  const map = useMap();
  const [progress, setProgress] = useState(0);
  const [stormPos, setStormPos] = useState<[number, number]>(TRACK[0]);
  const [trailPath, setTrailPath] = useState<[number, number][]>([]);
  const [visibleIncidents, setVisibleIncidents] = useState<typeof SPAWN_INCIDENTS>([]);
  const startTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const zoomPhaseRef = useRef(0); // 0=initial, 1=wide, 2=zooming in, 3=close

  // Start zoomed out to see the Gulf when simulation begins
  useEffect(() => {
    if (running) {
      map.setView([25.5, -86.0], 6, { animate: true, duration: 1 });
      zoomPhaseRef.current = 1;
    }
  }, [running, map]);

  const animate = useCallback((timestamp: number) => {
    if (!startTimeRef.current) startTimeRef.current = timestamp;
    const elapsed = (timestamp - startTimeRef.current) / 1000;
    const p = Math.min(elapsed / speed, 1);

    setProgress(p);
    const pos = interpolateTrack(p);
    setStormPos(pos);
    onProgress?.(p);

    const trailIndex = Math.floor(p * (TRACK.length - 1));
    setTrailPath(TRACK.slice(0, trailIndex + 1).concat([pos]));
    setVisibleIncidents(SPAWN_INCIDENTS.filter((inc) => inc.progress <= p));

    // Progressive zoom: wide → medium → close as storm approaches
    if (p > 0.25 && p < 0.35 && zoomPhaseRef.current < 2) {
      map.flyTo([26.5, -84.0], 8, { duration: 2 });
      zoomPhaseRef.current = 2;
    }
    if (p > 0.45 && p < 0.55 && zoomPhaseRef.current < 3) {
      map.flyTo([27.5, -82.6], 10, { duration: 2 });
      zoomPhaseRef.current = 3;
    }
    if (p > 0.6 && p < 0.65 && zoomPhaseRef.current < 4) {
      map.flyTo([27.9, -82.45], 11, { duration: 2 });
      zoomPhaseRef.current = 4;
    }

    if (p < 1 && running) {
      rafRef.current = requestAnimationFrame(animate);
    }
  }, [speed, running, map, onProgress]);

  useEffect(() => {
    if (running) {
      startTimeRef.current = null;
      zoomPhaseRef.current = 0;
      setProgress(0);
      setVisibleIncidents([]);
      setTrailPath([]);
      rafRef.current = requestAnimationFrame(animate);
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [running, animate]);

  // Reset everything when stopped
  useEffect(() => {
    if (!running) {
      setProgress(0);
      setStormPos(TRACK[0]);
      setTrailPath([]);
      setVisibleIncidents([]);
    }
  }, [running]);

  if (!running) return null;

  const nearLandfall = progress > 0.5 && progress < 0.75;
  const wf = windFieldRadii(progress);
  const eyeColor = nearLandfall ? "#ef4444" : "#a855f6";
  const tsPolygon = quadrantPolygon(stormPos, wf.ts);
  const strongPolygon = quadrantPolygon(stormPos, wf.strong);
  const hurrPolygon = quadrantPolygon(stormPos, wf.hurr);
  const hasHurr = wf.hurr.ne > 0 || wf.hurr.se > 0 || wf.hurr.sw > 0 || wf.hurr.nw > 0;

  return (
    <>
      {/* Storm trail */}
      {trailPath.length > 1 && (
        <Polyline
          positions={trailPath}
          pathOptions={{ color: "#a855f6", weight: 2.5, opacity: 0.5 }}
        />
      )}

      {/* Wind field — 34kt tropical storm winds (asymmetric) */}
      <Polygon
        positions={tsPolygon}
        pathOptions={{
          color: eyeColor,
          fillColor: eyeColor,
          fillOpacity: 0.03,
          weight: 0.5,
          opacity: 0.2,
          dashArray: "8 6",
        }}
      >
        <Tooltip sticky>
          <span className="text-[10px]">34kt Tropical Storm Winds · NE:{Math.round(wf.ts.ne/NM)} SE:{Math.round(wf.ts.se/NM)} SW:{Math.round(wf.ts.sw/NM)} NW:{Math.round(wf.ts.nw/NM)} NM</span>
        </Tooltip>
      </Polygon>

      {/* Wind field — 50kt strong TS winds (asymmetric) */}
      <Polygon
        positions={strongPolygon}
        pathOptions={{
          color: eyeColor,
          fillColor: eyeColor,
          fillOpacity: 0.06,
          weight: 1,
          opacity: 0.3,
        }}
      >
        <Tooltip sticky>
          <span className="text-[10px]">50kt Winds · NE:{Math.round(wf.strong.ne/NM)} SE:{Math.round(wf.strong.se/NM)} SW:{Math.round(wf.strong.sw/NM)} NW:{Math.round(wf.strong.nw/NM)} NM</span>
        </Tooltip>
      </Polygon>

      {/* Wind field — 64kt hurricane force (asymmetric, may be 0 in some quadrants) */}
      {hasHurr && (
        <Polygon
          positions={hurrPolygon}
          pathOptions={{
            color: eyeColor,
            fillColor: eyeColor,
            fillOpacity: 0.10,
            weight: 1.5,
            opacity: 0.5,
          }}
        >
          <Tooltip sticky>
            <span className="text-[10px]">64kt Hurricane Force · NE:{Math.round(wf.hurr.ne/NM)} SE:{Math.round(wf.hurr.se/NM)} NM</span>
          </Tooltip>
        </Polygon>
      )}

      {/* Eye wall circle (always symmetric) */}
      <Circle
        center={stormPos}
        radius={wf.eye}
        pathOptions={{
          color: eyeColor,
          fillColor: eyeColor,
          fillOpacity: 0.15,
          weight: 1.5,
          opacity: 0.6,
        }}
      >
        <Tooltip sticky>
          <span className="text-[10px] font-bold">Eye Wall · {Math.round(wf.eye / 1000)} km</span>
        </Tooltip>
      </Circle>

      {/* Storm surge */}
      {SURGE_ZONES.map((zone, i) => {
        if (progress < zone.startProgress) return null;
        const surgeProgress = Math.min((progress - zone.startProgress) / 0.3, 1);
        return (
          <Circle
            key={`surge-${i}`}
            center={zone.center}
            radius={zone.maxRadius * surgeProgress}
            pathOptions={{
              color: "#3b82f6",
              fillColor: "#3b82f6",
              fillOpacity: 0.06 + surgeProgress * 0.06,
              weight: 1,
              opacity: 0.2,
            }}
          />
        );
      })}

      {/* Incidents */}
      {visibleIncidents.map((inc, i) => {
        const age = progress - inc.progress;
        const isNew = age < 0.03;
        return (
          <CircleMarker
            key={`sim-inc-${i}`}
            center={[inc.lat, inc.lng]}
            radius={isNew ? 10 : 6}
            pathOptions={{
              color: severityColor[inc.severity],
              fillColor: severityColor[inc.severity],
              fillOpacity: isNew ? 0.9 : 0.7,
              weight: isNew ? 3 : 1.5,
            }}
          >
            <Popup>
              <div className="text-xs">
                <p className="font-bold" style={{ color: severityColor[inc.severity] }}>
                  {inc.type.replace(/_/g, " ").toUpperCase()}
                </p>
                <p>{inc.text}</p>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}

      {/* Storm eye marker */}
      <Marker
        position={stormPos}
        icon={L.divIcon({
          className: "",
          iconSize: [32, 32],
          iconAnchor: [16, 16],
          html: `<div style="width:32px;height:32px;display:flex;align-items:center;justify-content:center;">
            <div style="width:16px;height:16px;border-radius:50%;background:${eyeColor}50;border:2px solid ${eyeColor};display:flex;align-items:center;justify-content:center;">
              <div style="width:6px;height:6px;border-radius:50%;background:${eyeColor};"></div>
            </div>
          </div>`,
        })}
      >
        <Tooltip direction="top" offset={[0, -20]} permanent={false}>
          <span className="text-[10px] font-bold">
            Hurricane Milton · {progress < 0.25 ? "Cat 5" : progress < 0.4 ? "Cat 4" : progress < 0.7 ? "Cat 3" : "Weakening"} · {progress < 0.25 ? "180" : progress < 0.4 ? "150" : progress < 0.7 ? "120" : "80"} mph
          </span>
        </Tooltip>
        <Popup>
          <div className="text-xs" style={{ minWidth: 160 }}>
            <p className="font-bold text-sm">Hurricane Milton</p>
            <table className="mt-1" style={{ fontSize: 11 }}>
              <tbody>
                <tr><td className="pr-2 text-gray-500">Category</td><td className="font-semibold">{progress < 0.25 ? "5 (Major)" : progress < 0.4 ? "4 (Major)" : progress < 0.7 ? "3 (Major)" : progress < 0.85 ? "1" : "Post-Tropical"}</td></tr>
                <tr><td className="pr-2 text-gray-500">Max Wind</td><td>{progress < 0.25 ? "180 mph" : progress < 0.4 ? "150 mph" : progress < 0.7 ? "120 mph" : "80 mph"}</td></tr>
                <tr><td className="pr-2 text-gray-500">Pressure</td><td>{progress < 0.25 ? "897 mb" : progress < 0.4 ? "920 mb" : progress < 0.7 ? "950 mb" : "975 mb"}</td></tr>
                <tr><td className="pr-2 text-gray-500">Movement</td><td>{progress < 0.5 ? "ENE 15 mph" : "NE 18 mph"}</td></tr>
                <tr><td className="pr-2 text-gray-500">34kt (TS)</td><td>NE:{Math.round(wf.ts.ne/NM)} SE:{Math.round(wf.ts.se/NM)} SW:{Math.round(wf.ts.sw/NM)} NW:{Math.round(wf.ts.nw/NM)}</td></tr>
                <tr><td className="pr-2 text-gray-500">64kt (Hurr)</td><td>NE:{Math.round(wf.hurr.ne/NM)} SE:{Math.round(wf.hurr.se/NM)} SW:{Math.round(wf.hurr.sw/NM)} NW:{Math.round(wf.hurr.nw/NM)}</td></tr>
                <tr><td className="pr-2 text-gray-500">Status</td><td className="font-semibold" style={{ color: eyeColor }}>{progress < 0.4 ? "APPROACHING" : nearLandfall ? "LANDFALL" : progress < 0.85 ? "CROSSING FL" : "DISSIPATING"}</td></tr>
              </tbody>
            </table>
          </div>
        </Popup>
      </Marker>
    </>
  );
}
