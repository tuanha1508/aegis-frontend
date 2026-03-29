"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@iconify/react";
import { icons } from "@/lib/icons";
import { useApi } from "@/lib/use-api";
import { useLiveData } from "@/lib/use-live-data";
import { getPhase, getAlerts, getResources, getReports } from "@/lib/api";
import type { Phase } from "@/lib/types";

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h`;
}

const phaseConfig: Record<Phase, { label: string; icon: string; color: string }> = {
  pre_storm: { label: "PRE-STORM", icon: icons.sunCloud, color: "text-warning" },
  active_storm: { label: "ACTIVE STORM", icon: icons.hurricane, color: "text-destructive" },
  post_storm: { label: "POST-STORM", icon: icons.hardHat, color: "text-success" },
};

export default function DashboardPage() {
  const { data: phase } = useApi(getPhase);
  const { data: alerts } = useApi(getAlerts);
  const { data: resources } = useApi(getResources);
  const { data: reports } = useApi(getReports);
  const { weather, waterLevels, tides, alerts: nwsAlerts, news, streams, lastUpdated } = useLiveData();
  const [expandedAlert, setExpandedAlert] = useState<number | null>(null);

  const currentPhase = phase?.current_phase ?? "pre_storm";
  const config = phaseConfig[currentPhase];
  const shelters = resources?.filter((r) => r.type === "shelter" && r.status === "open") ?? [];
  const criticalAlerts = alerts?.filter((a) => a.priority === "critical" || a.priority === "emergency") ?? [];
  const severeNWS = nwsAlerts?.alerts.filter((a) => a.severity === "Extreme" || a.severity === "Severe") ?? [];
  const stations = waterLevels?.stations ?? [];
  const hasFloodWarning = stations.some((s) => s.percent_of_flood > 80);
  const highWind = weather && weather.wind_speed_mph > 40;

  return (
    <div className="p-3 md:p-4">
      {/* Header strip */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Icon icon={config.icon} className={`h-4 w-4 ${config.color}`} />
            <span className={`text-[10px] font-mono font-bold tracking-widest ${config.color}`}>{config.label}</span>
          </div>
          <div className="h-3 w-px bg-border" />
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-destructive-light border border-destructive/20">
            <div className="h-1.5 w-1.5 rounded-full bg-destructive animate-pulse" />
            <span className="text-[9px] font-mono font-bold tracking-widest text-destructive">LIVE</span>
          </div>
          {hasFloodWarning && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-warning-light border border-warning/20 animate-pulse">
              <span className="text-[9px] font-mono font-bold text-warning">FLOOD</span>
            </div>
          )}
          {highWind && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-warning-light border border-warning/20">
              <span className="text-[9px] font-mono font-bold text-warning">HIGH WIND</span>
            </div>
          )}
        </div>
        {lastUpdated && (
          <span className="text-[10px] font-mono text-foreground-muted">
            {timeAgo(lastUpdated.toISOString())}
          </span>
        )}
      </div>

      {/* NWS severe alerts */}
      {severeNWS.length > 0 && (
        <div className="mb-3 space-y-1">
          {severeNWS.map((alert, i) => {
            const isExtreme = alert.severity === "Extreme";
            return (
              <button
                key={i}
                onClick={() => setExpandedAlert(expandedAlert === i ? null : i)}
                className={`w-full text-left rounded-lg px-3 py-2 border ${isExtreme ? "bg-destructive-light border-destructive/30 text-destructive" : "bg-warning-light border-warning/30 text-warning"}`}
              >
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full animate-pulse ${isExtreme ? "bg-destructive" : "bg-warning"}`} />
                  <p className="text-[11px] font-mono font-bold tracking-wide">
                    {alert.severity.toUpperCase()}: {alert.event.toUpperCase()}
                  </p>
                </div>
                {expandedAlert === i && (
                  <p className="text-[10px] opacity-60 mt-1.5 leading-relaxed font-mono">{alert.headline}</p>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Video feeds */}
      {streams && streams.streams.length > 0 && (
        <div className="grid grid-cols-3 gap-1.5 mb-3">
          {streams.streams.slice(0, 3).map((stream, i) =>
            stream.embed_url ? (
              <div key={i} className="rounded-lg overflow-hidden bg-surface relative group">
                <div className="aspect-video">
                  <iframe
                    src={`${stream.embed_url}?autoplay=1&mute=1&loop=1&rel=0&modestbranding=1&controls=0&showinfo=0`}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-2 pb-1.5 pt-5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-[9px] font-mono text-white/80 truncate">{stream.name}</p>
                </div>
                <div className="absolute top-1.5 left-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded text-[7px] font-mono font-bold tracking-wider text-white bg-destructive/90">
                  <div className="h-1 w-1 rounded-full bg-white animate-pulse" />
                  LIVE
                </div>
              </div>
            ) : null
          )}
        </div>
      )}

      {/* Data grid — 4 columns */}
      <div className="grid lg:grid-cols-4 gap-1.5 mb-3">
        {/* Stats */}
        <div className="bg-surface rounded-lg border border-border overflow-hidden">
          <div className="px-3 py-1.5 border-b border-border">
            <span className="text-[8px] uppercase tracking-[0.2em] font-mono font-bold text-foreground-muted">Overview</span>
          </div>
          {[
            { label: "ALERTS", value: `${alerts?.length ?? 0}`, warn: criticalAlerts.length > 0 },
            { label: "CRITICAL", value: `${criticalAlerts.length}`, warn: criticalAlerts.length > 0 },
            { label: "SHELTERS", value: `${shelters.length}` },
            { label: "REPORTS", value: `${reports?.length ?? 0}` },
            { label: "NWS", value: `${nwsAlerts?.active_count ?? 0}`, warn: (nwsAlerts?.active_count ?? 0) > 0 },
          ].map((row) => (
            <div key={row.label} className="px-3 py-1.5 flex items-center justify-between border-b border-border last:border-0">
              <span className="text-[9px] font-mono text-foreground-muted">{row.label}</span>
              <span className={`text-[11px] font-mono font-medium ${row.warn ? "text-destructive" : "text-foreground"}`}>{row.value}</span>
            </div>
          ))}
        </div>

        {/* Conditions */}
        <div className="bg-surface rounded-lg border border-border overflow-hidden">
          <div className="px-3 py-1.5 border-b border-border">
            <span className="text-[8px] uppercase tracking-[0.2em] font-mono font-bold text-foreground-muted">Conditions</span>
          </div>
          {[
            { label: "TEMP", value: weather ? `${Math.round(weather.temperature_f)}°F` : "—", sub: weather?.conditions },
            { label: "WIND", value: weather ? `${Math.round(weather.wind_speed_mph)} mph` : "—", sub: weather?.wind_direction, warn: highWind },
            { label: "TIDE", value: tides ? `${tides.current_level_ft.toFixed(1)} ft` : "—" },
            { label: "HUMID", value: weather ? `${weather.humidity_percent}%` : "—" },
            { label: "BARO", value: weather ? `${weather.barometric_pressure_inhg.toFixed(2)}"` : "—", warn: weather && weather.barometric_pressure_inhg < 29.5 },
          ].map((row) => (
            <div key={row.label} className="px-3 py-1.5 flex items-center justify-between border-b border-border last:border-0">
              <span className="text-[9px] font-mono text-foreground-muted">{row.label}</span>
              <div className="flex items-center gap-1.5">
                <span className={`text-[11px] font-mono font-medium ${row.warn ? "text-destructive" : "text-foreground"}`}>{row.value}</span>
                {row.sub && <span className="text-[9px] font-mono text-foreground-muted">{row.sub}</span>}
              </div>
            </div>
          ))}
        </div>

        {/* Water levels */}
        <div className="bg-surface rounded-lg border border-border overflow-hidden">
          <div className="px-3 py-1.5 border-b border-border">
            <span className="text-[8px] uppercase tracking-[0.2em] font-mono font-bold text-foreground-muted">Water Levels</span>
          </div>
          {stations.length > 0 ? stations.map((s) => {
            const pct = Math.min(s.percent_of_flood, 100);
            const danger = pct > 80;
            return (
              <div key={s.station_id} className="px-3 py-1.5 flex items-center gap-2 border-b border-border last:border-0">
                <span className="text-[9px] font-mono text-foreground-secondary flex-1 min-w-0 truncate">{s.name}</span>
                <span className={`text-[11px] font-mono font-medium w-10 text-right ${danger ? "text-destructive" : "text-foreground"}`}>{s.current_level_ft.toFixed(1)}</span>
                <div className="w-10 shrink-0 h-1 rounded-full bg-border overflow-hidden">
                  <div className={`h-full rounded-full ${danger ? "bg-destructive" : pct > 50 ? "bg-warning" : "bg-success"}`} style={{ width: `${pct}%` }} />
                </div>
                <span className={`text-[9px] font-mono w-3 ${s.trend === "rising" ? "text-destructive" : s.trend === "falling" ? "text-success" : "text-foreground-muted"}`}>
                  {s.trend === "rising" ? "↑" : s.trend === "falling" ? "↓" : "·"}
                </span>
              </div>
            );
          }) : (
            <div className="py-3 text-center"><p className="text-[9px] font-mono text-foreground-muted">NO DATA</p></div>
          )}
        </div>

        {/* Shelters */}
        <div className="bg-surface rounded-lg border border-border overflow-hidden">
          <div className="px-3 py-1.5 border-b border-border flex items-center justify-between">
            <span className="text-[8px] uppercase tracking-[0.2em] font-mono font-bold text-foreground-muted">Shelters</span>
            <Link href="/dashboard/resources" className="text-[8px] font-mono text-foreground-muted hover:text-foreground">ALL →</Link>
          </div>
          {shelters.length > 0 ? shelters.slice(0, 5).map((s) => {
            const pct = s.capacity ? Math.round((s.current_occupancy / s.capacity) * 100) : 0;
            const spotsLeft = (s.capacity ?? 0) - s.current_occupancy;
            return (
              <div key={s.id} className="px-3 py-1.5 flex items-center gap-2 border-b border-border last:border-0">
                <span className="text-[9px] font-mono text-foreground-secondary flex-1 min-w-0 truncate">{s.name}</span>
                <span className={`text-[10px] font-mono font-medium ${spotsLeft > 50 ? "text-success" : spotsLeft > 0 ? "text-warning" : "text-destructive"}`}>{spotsLeft > 0 ? spotsLeft : "FULL"}</span>
                <div className="w-10 shrink-0 h-1 rounded-full bg-border overflow-hidden">
                  <div className={`h-full rounded-full ${pct > 90 ? "bg-destructive" : pct > 60 ? "bg-warning" : "bg-success"}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          }) : (
            <div className="py-3 text-center"><p className="text-[9px] font-mono text-foreground-muted">NO DATA</p></div>
          )}
        </div>
      </div>

      {/* Bottom: Alerts + News */}
      <div className="grid lg:grid-cols-2 gap-1.5">
        <div className="bg-surface rounded-lg border border-border overflow-hidden">
          <div className="px-3 py-1.5 border-b border-border">
            <span className="text-[8px] uppercase tracking-[0.2em] font-mono font-bold text-foreground-muted">Alerts</span>
          </div>
          {alerts && alerts.length > 0 ? alerts.slice(0, 6).map((alert) => {
            const isCritical = alert.priority === "critical" || alert.priority === "emergency";
            return (
              <div key={alert.id} className={`px-3 py-1.5 border-b border-border last:border-0 ${isCritical ? "border-l-2 border-l-destructive" : "border-l-2 border-l-transparent"}`}>
                <p className={`text-[10px] font-mono line-clamp-1 ${isCritical ? "text-destructive" : "text-foreground"}`}>{alert.title}</p>
                <p className="text-[9px] font-mono text-foreground-muted line-clamp-1 mt-0.5">{alert.message}</p>
              </div>
            );
          }) : (
            <div className="py-3 text-center"><p className="text-[9px] font-mono text-foreground-muted">NO ALERTS</p></div>
          )}
        </div>

        <div className="bg-surface rounded-lg border border-border overflow-hidden">
          <div className="px-3 py-1.5 border-b border-border">
            <span className="text-[8px] uppercase tracking-[0.2em] font-mono font-bold text-foreground-muted">News Feed</span>
          </div>
          {news && news.items.length > 0 ? news.items.slice(0, 6).map((item, i) => {
            const isDanger = item.severity === "extreme" || item.severity === "severe";
            return (
              <a key={i} href={item.url} target="_blank" rel="noopener noreferrer" className={`block px-3 py-1.5 border-b border-border last:border-0 hover:bg-hover transition-colors ${isDanger ? "border-l-2 border-l-destructive" : "border-l-2 border-l-transparent"}`}>
                <p className={`text-[10px] font-mono line-clamp-1 ${isDanger ? "text-destructive" : "text-foreground-secondary"}`}>{item.title}</p>
                <span className="text-[8px] font-mono text-foreground-muted">{item.source} · {timeAgo(item.published_at)}</span>
              </a>
            );
          }) : (
            <div className="py-3 text-center"><p className="text-[9px] font-mono text-foreground-muted">NO NEWS</p></div>
          )}
        </div>
      </div>
    </div>
  );
}
