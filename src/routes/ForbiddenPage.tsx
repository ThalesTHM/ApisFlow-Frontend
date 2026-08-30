import { Link } from 'react-router-dom'
import { ContentCard, PageHeader } from '../components/PageLayouts'

export function ForbiddenPage() {
  return <main className="page"><PageHeader eyebrow="Acesso restrito" title="Permissão insuficiente" description="Seu perfil não permite acessar este módulo." /><ContentCard><Link className="button button--primary button-link" to="/">Voltar ao dashboard</Link></ContentCard></main>
}