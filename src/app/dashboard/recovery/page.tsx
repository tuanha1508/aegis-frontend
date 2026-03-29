"use client";

import { useApi } from "@/lib/use-api";
import { getRecoveryBriefs } from "@/lib/api";

export default function RecoveryPage() {
  const { data: briefs, loading } = useApi(getRecoveryBriefs);

  if (loading) {
    return (
      <div className="p-6 md:p-8">
        <p className="text-sm text-[#6B6B6B]">Loading...</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl">
      <h1 className="text-2xl font-semibold text-[#1A1A1A] mb-8">Recovery</h1>

      {(!briefs || briefs.length === 0) && (
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-sm text-[#6B6B6B]/50">
            No recovery briefs available
          </p>
        </div>
      )}

      {briefs && briefs.length > 0 && (
        <div className="border border-[#E5E4E2] rounded-xl overflow-hidden divide-y divide-[#E5E4E2]">
          {briefs.map((brief, i) => {
            const neighborhood =
              (brief.neighborhood as string) ?? `Area ${i + 1}`;
            const status = (brief.status as string) ?? "unknown";
            const summary = (brief.summary as string) ?? "";

            return (
              <div key={i} className="p-5">
                <div className="flex items-baseline justify-between gap-4 mb-1">
                  <p className="text-sm font-medium text-[#1A1A1A]">
                    {neighborhood}
                  </p>
                  <span
                    className={`text-[10px] font-medium uppercase tracking-wider ${
                      status === "critical"
                        ? "text-red-600"
                        : status === "recovering"
                          ? "text-amber-600"
                          : status === "stable"
                            ? "text-emerald-600"
                            : "text-[#6B6B6B]"
                    }`}
                  >
                    {status}
                  </span>
                </div>
                {summary && (
                  <p className="text-sm text-[#6B6B6B] leading-relaxed">
                    {summary}
                  </p>
                )}
                {/* Extra fields */}
                {Object.entries(brief)
                  .filter(
                    ([key]) =>
                      !["neighborhood", "status", "summary", "resources"].includes(key)
                  )
                  .map(([key, value]) => (
                    <p key={key} className="text-xs text-[#6B6B6B]/50 mt-1">
                      {key.replace(/_/g, " ")}: {String(value)}
                    </p>
                  ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
