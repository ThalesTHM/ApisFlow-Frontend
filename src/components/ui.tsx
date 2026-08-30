import { LoaderCircle, X } from 'lucide-react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

export function Button({ className = '', variant = 'primary', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost' }) {
  return <button className={`button button--${variant} ${className}`} {...props} />
}

export function Spinner({ label = 'Carregando' }: { label?: string }) {
  return <div className="state-message" role="status"><LoaderCircle className="spin" size={22} /><span>{label}</span></div>
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return <div className="empty-state"><strong>{title}</strong><p>{description}</p></div>
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const message = error instanceof Error ? error.message : 'Não foi possível carregar os dados.'
  return <div className="error-state" role="alert"><strong>Algo deu errado</strong><p>{message}</p>{onRetry && <Button variant="secondary" onClick={onRetry}>Tentar novamente</Button>}</div>
}

export function Badge({ value }: { value: string }) {
  return <span className={`badge badge--${value.toLowerCase()}`}>{value.replaceAll('_', ' ')}</span>
}

export function Modal({ title, children, onClose, wide = false }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className={`modal ${wide ? 'modal--wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <header><h2 id="modal-title">{title}</h2><button className="icon-button" onClick={onClose} aria-label="Fechar"><X size={19} /></button></header>
      {children}
    </section>
  </div>
}

export function ConfirmDialog({ title, description, busy, onConfirm, onClose }: { title: string; description: string; busy?: boolean; onConfirm: () => void; onClose: () => void }) {
  return <Modal title={title} onClose={onClose}><p className="dialog-copy">{description}</p><footer className="form-actions"><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button variant="danger" disabled={busy} onClick={onConfirm}>{busy ? 'Excluindo…' : 'Excluir'}</Button></footer></Modal>
}