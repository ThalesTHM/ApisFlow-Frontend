import type { FormHTMLAttributes, ReactNode } from 'react'

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
  return <header className="page-header"><div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h1>{title}</h1>{description && <p>{description}</p>}</div>{actions && <PageActions>{actions}</PageActions>}</header>
}

export function PageActions({ children }: { children: ReactNode }) {
  return <div className="page-actions">{children}</div>
}

export function ContentCard({ title, description, actions, children, className = '' }: { title?: string; description?: string; actions?: ReactNode; children: ReactNode; className?: string }) {
  return <section className={`content-card ${className}`}>{(title || description || actions) && <header className="content-card__header"><div>{title && <h2>{title}</h2>}{description && <p>{description}</p>}</div>{actions}</header>}<div className="content-card__body">{children}</div></section>
}

interface PagePatternProps { title: string; description?: string; actions?: ReactNode; children: ReactNode }

export function TablePage({ title, description, actions, children }: PagePatternProps) {
  return <main className="page table-page"><PageHeader title={title} description={description} actions={actions} />{children}</main>
}

export function DetailPage({ title, description, actions, children }: PagePatternProps) {
  return <main className="page detail-page"><PageHeader title={title} description={description} actions={actions} /><div className="detail-layout">{children}</div></main>
}

export function FormPage({ title, description, actions, children, ...formProps }: PagePatternProps & Omit<FormHTMLAttributes<HTMLFormElement>, 'title'>) {
  return <main className="page form-page"><PageHeader title={title} description={description} actions={actions} /><form className="form-layout" {...formProps}>{children}</form></main>
}