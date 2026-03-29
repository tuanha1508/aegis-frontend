"use client";

import Link from "next/link";
import { Icon } from "@iconify/react";
import { icons } from "@/lib/icons";
import { useApi } from "@/lib/use-api";
import { getPhase, getAlerts, getResources, getReports } from "@/lib/api";
import type { Phase } from "@/lib/types";

const phaseConfig: Record<
  Phase,
  { label: string; description: string; icon: string; color: string; bg: string; border: string }
> = {
  pre_storm: {
    label: "Pre-Storm",
    description: "Monitor conditions and prepare your household.",
    icon: icons.sunCloud,
    color: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
  },
  active_storm: {
    label: "Active Storm",
    description: "Stay sheltered. Report emergencies via SMS.",
    icon: icons.hurricane,
    color: "text-red-700",
    bg: "bg-red-50",
    border: "border-red-200",
  },
  post_storm: {
    label: "Post-Storm",
    description: "Check on neighbors. Report damage.",
    icon: icons.hardHat,
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
  },
};

export default function DashboardPage() {
  const { data: phase } = useApi(getPhase);
  const { data: alerts } = useApi(getAlerts);
  const { data: resources } = useApi(getResources);
  const { data: reports } = useApi(getReports);

  const currentPhase = phase?.current_phase ?? "pre_storm";
  const config = phaseConfig[currentPhase];

  const shelters = resources?.filter((r) => r.type === "shelter" && r.status === "open") ?? [];
  const criticalAlerts = alerts?.filter(
    (a) => a.priority === "critical" || a.priority === "emergency"
  ) ?? [];

  return (
    <div className="p-6 md:p-8 max-w-6xl">
      {/* Phase banner — full width, prominent */}
      <div className={`rounded-2xl ${config.bg} ${config.border} border p-6 mb-8`}>
        <div className="flex items-start gap-4">
          <div className={`h-11 w-11 rounded-xl ${config.bg} flex items-center justify-center`}>
            <Icon icon={config.icon} className={`h-6 w-6 ${config.color}`} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h2 className={`text-lg font-semibold ${config.color}`}>
                {config.label}
              </h2>
              <div className="flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] text-[#6B6B6B]">Live</span>
              </div>
            </div>
            <p className={`text-sm mt-0.5 ${config.color} opacity-70`}>
              {config.description}
            </p>
          </div>
        </div>
      </div>

      {/* Stats row — numbers only, no icons */}
      <div className="grid grid-cols-4 gap-6 mb-10">
        {[
          { value: alerts?.length ?? 0, label: "Alerts", href: "/dashboard/alerts" },
          { value: shelters.length, label: "Shelters open", href: "/dashboard/resources" },
          { value: reports?.length ?? 0, label: "Reports", href: "/dashboard/reports" },
          {
            value: criticalAlerts.length,
            label: "Critical",
            href: "/dashboard/alerts",
          },
        ].map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="group"
          >
            <p className="text-3xl font-semibold text-[#1A1A1A] group-hover:text-[#6B6B6B] transition-colors">
              {stat.value}
            </p>
            <p className="text-xs text-[#6B6B6B] mt-1">{stat.label}</p>
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Alerts — takes 2 columns */}
        <div className="lg:col-span-2">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-sm font-medium text-[#1A1A1A]">
              Recent alerts
            </h2>
            <Link
              href="/dashboard/alerts"
              className="text-xs text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors"
            >
              View all
            </Link>
          </div>

          {alerts && alerts.length > 0 ? (
            <div className="space-y-2">
              {alerts.slice(0, 5).map((alert) => {
                const isCritical =
                  alert.priority === "critical" ||
                  alert.priority === "emergency";
                return (
                  <div
                    key={alert.id}
                    className={`rounded-xl p-4 ${
                      isCritical
                        ? "bg-red-50 border border-red-100"
                        : "bg-white border border-[#E5E4E2]"
                    }`}
                  >
                    <div className="flex items-baseline justify-between gap-4">
                      <p
                        className={`text-sm font-medium ${
                          isCritical ? "text-red-900" : "text-[#1A1A1A]"
                        }`}
                      >
                        {alert.title}
                      </p>
                      <span className="text-[10px] text-[#6B6B6B] shrink-0 uppercase tracking-wider">
                        {alert.priority}
                      </span>
                    </div>
                    <p
                      className={`text-xs mt-1 line-clamp-1 ${
                        isCritical ? "text-red-800/70" : "text-[#6B6B6B]"
                      }`}
                    >
                      {alert.message}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-[#E5E4E2] py-12 text-center">
              <p className="text-sm text-[#6B6B6B]/50">No alerts</p>
            </div>
          )}
        </div>

        {/* Shelters — single column */}
        <div>
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-sm font-medium text-[#1A1A1A]">Shelters</h2>
            <Link
              href="/dashboard/resources"
              className="text-xs text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors"
            >
              View all
            </Link>
          </div>

          {shelters.length > 0 ? (
            <div className="space-y-3">
              {shelters.slice(0, 4).map((shelter) => {
                const pct = shelter.capacity
                  ? Math.round(
                      (shelter.current_occupancy / shelter.capacity) * 100
                    )
                  : 0;
                const spotsLeft =
                  (shelter.capacity ?? 0) - shelter.current_occupancy;
                return (
                  <div key={shelter.id}>
                    <div className="flex items-baseline justify-between mb-1">
                      <p className="text-sm text-[#1A1A1A] truncate">
                        {shelter.name}
                      </p>
                      <span
                        className={`text-[10px] font-medium ${
                          spotsLeft > 50
                            ? "text-emerald-600"
                            : spotsLeft > 0
                              ? "text-amber-600"
                              : "text-red-600"
                        }`}
                      >
                        {spotsLeft > 0 ? `${spotsLeft} left` : "Full"}
                      </span>
                    </div>
                    <div className="h-1 rounded-full bg-[#E5E4E2] overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          pct > 90
                            ? "bg-red-400"
                            : pct > 60
                              ? "bg-amber-400"
                              : "bg-emerald-400"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-[#E5E4E2] py-12 text-center">
              <p className="text-sm text-[#6B6B6B]/50">No shelters</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
