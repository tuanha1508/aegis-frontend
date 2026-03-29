import { Shield } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border py-8">
      <div className="mx-auto max-w-6xl px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Shield className="h-3.5 w-3.5 text-foreground-muted" strokeWidth={1.8} />
          <span className="text-[12px] text-foreground-muted">
            Aegis — HackUSF 2026
          </span>
        </div>
        <p className="text-[11px] text-foreground-muted">
          Next.js &middot; React-Leaflet &middot; Google ADK
        </p>
      </div>
    </footer>
  );
}
