"use client";

import { Icon } from "@iconify/react";
import { icons } from "@/lib/icons";
import { useApi } from "@/lib/use-api";
import { getResources } from "@/lib/api";

const amenityIconMap: Record<string, string> = {
  wifi: icons.wifi,
  medical_station: icons.medical,
  charging: icons.chargingStation,
  hot_meals: icons.food,
  pet_friendly: icons.paw,
};

export default function ResourcesPage() {
  const { data: resources, loading } = useApi(getResources);

  const shelters = resources?.filter((r) => r.type === "shelter") ?? [];
  const open = shelters.filter((s) => s.status === "open");
  const totalCapacity = open.reduce(
    (sum, s) => sum + ((s.capacity ?? 0) - s.current_occupancy),
    0
  );

  if (loading) {
    return (
      <div className="p-6 md:p-8">
        <p className="text-sm text-foreground-secondary">Loading...</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl">
      {/* Header with stats inline */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 mb-8">
        <h1 className="text-2xl font-semibold text-foreground">Resources</h1>
        {shelters.length > 0 && (
          <p className="text-sm text-foreground-secondary">
            {open.length} open &middot; {totalCapacity} spots available
          </p>
        )}
      </div>

      {shelters.length === 0 && (
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-sm text-foreground-secondary/50">No resources available</p>
        </div>
      )}

      {/* Table-like layout for shelters */}
      {shelters.length > 0 && (
        <div className="border border-border rounded-xl overflow-hidden">
          {shelters.map((shelter, i) => {
            const pct = shelter.capacity
              ? Math.round((shelter.current_occupancy / shelter.capacity) * 100)
              : 0;
            const spotsLeft = (shelter.capacity ?? 0) - shelter.current_occupancy;
            const amenities = shelter.amenities
              ? shelter.amenities.split(",").map((a) => a.trim())
              : [];

            return (
              <div
                key={shelter.id}
                className={`p-5 flex flex-col sm:flex-row sm:items-center gap-4 ${
                  i < shelters.length - 1 ? "border-b border-border" : ""
                }`}
              >
                {/* Name + address */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {shelter.name}
                  </p>
                  {shelter.address && (
                    <p className="text-xs text-foreground-secondary mt-0.5 truncate">
                      {shelter.address}
                    </p>
                  )}
                  {/* Amenities inline */}
                  {amenities.length > 0 && (
                    <div className="flex gap-2 mt-2">
                      {amenities.map((a) => {
                        const ic = amenityIconMap[a];
                        return ic ? (
                          <Icon
                            key={a}
                            icon={ic}
                            className="h-3.5 w-3.5 text-foreground-secondary/40"
                            aria-label={a.replace(/_/g, " ")}
                          />
                        ) : null;
                      })}
                    </div>
                  )}
                </div>

                {/* Capacity */}
                <div className="w-40 shrink-0">
                  <div className="flex items-baseline justify-between text-xs mb-1">
                    <span className="text-foreground-secondary">
                      {shelter.current_occupancy}/{shelter.capacity ?? "?"}
                    </span>
                    <span
                      className={`font-medium ${
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
                  <div className="h-1.5 rounded-full bg-border overflow-hidden">
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

                {/* Status */}
                <div className="shrink-0">
                  <span
                    className={`text-xs font-medium ${
                      shelter.status === "open"
                        ? "text-emerald-600"
                        : "text-red-600"
                    }`}
                  >
                    {shelter.status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
