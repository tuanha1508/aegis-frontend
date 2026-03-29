"use client";

import dynamic from "next/dynamic";
import { useApi } from "@/lib/use-api";
import { getRisk, getResources, getIncidents } from "@/lib/api";

const MapView = dynamic(() => import("@/components/dashboard/map-view"), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center bg-surface">
      <p className="text-sm text-foreground-secondary">Loading map...</p>
    </div>
  ),
});

export default function MapPage() {
  const { data: riskData } = useApi(getRisk);
  const { data: resources } = useApi(getResources);
  const { data: incidents } = useApi(getIncidents);

  return (
    <div className="h-[calc(100vh-4rem)] md:h-screen relative">
      <MapView
        risks={riskData?.neighborhoods ?? []}
        resources={resources ?? []}
        incidents={incidents ?? []}
      />
    </div>
  );
}
