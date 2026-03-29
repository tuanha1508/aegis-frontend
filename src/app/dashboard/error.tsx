"use client";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex items-center justify-center min-h-[60vh] p-6">
      <div className="text-center">
        <p className="text-sm text-foreground mb-2">Something went wrong</p>
        <p className="text-xs text-foreground-muted mb-4 max-w-sm">
          {error.message}
        </p>
        <button
          onClick={reset}
          className="px-4 py-2 text-xs font-medium rounded-lg bg-foreground text-foreground-inverse hover:bg-foreground/80 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
