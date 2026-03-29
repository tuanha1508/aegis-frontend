"use client";

import { Icon } from "@iconify/react";
import { icons } from "@/lib/icons";
import { useApi } from "@/lib/use-api";
import { getAlerts } from "@/lib/api";

export default function AlertsPage() {
  const { data: alerts, loading } = useApi(getAlerts);

  const critical = alerts?.filter(
    (a) => a.priority === "critical" || a.priority === "emergency"
  ) ?? [];
  const warnings = alerts?.filter((a) => a.priority === "warning") ?? [];
  const info = alerts?.filter((a) => a.priority === "info") ?? [];

  if (loading) {
    return (
      <div className="p-6 md:p-8">
        <p className="text-sm text-[#6B6B6B]">Loading...</p>
      </div>
    );
  }

  if (!alerts || alerts.length === 0) {
    return (
      <div className="p-6 md:p-8 flex items-center justify-center min-h-[60vh]">
        <p className="text-sm text-[#6B6B6B]/50">No alerts</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl">
      <h1 className="text-2xl font-semibold text-[#1A1A1A] mb-8">Alerts</h1>

      {/* Critical — visually distinct */}
      {critical.length > 0 && (
        <div className="mb-8">
          <p className="text-[10px] uppercase tracking-widest text-red-600 font-medium mb-3">
            Critical
          </p>
          <div className="space-y-2">
            {critical.map((alert) => (
              <div
                key={alert.id}
                className="bg-red-50 border border-red-100 rounded-xl p-5"
              >
                <p className="text-sm font-medium text-red-900">
                  {alert.title}
                </p>
                <p className="text-xs text-red-800/70 mt-1">{alert.message}</p>
                {alert.message_es && (
                  <p className="text-xs text-red-800/50 mt-1.5 italic">
                    {alert.message_es}
                  </p>
                )}
                <div className="flex items-center gap-3 mt-3 text-[10px] text-red-800/40">
                  {alert.neighborhood && <span>{alert.neighborhood}</span>}
                  {alert.created_at && (
                    <span>{new Date(alert.created_at).toLocaleString()}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="mb-8">
          <p className="text-[10px] uppercase tracking-widest text-amber-600 font-medium mb-3">
            Warnings
          </p>
          <div className="space-y-2">
            {warnings.map((alert) => (
              <div
                key={alert.id}
                className="bg-amber-50/50 border border-amber-100 rounded-xl p-5"
              >
                <p className="text-sm font-medium text-[#1A1A1A]">
                  {alert.title}
                </p>
                <p className="text-xs text-[#6B6B6B] mt-1">{alert.message}</p>
                {alert.neighborhood && (
                  <p className="text-[10px] text-[#6B6B6B]/50 mt-2">
                    {alert.neighborhood}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info */}
      {info.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-widest text-[#6B6B6B]/50 font-medium mb-3">
            Info
          </p>
          <div className="space-y-2">
            {info.map((alert) => (
              <div
                key={alert.id}
                className="border border-[#E5E4E2] rounded-xl p-4"
              >
                <p className="text-sm text-[#1A1A1A]">{alert.title}</p>
                <p className="text-xs text-[#6B6B6B] mt-1">{alert.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
