"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@iconify/react";
import { icons } from "@/lib/icons";
import { useDashboard } from "@/lib/dashboard-context";
import {
  advancePhase,
  setPhase,
  triggerAnalysis,
  generateAlerts,
  triggerOrchestrate,
  triggerProcessReports,
  triggerRankIncidents,
  triggerMatching,
  triggerRecoveryBriefs,
  startScheduler,
  stopScheduler,
  orchestrationTick,
  setScenario,
  startSimulation,
  getSimulationStatus,
  askCommander,
  verifyIncidents,
  syncResources,
} from "@/lib/api";
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
  const {
    phase, alerts, resources, reports, incidents, recoveryBriefs, assignments, auditLog,
    weather, waterLevels, tides, nwsAlerts, news, streams, lastUpdated,
    refetchPhase, refetchAlerts, refetchIncidents,
  } = useDashboard();
  const [expandedAlert, setExpandedAlert] = useState<number | null>(null);
  const [showOperator, setShowOperator] = useState(false);
  const [agentLoading, setAgentLoading] = useState<string | null>(null);
  const [schedulerRunning, setSchedulerRunning] = useState(false);
  const [commanderQuery, setCommanderQuery] = useState("");
  const [commanderResponse, setCommanderResponse] = useState<string | null>(null);

  const currentPhase = phase?.current_phase ?? "pre_storm";
  const config = phaseConfig[currentPhase];
  const stormActive = currentPhase === "active_storm";

  const shelters = resources?.filter((r) => r.type === "shelter" && r.status === "open") ?? [];
  // Only show storm data (alerts, incidents, reports) during active_storm
  const stormAlerts = stormActive ? (alerts ?? []) : [];
  const criticalAlerts = stormAlerts.filter((a) => a.priority === "critical" || a.priority === "emergency");
  const severeNWS = nwsAlerts?.alerts.filter((a) => a.severity === "Extreme" || a.severity === "Severe") ?? [];
  const stations = waterLevels?.stations ?? [];
  const hasFloodWarning = stations.some((s) => s.percent_of_flood > 80);
  const highWind = weather && weather.wind_speed_mph > 40;
  const activeIncidents = stormActive ? (incidents?.filter((i) => !i.resolved) ?? []) : [];
  const stormReports = stormActive ? (reports ?? []) : [];

  const [opsStatus, setOpsStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const runAgent = async (name: string, fn: () => Promise<unknown>) => {
    setAgentLoading(name);
    setOpsStatus(null);
    try {
      const result = await fn();
      const res = result as Record<string, unknown> | undefined;
      if (res?.status === "error" || res?.error) {
        setOpsStatus({ type: "error", message: String(res.error ?? "Agent failed") });
      } else {
        setOpsStatus({ type: "success", message: `${name.toUpperCase()} completed` });
      }
      refetchPhase();
      refetchAlerts();
      refetchIncidents();
    } catch (e) {
      setOpsStatus({ type: "error", message: e instanceof Error ? e.message : "Request failed" });
    }
    setAgentLoading(null);
    // Auto-clear status after 5s
    setTimeout(() => setOpsStatus(null), 5000);
  };

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
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className="text-[10px] font-mono text-foreground-muted">
              {timeAgo(lastUpdated.toISOString())}
            </span>
          )}
          <button
            onClick={() => setShowOperator(!showOperator)}
            className={`text-[9px] font-mono font-bold px-2 py-1 rounded transition-colors ${showOperator ? "bg-accent text-white" : "bg-surface border border-border text-foreground-muted hover:text-foreground"}`}
          >
            OPS
          </button>
        </div>
      </div>

      {/* Operator panel — collapsible */}
      {showOperator && (
        <div className="mb-3 bg-surface rounded-lg border border-accent/30 p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-2 w-2 rounded-full bg-accent" />
            <span className="text-[9px] font-mono font-bold text-accent uppercase tracking-widest">Operator Controls</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {/* Phase controls */}
            {(["pre_storm", "active_storm", "post_storm"] as Phase[]).map((p) => (
              <button
                key={p}
                onClick={() => runAgent("phase", () => setPhase(p))}
                className={`text-[9px] font-mono px-2 py-1 rounded border transition-colors ${
                  currentPhase === p
                    ? "bg-foreground text-foreground-inverse border-foreground"
                    : "bg-surface border-border text-foreground-muted hover:text-foreground"
                }`}
              >
                {p.replace(/_/g, " ").toUpperCase()}
              </button>
            ))}
            <div className="h-5 w-px bg-border mx-1" />
            {/* Core actions */}
            <button
              onClick={() => runAgent("orchestrate", () => triggerOrchestrate())}
              disabled={agentLoading !== null}
              className="text-[9px] font-mono px-2 py-1 rounded border border-accent/30 bg-accent/10 text-accent hover:bg-accent/20 transition-colors disabled:opacity-30"
            >
              {agentLoading === "orchestrate" ? "..." : "▶ RUN ALL AGENTS"}
            </button>
            <div className="h-5 w-px bg-border mx-1" />
            {/* Simulation */}
            {(["fast", "normal", "slow"] as const).map((speed) => (
              <button
                key={speed}
                onClick={() => runAgent(`sim-${speed}`, () => startSimulation(speed))}
                disabled={agentLoading !== null}
                className="text-[9px] font-mono px-2 py-1 rounded border border-border bg-surface text-foreground-muted hover:text-foreground hover:border-accent transition-colors disabled:opacity-30"
              >
                {agentLoading === `sim-${speed}` ? "..." : `SIM ${speed.toUpperCase()}`}
              </button>
            ))}
          </div>
          {/* Status feedback */}
          {opsStatus && (
            <div className={`mt-2 text-[9px] font-mono px-2 py-1 rounded ${opsStatus.type === "error" ? "bg-destructive-light text-destructive" : "bg-success-light text-success"}`}>
              {opsStatus.type === "error" ? "✗ " : "✓ "}{opsStatus.message.substring(0, 200)}
            </div>
          )}
          {/* Commander — AI situation queries */}
          <div className="flex gap-2 mt-2">
            <input
              value={commanderQuery}
              onChange={(e) => setCommanderQuery(e.target.value)}
              onKeyDown={async (e) => {
                if (e.key === "Enter" && commanderQuery.trim()) {
                  setAgentLoading("commander");
                  try {
                    const res = await askCommander(commanderQuery.trim());
                    const answer = (res as Record<string, unknown>).answer ?? (res as Record<string, unknown>).response ?? (res as Record<string, unknown>).reply ?? (res as Record<string, unknown>).result ?? (res as Record<string, unknown>).narrative ?? (res as Record<string, unknown>).message ?? JSON.stringify(res);
                    setCommanderResponse(String(answer));
                  } catch { setCommanderResponse("Error"); }
                  setAgentLoading(null);
                  setCommanderQuery("");
                }
              }}
              placeholder="Ask commander: what's the worst area? how many people trapped?"
              className="flex-1 px-3 py-1.5 text-[10px] font-mono bg-background border border-accent/30 rounded text-foreground placeholder:text-foreground-muted outline-none focus:border-accent"
            />
            <button
              onClick={async () => {
                if (!commanderQuery.trim()) return;
                setAgentLoading("commander");
                try {
                  const res = await askCommander(commanderQuery.trim());
                  setCommanderResponse(JSON.stringify(res, null, 2));
                } catch { setCommanderResponse("Error"); }
                setAgentLoading(null);
                setCommanderQuery("");
              }}
              disabled={!commanderQuery.trim() || agentLoading !== null}
              className="text-[9px] font-mono px-3 py-1.5 rounded bg-accent text-white hover:bg-accent-hover transition-colors disabled:opacity-30"
            >
              {agentLoading === "commander" ? "..." : "ASK"}
            </button>
          </div>
          {commanderResponse && (
            <div className="mt-2 bg-background border border-border rounded p-3 max-h-40 overflow-auto">
              <p className="text-[11px] font-mono text-foreground leading-relaxed whitespace-pre-wrap">{commanderResponse}</p>
            </div>
          )}
        </div>
      )}

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
            { label: "SHELTERS", value: `${shelters.length}` },
            { label: "NWS", value: `${nwsAlerts?.active_count ?? 0}`, warn: (nwsAlerts?.active_count ?? 0) > 0 },
            ...(stormActive ? [
              { label: "ALERTS", value: `${stormAlerts.length}`, warn: criticalAlerts.length > 0 },
              { label: "CRITICAL", value: `${criticalAlerts.length}`, warn: criticalAlerts.length > 0 },
              { label: "INCIDENTS", value: `${activeIncidents.length}`, warn: activeIncidents.some((i: { severity_label?: string | null }) => i.severity_label === "critical") },
              { label: "REPORTS", value: `${stormReports.length}` },
            ] : []),
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
            { label: "TIDE", value: tides?.current_level_ft != null ? `${tides.current_level_ft.toFixed(1)} ft` : "—" },
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

      {/* Storm panels — only during active storm */}
      {stormActive && (
        <div className="grid lg:grid-cols-3 gap-1.5 mb-1.5">
          <div className="bg-surface rounded-lg border border-border overflow-hidden">
            <div className="px-3 py-1.5 border-b border-border">
              <span className="text-[8px] uppercase tracking-[0.2em] font-mono font-bold text-foreground-muted">Incidents</span>
            </div>
            {activeIncidents.length > 0 ? activeIncidents.slice(0, 6).map((incident) => {
              const isCritical = incident.severity_label === "critical" || incident.severity_label === "high";
              return (
                <div key={incident.id} className={`px-3 py-1.5 border-b border-border last:border-0 ${isCritical ? "border-l-2 border-l-destructive" : "border-l-2 border-l-transparent"}`}>
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-[10px] font-mono line-clamp-1 ${isCritical ? "text-destructive" : "text-foreground"}`}>{incident.incident_type}</p>
                    {incident.severity_score != null && (
                      <span className={`text-[9px] font-mono font-bold ${isCritical ? "text-destructive" : "text-foreground-muted"}`}>{incident.severity_score}</span>
                    )}
                  </div>
                  <p className="text-[9px] font-mono text-foreground-muted line-clamp-1 mt-0.5">{incident.location_text}</p>
                </div>
              );
            }) : (
              <div className="py-3 text-center"><p className="text-[9px] font-mono text-foreground-muted">NO INCIDENTS</p></div>
            )}
          </div>

          <div className="bg-surface rounded-lg border border-border overflow-hidden">
            <div className="px-3 py-1.5 border-b border-border">
              <span className="text-[8px] uppercase tracking-[0.2em] font-mono font-bold text-foreground-muted">Reports</span>
            </div>
            {stormReports.filter((r) => r.incident_type && r.incident_type !== "other").length > 0 ? stormReports.filter((r) => r.incident_type && r.incident_type !== "other").slice(0, 6).map((report) => (
              <div key={report.id} className={`px-3 py-1.5 border-b border-border last:border-0 ${report.has_children ? "border-l-2 border-l-destructive" : "border-l-2 border-l-transparent"}`}>
                <p className="text-[10px] font-mono text-foreground line-clamp-1">{report.raw_text}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[8px] font-mono text-foreground-muted">{report.source}</span>
                  {report.incident_type && <span className="text-[8px] font-mono text-warning">{report.incident_type}</span>}
                </div>
              </div>
            )) : (
              <div className="py-3 text-center"><p className="text-[9px] font-mono text-foreground-muted">NO REPORTS</p></div>
            )}
          </div>

          <div className="bg-surface rounded-lg border border-border overflow-hidden">
            <div className="px-3 py-1.5 border-b border-border">
              <span className="text-[8px] uppercase tracking-[0.2em] font-mono font-bold text-foreground-muted">Alerts</span>
            </div>
            {stormAlerts.length > 0 ? stormAlerts.slice(0, 6).map((alert) => {
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
        </div>
      )}

      {/* News — always shown (real-time) */}
      <div className="grid lg:grid-cols-1 gap-1.5">
        {/* News */}
        <div className="bg-surface rounded-lg border border-border overflow-hidden">
          <div className="px-3 py-1.5 border-b border-border">
            <span className="text-[8px] uppercase tracking-[0.2em] font-mono font-bold text-foreground-muted">News Feed</span>
          </div>
          {news && news.items.length > 0 ? [...new Map(news.items.map((n) => [n.title, n])).values()].slice(0, 6).map((item, i) => {
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

      {/* Recovery briefs — shown in post-storm phase */}
      {recoveryBriefs && recoveryBriefs.length > 0 && (
        <div className="mt-1.5 bg-surface rounded-lg border border-border overflow-hidden">
          <div className="px-3 py-1.5 border-b border-border">
            <span className="text-[8px] uppercase tracking-[0.2em] font-mono font-bold text-foreground-muted">Recovery Status</span>
          </div>
          <div className="grid lg:grid-cols-3 divide-x divide-border">
            {recoveryBriefs.slice(0, 6).map((brief, i) => {
              const neighborhood = (brief.neighborhood as string) ?? `Area ${i + 1}`;
              const power = brief.power_status as string | undefined;
              const water = brief.water_status as string | undefined;
              const roads = brief.roads_status as string | undefined;
              return (
                <div key={i} className="px-3 py-2 border-b border-border last:border-0">
                  <p className="text-[10px] font-mono font-medium text-foreground mb-1">{neighborhood}</p>
                  {power && <p className="text-[8px] font-mono text-foreground-muted">⚡ {power}</p>}
                  {water && <p className="text-[8px] font-mono text-foreground-muted">💧 {water}</p>}
                  {roads && <p className="text-[8px] font-mono text-foreground-muted">🛣 {roads}</p>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Assignments + Audit Log */}
      {((assignments && assignments.length > 0) || (auditLog && auditLog.length > 0)) && (
        <div className="mt-1.5 grid lg:grid-cols-2 gap-1.5">
          {/* Assignments — dispatched teams */}
          {assignments && assignments.length > 0 && (
            <div className="bg-surface rounded-lg border border-border overflow-hidden">
              <div className="px-3 py-1.5 border-b border-border">
                <span className="text-[8px] uppercase tracking-[0.2em] font-mono font-bold text-foreground-muted">Assignments</span>
              </div>
              {assignments.slice(0, 6).map((a) => {
                const statusColor = a.status === "dispatched" ? "text-warning" : a.status === "completed" ? "text-success" : a.status === "en_route" ? "text-accent" : "text-foreground-muted";
                return (
                  <div key={a.id} className="px-3 py-1.5 flex items-center justify-between border-b border-border last:border-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[9px] font-mono text-foreground-muted">#{a.incident_id}</span>
                      <span className="text-[10px] font-mono text-foreground truncate">→ Resource #{a.resource_id}</span>
                    </div>
                    <span className={`text-[9px] font-mono font-medium uppercase ${statusColor}`}>{a.status}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Audit log — agent activity */}
          {auditLog && auditLog.length > 0 && (
            <div className="bg-surface rounded-lg border border-border overflow-hidden">
              <div className="px-3 py-1.5 border-b border-border">
                <span className="text-[8px] uppercase tracking-[0.2em] font-mono font-bold text-foreground-muted">Agent Activity</span>
              </div>
              {auditLog.slice(0, 8).map((entry, i) => {
                const action = (entry.action as string) ?? (entry.event as string) ?? "—";
                const agent = (entry.agent as string) ?? (entry.agent_name as string) ?? "";
                const ts = (entry.created_at as string) ?? (entry.timestamp as string) ?? "";
                const detail = (entry.detail as string) ?? (entry.message as string) ?? "";
                return (
                  <div key={i} className="px-3 py-1.5 border-b border-border last:border-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {agent && <span className="text-[8px] font-mono text-accent">{agent}</span>}
                        <span className="text-[10px] font-mono text-foreground truncate">{action}</span>
                      </div>
                      {ts && <span className="text-[8px] font-mono text-foreground-muted shrink-0">{timeAgo(ts)}</span>}
                    </div>
                    {detail && <p className="text-[8px] font-mono text-foreground-muted line-clamp-1 mt-0.5">{detail}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
