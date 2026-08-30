import { ContentCard, PageHeader } from '../components/PageLayouts'

export function RoutePlaceholder({ title }: { title: string }) {
  return (
    <main className="page">
      <PageHeader eyebrow="Honey Manager" title={title} description="Módulo preparado para implementação incremental." />
      <ContentCard title="Conteúdo do módulo"><p className="muted">Os recursos deste módulo serão adicionados em uma entrega dedicada.</p></ContentCard>
    </main>
  )
}