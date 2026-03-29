import { MapPin, Bell, Radio } from "lucide-react";

export function Hero() {
  return (
    <section className="relative pt-36 pb-20 md:pt-44 md:pb-28 overflow-hidden">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
          <p className="text-xs tracking-widest uppercase text-[#7A7A7A] mb-5">
            HackUSF 2026
          </p>

          <h1 className="text-[2.5rem] sm:text-[3.25rem] md:text-[4rem] font-semibold tracking-[-0.025em] text-[#1A1A1A] leading-[1.08]">
            <span className="font-serif italic">Storm intelligence</span>
            <br />
            for Tampa Bay
          </h1>

          <p className="mt-5 text-[15px] md:text-[17px] text-[#6B6B6B] max-w-lg leading-[1.65]">
            Real-time monitoring, alerts, and community coordination —
            protecting lives before, during, and after severe weather.
          </p>
        </div>

        {/* Dashboard Preview */}
        <div className="mt-16 md:mt-20 relative">
          <div className="bg-white rounded-2xl border border-[#E8E8E6] shadow-[0_8px_60px_-16px_rgba(0,0,0,0.08)] overflow-hidden">
            {/* Top bar */}
            <div className="border-b border-[#ECECEA] px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-[#E5E4E2]" />
                <div className="h-2 w-2 rounded-full bg-[#E5E4E2]" />
                <div className="h-2 w-2 rounded-full bg-[#E5E4E2]" />
              </div>
              <div className="hidden sm:flex items-center gap-2 text-[11px] text-[#B5B5B5]">
                <Radio className="h-3 w-3" strokeWidth={1.5} />
                <span>Live — Tampa Bay</span>
              </div>
            </div>

            {/* Dashboard content */}
            <div className="p-5 md:p-8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {[
                  { label: "Active Alerts", value: "12", change: "+3" },
                  { label: "Shelters Open", value: "8", change: "+2" },
                  { label: "Field Reports", value: "156", change: "+24" },
                  { label: "People Assisted", value: "2.4k", change: "+180" },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-xl bg-[#FAFAF9] border border-[#ECECEA] p-4"
                  >
                    <p className="text-[11px] text-[#B5B5B5]">{stat.label}</p>
                    <div className="flex items-baseline gap-2 mt-1.5">
                      <p className="text-[22px] font-semibold tracking-tight text-[#1A1A1A]">
                        {stat.value}
                      </p>
                      <span className="text-[11px] text-[#B5B5B5]">
                        {stat.change}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Map placeholder */}
              <div className="rounded-xl bg-gradient-to-br from-[#F0F4F8] via-[#F5F5F3] to-[#F0FAF5] border border-[#ECECEA] h-48 md:h-64 relative overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <MapPin
                      className="h-7 w-7 text-[#D5D5D3] mx-auto mb-2"
                      strokeWidth={1.2}
                    />
                    <p className="text-[13px] text-[#C5C5C3]">
                      Tampa Bay Interactive Map
                    </p>
                  </div>
                </div>

                <div className="absolute top-8 left-12 h-3 w-3 rounded-full bg-amber-300/30 animate-pulse" />
                <div className="absolute top-16 right-20 h-2.5 w-2.5 rounded-full bg-red-300/30 animate-pulse delay-300" />
                <div className="absolute bottom-12 left-1/3 h-3 w-3 rounded-full bg-emerald-300/30 animate-pulse delay-700" />
                <div className="absolute bottom-20 right-1/4 h-2 w-2 rounded-full bg-blue-300/30 animate-pulse delay-500" />

                <div className="absolute top-6 right-6 bg-white/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-[#ECECEA] shadow-sm hidden md:flex items-center gap-2">
                  <Bell className="h-3 w-3 text-amber-400" strokeWidth={1.5} />
                  <span className="text-[11px] text-[#6B6B6B]">
                    Wind Advisory — Hillsborough
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="absolute -inset-x-20 -bottom-20 h-40 bg-gradient-to-t from-[#F8F8F6] to-transparent pointer-events-none" />
        </div>
      </div>
    </section>
  );
}
