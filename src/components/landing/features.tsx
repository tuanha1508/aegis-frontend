import { ArrowRight } from "lucide-react";

export function Features() {
  return (
    <section id="features" className="py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center mb-16">
          <p className="text-[11px] tracking-widest uppercase text-[#A0A0A0] mb-4">
            Features
          </p>
          <h2 className="text-[1.75rem] sm:text-[2.25rem] md:text-[2.75rem] font-semibold tracking-[-0.02em] text-[#1A1A1A] leading-[1.12]">
            Community-powered tools
            <br />
            <span className="font-serif italic text-[#6B6B6B]">
              for every phase of the storm
            </span>
          </h2>
        </div>

        {/* Primary feature — full width */}
        <div className="bg-white rounded-2xl border border-[#E8E8E6] overflow-hidden mb-4">
          <div className="grid md:grid-cols-2">
            <div className="p-8 md:p-10 flex flex-col justify-center">
              <h3 className="text-[1.35rem] font-semibold tracking-tight text-[#1A1A1A] leading-snug mb-3">
                Interactive map
                <span className="font-normal text-[#7A7A7A]">
                  , for tracking threats in real time
                </span>
              </h3>
              <p className="text-[14px] text-[#6B6B6B] leading-[1.7] mb-6">
                Visualize risk zones, incident markers, and live weather data on
                an interactive Tampa Bay map with real-time overlays.
              </p>
              <a
                href="#"
                className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#1A1A1A] hover:gap-2.5 transition-all"
              >
                Explore the map <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </div>
            <div className="bg-gradient-to-br from-[#F0F4F8] to-[#E8EDF3] min-h-[220px] md:min-h-0" />
          </div>
        </div>

        {/* Secondary features — varied widths */}
        <div className="grid md:grid-cols-3 gap-4 mb-4">
          {[
            {
              title: "Alert feed",
              desc: "Weather warnings, evacuations, and community updates with smart priority filtering.",
            },
            {
              title: "Field reports",
              desc: "Crowdsourced ground reports from your community when official channels go quiet.",
            },
            {
              title: "Resource finder",
              desc: "Locate nearby shelters, supplies, charging stations with real-time availability.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="bg-white rounded-2xl border border-[#E8E8E6] p-6"
            >
              <h3 className="text-[15px] font-semibold text-[#1A1A1A] mb-2">
                {f.title}
              </h3>
              <p className="text-[13px] text-[#7A7A7A] leading-[1.65]">
                {f.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Reunification — inverted */}
        <div className="bg-[#1A1A1A] rounded-2xl p-8 md:p-10 flex flex-col md:flex-row md:items-center gap-6">
          <div className="flex-1">
            <h3 className="text-[1.15rem] font-semibold text-[#F8F8F6] mb-2">
              Family reunification
            </h3>
            <p className="text-[14px] text-[#F8F8F6]/50 leading-[1.65]">
              Connect separated families through a secure portal. Check in,
              share your status, and locate loved ones.
            </p>
          </div>
          <a
            href="#"
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#F8F8F6]/70 hover:text-[#F8F8F6] hover:gap-2.5 transition-all shrink-0"
          >
            Learn more <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </section>
  );
}
