// Instant skeleton for a shared card page (/[handle]). The route resolves
// the profile (and, for scheduling hosts, the bookable slots) on the
// server before it can paint, so without this Next holds the previous
// screen until that render finishes — a lag on the app's most-shared link.
// Mirrors the page's max-w-2xl column and the CardBody card shape so the
// swap to the real card doesn't jump.
export default function HandleLoading() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-14 sm:px-6 sm:py-20">
      <div className="flex flex-col gap-5 rounded-3xl border border-bean bg-surface p-6 sm:p-7">
        {/* URL row */}
        <div className="h-3 w-40 animate-pulse rounded-full bg-bean/50" />

        {/* Avatar + name */}
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 shrink-0 animate-pulse rounded-full bg-bean/50" />
          <div className="flex flex-col gap-2">
            <div className="h-7 w-44 animate-pulse rounded-2xl bg-bean/50" />
            <div className="h-3 w-28 animate-pulse rounded-full bg-bean/40" />
          </div>
        </div>

        {/* Status lines */}
        <div className="flex flex-col gap-2">
          <div className="h-4 w-full animate-pulse rounded-full bg-bean/40" />
          <div className="h-4 w-4/5 animate-pulse rounded-full bg-bean/40" />
        </div>

        {/* Chat-kind chips */}
        <div className="flex flex-wrap gap-2">
          <div className="h-7 w-20 animate-pulse rounded-full bg-bean/40" />
          <div className="h-7 w-24 animate-pulse rounded-full bg-bean/40" />
          <div className="h-7 w-16 animate-pulse rounded-full bg-bean/40" />
        </div>

        {/* Footer slot (invite CTA / form) */}
        <div className="mt-1 border-t border-bean/70 pt-4">
          <div className="h-11 w-full animate-pulse rounded-2xl bg-bean/40" />
        </div>
      </div>
    </main>
  );
}
