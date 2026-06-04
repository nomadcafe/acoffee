// Instant skeleton for /profile. The route is force-dynamic and resolves
// several auth-scoped queries (profile, invites, slots) before it can
// paint, so without this Next holds the old screen until the whole server
// render finishes — which reads as a lag when you click in (e.g. "view
// invites"). This fallback shows the moment navigation starts and streams
// out as the real page is ready. Mirrors the page's max-width + header
// rhythm so the swap doesn't jump.
export default function ProfileLoading() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10 sm:px-6 sm:py-14">
      <div className="flex flex-col gap-3">
        <div className="h-3 w-20 animate-pulse rounded-full bg-bean/50" />
        <div className="h-9 w-64 max-w-full animate-pulse rounded-2xl bg-bean/50" />
        <div className="h-4 w-80 max-w-full animate-pulse rounded-full bg-bean/40" />
      </div>
      <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:items-start">
        <div className="flex flex-col gap-4 lg:order-1">
          <div className="h-10 w-full animate-pulse rounded-2xl bg-bean/40" />
          <div className="h-10 w-full animate-pulse rounded-2xl bg-bean/40" />
          <div className="h-24 w-full animate-pulse rounded-2xl bg-bean/40" />
          <div className="h-10 w-2/3 animate-pulse rounded-2xl bg-bean/40" />
        </div>
        <div className="h-80 w-full animate-pulse rounded-3xl bg-bean/40 lg:order-2" />
      </div>
    </main>
  );
}
