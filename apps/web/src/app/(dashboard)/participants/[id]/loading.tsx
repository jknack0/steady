export default function ParticipantDetailLoading() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Breadcrumb skeleton */}
      <div className="flex items-center gap-1.5">
        <div className="h-4 w-14 rounded bg-muted" />
        <div className="h-3 w-3 rounded bg-muted" />
        <div className="h-4 w-28 rounded bg-muted" />
      </div>

      {/* Page header skeleton */}
      <div className="space-y-2">
        <div className="h-7 w-48 rounded bg-muted" />
        <div className="h-4 w-56 rounded bg-muted" />
      </div>

      {/* Tabs skeleton */}
      <div className="flex gap-4 border-b pb-2">
        <div className="h-8 w-20 rounded bg-muted" />
        <div className="h-8 w-24 rounded bg-muted" />
        <div className="h-8 w-20 rounded bg-muted" />
        <div className="h-8 w-24 rounded bg-muted" />
      </div>

      {/* Content skeleton (cards) */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border p-6 space-y-4">
          <div className="h-5 w-32 rounded bg-muted" />
          <div className="space-y-2">
            <div className="h-4 w-full rounded bg-muted" />
            <div className="h-4 w-3/4 rounded bg-muted" />
            <div className="h-4 w-1/2 rounded bg-muted" />
          </div>
        </div>
        <div className="rounded-lg border p-6 space-y-4">
          <div className="h-5 w-32 rounded bg-muted" />
          <div className="space-y-2">
            <div className="h-4 w-full rounded bg-muted" />
            <div className="h-4 w-2/3 rounded bg-muted" />
            <div className="h-4 w-3/4 rounded bg-muted" />
          </div>
        </div>
      </div>
    </div>
  );
}
