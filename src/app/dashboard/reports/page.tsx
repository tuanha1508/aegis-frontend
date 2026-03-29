"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import { icons } from "@/lib/icons";
import { useApi } from "@/lib/use-api";
import { getReports, submitReport } from "@/lib/api";

export default function ReportsPage() {
  const { data: reports, loading, refetch } = useApi(getReports);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      await submitReport({ text: text.trim(), source: "app" });
      setText("");
      refetch();
    } catch {
      // silent
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl">
      <h1 className="text-2xl font-semibold text-[#1A1A1A] mb-8">Reports</h1>

      {/* Submit */}
      <form onSubmit={handleSubmit} className="flex gap-2 mb-8">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Describe what you're seeing — location, conditions, needs..."
          className="flex-1 px-4 py-2.5 bg-white border border-[#E5E4E2] rounded-xl text-sm text-[#1A1A1A] placeholder:text-[#6B6B6B]/50 outline-none focus:border-[#1A1A1A]/30"
        />
        <button
          type="submit"
          disabled={!text.trim() || submitting}
          className="h-10 w-10 rounded-xl bg-[#1A1A1A] flex items-center justify-center hover:bg-[#2A2A2A] transition-colors disabled:opacity-30 shrink-0"
        >
          <Icon icon={icons.send} className="h-4 w-4 text-[#F8F8F6]" />
        </button>
      </form>

      {loading && <p className="text-sm text-[#6B6B6B]">Loading...</p>}

      {!loading && (!reports || reports.length === 0) && (
        <div className="flex items-center justify-center min-h-[40vh]">
          <p className="text-sm text-[#6B6B6B]/50">No reports</p>
        </div>
      )}

      {/* Reports as a feed */}
      {reports && reports.length > 0 && (
        <div className="border border-[#E5E4E2] rounded-xl overflow-hidden divide-y divide-[#E5E4E2]">
          {reports.map((report) => (
            <div key={report.id} className="p-4 flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[#1A1A1A]">{report.raw_text}</p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[10px] text-[#6B6B6B]/50">
                  <span>{report.source}</span>
                  {report.incident_type && (
                    <span className="text-amber-600">{report.incident_type}</span>
                  )}
                  {report.location_text && <span>{report.location_text}</span>}
                  {report.has_children && (
                    <span className="text-red-600">children involved</span>
                  )}
                  {report.created_at && (
                    <span>
                      {new Date(report.created_at).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
              <span
                className={`text-[10px] shrink-0 ${
                  report.processed ? "text-emerald-600" : "text-[#6B6B6B]/40"
                }`}
              >
                {report.processed ? "processed" : "pending"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
