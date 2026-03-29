export function Phases() {
  return (
    <section id="phases" className="py-20 md:py-28 bg-white">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center mb-16">
          <p className="text-[11px] tracking-widest uppercase text-[#A0A0A0] mb-4">
            How it works
          </p>
          <h2 className="text-[1.75rem] sm:text-[2.25rem] md:text-[2.75rem] font-semibold tracking-[-0.02em] text-[#1A1A1A] leading-[1.12]">
            <span className="font-serif italic text-[#6B6B6B]">Three phases</span>
            , one seamless experience
          </h2>
        </div>

        {/* Timeline */}
        <div className="relative">
          <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px bg-[#ECECEA] -translate-x-1/2" />

          {/* Phase 1 */}
          <div className="grid md:grid-cols-2 gap-8 md:gap-16 mb-16 md:mb-24">
            <div className="md:text-right">
              <p className="text-[11px] tracking-widest uppercase text-amber-500 font-medium mb-3">
                Phase 01
              </p>
              <h3 className="text-[1.5rem] font-semibold tracking-tight text-[#1A1A1A] mb-3">
                Pre-Storm
              </h3>
              <p className="text-[14px] text-[#6B6B6B] leading-[1.7]">
                Monitor approaching systems, review evacuation routes, locate
                shelters, and stock up on resources. The map shows live risk
                assessments for every Tampa Bay neighborhood.
              </p>
            </div>
            <div className="hidden md:block" />
          </div>

          {/* Phase 2 */}
          <div className="grid md:grid-cols-2 gap-8 md:gap-16 mb-16 md:mb-24">
            <div className="hidden md:block" />
            <div>
              <p className="text-[11px] tracking-widest uppercase text-red-500 font-medium mb-3">
                Phase 02
              </p>
              <h3 className="text-[1.5rem] font-semibold tracking-tight text-[#1A1A1A] mb-3">
                Active Storm
              </h3>
              <p className="text-[14px] text-[#6B6B6B] leading-[1.7]">
                Real-time alerts, live incident mapping, and emergency
                communication. Report conditions via SMS — our AI agent parses
                your message and coordinates response.
              </p>
            </div>
          </div>

          {/* Phase 3 */}
          <div className="grid md:grid-cols-2 gap-8 md:gap-16">
            <div className="md:text-right">
              <p className="text-[11px] tracking-widest uppercase text-emerald-500 font-medium mb-3">
                Phase 03
              </p>
              <h3 className="text-[1.5rem] font-semibold tracking-tight text-[#1A1A1A] mb-3">
                Post-Storm
              </h3>
              <p className="text-[14px] text-[#6B6B6B] leading-[1.7]">
                Damage assessment, resource distribution, and family
                reunification. AI matches missing and found persons
                automatically and generates neighborhood recovery briefs.
              </p>
            </div>
            <div className="hidden md:block" />
          </div>
        </div>
      </div>
    </section>
  );
}
