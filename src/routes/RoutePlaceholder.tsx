export function RoutePlaceholder({ title }: { title: string }) {
  return (
    <main className="page">
      <p className="eyebrow">Honey Manager</p>
      <h1>{title}</h1>
      <p className="muted">Módulo preparado para implementação incremental.</p>
    </main>
  )
}