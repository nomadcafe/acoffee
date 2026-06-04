// Shared loading skeleton for the discovery list pages (/browse and its
// /zh, /ja variants). Browse renders dynamically whenever a filter is
// applied (searchParams opt the route out of the static cache), so a
// filtered navigation does a fresh DB query before it can paint — this
// fallback shows instantly meanwhile. Mirrors the page's max-w-2xl column,
// the filter-chip row, and a few CityCard rows so the swap doesn't jump.
export default function DiscoveryListSkeleton() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-14 sm:px-6 sm:py-20">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div className="h-3 w-16 animate-pulse rounded-full bg-bean/50" />
        <div className="h-9 w-56 max-w-full animate-pulse rounded-2xl bg-bean/50" />
        <div className="h-4 w-72 max-w-full animate-pulse rounded-full bg-bean/40" />
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2">
        {[14, 20, 16, 24, 18].map((w, i) => (
          <div
            key={i}
            className="h-7 animate-pulse rounded-full bg-bean/40"
            style={{ width: `${w * 4}px` }}
          />
        ))}
      </div>

      {/* Card rows */}
      <div className="flex flex-col gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex items-center gap-4 rounded-3xl border border-bean bg-surface p-4"
          >
            <div className="h-12 w-12 shrink-0 animate-pulse rounded-full bg-bean/50" />
            <div className="flex flex-1 flex-col gap-2">
              <div className="h-4 w-40 max-w-full animate-pulse rounded-full bg-bean/50" />
              <div className="h-3 w-56 max-w-full animate-pulse rounded-full bg-bean/40" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
