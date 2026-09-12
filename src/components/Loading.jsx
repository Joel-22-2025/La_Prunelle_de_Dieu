// ===========================================================================
// Spinner de chargement réutilisable pour l'ensemble des pages/route guards.
// ===========================================================================

export default function Loading({ label = 'Chargement…' }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30">
      <div className="text-center">
        <div
          className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-primary/25 border-t-primary"
          aria-hidden="true"
        />
        <p className="mt-4 text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}