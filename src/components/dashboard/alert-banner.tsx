"use client";

import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { icons } from "@/lib/icons";
import { getLiveAlerts } from "@/lib/api";
import type { WeatherAlert } from "@/lib/types";

export function AlertBanner() {
  const [alerts, setAlerts] = useState<WeatherAlert[]>([]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await getLiveAlerts();
        setAlerts(
          data.alerts.filter(
            (a) => a.severity === "Extreme" || a.severity === "Severe"
          )
        );
      } catch {
        // silent
      }
    };
    fetch();
    const interval = setInterval(fetch, 60_000);
    return () => clearInterval(interval);
  }, []);

  if (dismissed || alerts.length === 0) return null;

  const top = alerts[0];
  const isExtreme = top.severity === "Extreme";

  return (
    <div
      className={`px-4 py-2.5 flex items-center gap-3 text-sm ${
        isExtreme
          ? "bg-red-600 text-white"
          : "bg-orange-500 text-white"
      }`}
    >
      <div className="h-1.5 w-1.5 rounded-full bg-surface animate-pulse shrink-0" />
      <p className="flex-1 truncate text-xs font-medium">
        {top.event}: {top.headline}
      </p>
      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 opacity-70 hover:opacity-100"
      >
        <Icon icon={icons.close} className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
