"use client";

import dynamic from "next/dynamic";
import { useDashboard } from "@/lib/dashboard-context";
import { useApi } from "@/lib/use-api";
import { getRisk } from "@/lib/api";

const MapView = dynamic(() => import("@/components/dashboard/map-view"), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center bg-surface">
      <p className="text-sm text-foreground-secondary">Loading map...</p>
    </div>
  ),
});

export default function MapPage() {
  const { resources, incidents, shelterRoutes, userLocation, setUserLocation } = useDashboard();
  const { data: riskData } = useApi(getRisk);

  return (
    <div className="h-[calc(100vh-4rem)] md:h-screen relative">
      <MapView
        risks={riskData?.neighborhoods ?? []}
        resources={resources ?? []}
        incidents={incidents ?? []}
        shelterRoutes={shelterRoutes}
        userLocation={userLocation}
        onUserLocation={setUserLocation}
      />
    </div>
  );
}
