import { Shield } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-[#ECECEA] py-8">
      <div className="mx-auto max-w-6xl px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Shield className="h-3.5 w-3.5 text-[#C5C5C3]" strokeWidth={1.8} />
          <span className="text-[12px] text-[#B5B5B5]">
            Aegis — HackUSF 2026
          </span>
        </div>
        <p className="text-[11px] text-[#C5C5C3]">
          Next.js &middot; React-Leaflet &middot; Google ADK
        </p>
      </div>
    </footer>
  );
}
