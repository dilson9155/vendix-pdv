export default function AppLoading() {
  return (
    <div className="animate-pulse space-y-4" aria-busy="true" aria-label="Carregando página">
      <div className="space-y-2">
        <div className="h-3 w-24 rounded bg-muted" />
        <div className="h-7 w-64 rounded bg-muted" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="h-3 w-24 rounded bg-muted" />
            <div className="mt-3 h-6 w-32 rounded bg-muted" />
          </div>
        ))}
      </div>
      <div className="h-72 rounded-xl border bg-card p-4 shadow-sm">
        <div className="h-4 w-40 rounded bg-muted" />
        <div className="mt-4 space-y-2">
          {[0, 1, 2, 3, 4].map((row) => (
            <div key={row} className="h-8 w-full rounded bg-muted" />
          ))}
        </div>
      </div>
    </div>
  );
}
