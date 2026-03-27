export default function AppLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-base">
      <div className="space-y-3 text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[var(--text-3)] border-t-[var(--text-1)]" />
        <p className="text-xs font-medium uppercase tracking-widest text-[var(--text-3)]">Cargando</p>
      </div>
    </div>
  )
}
