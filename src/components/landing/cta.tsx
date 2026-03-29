import Link from "next/link";

export function CTA() {
  return (
    <section className="py-24 md:py-32 bg-white">
      <div className="mx-auto max-w-6xl px-6 text-center">
        <h2 className="text-[1.75rem] sm:text-[2.25rem] md:text-[2.75rem] font-semibold tracking-[-0.02em] text-foreground leading-[1.12] mb-5">
          Getting started is easy.
        </h2>
        <p className="text-[15px] text-foreground-secondary max-w-md mx-auto mb-8 leading-[1.65]">
          Open the dashboard and explore what Aegis can do.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center rounded-full px-8 h-11 bg-foreground text-foreground-inverse hover:bg-foreground/80 text-[13px] font-medium transition-colors"
        >
          Open Dashboard
        </Link>
      </div>
    </section>
  );
}
