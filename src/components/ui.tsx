import { LoaderCircle, X } from 'lucide-react'
import { forwardRef, useId, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react'

export function Button({ className = '', variant = 'primary', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost' }) {
  return <button className={`button button--${variant} ${className}`} {...props} />
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }>(function Input({ label, error, id, ...props }, ref) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  return <div className="field"><label htmlFor={inputId}>{label}</label><input ref={ref} id={inputId} {...props} aria-invalid={Boolean(error)} aria-describedby={error ? `${inputId}-error` : undefined} />{error && <small id={`${inputId}-error`} role="alert">{error}</small>}</div>
})

export interface SelectOption { value: string; label: string }

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & { label: string; error?: string; options: SelectOption[]; placeholder?: string }>(function Select({ label, error, options, placeholder = 'Selecione', id, ...props }, ref) {
  const generatedId = useId()
  const selectId = id ?? generatedId
  return <div className="field"><label htmlFor={selectId}>{label}</label><select ref={ref} id={selectId} {...props} aria-invalid={Boolean(error)} aria-describedby={error ? `${selectId}-error` : undefined}><option value="">{placeholder}</option>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>{error && <small id={`${selectId}-error`} role="alert">{error}</small>}</div>
})

export interface TableColumn<T> { key: string; header: ReactNode; render: (row: T) => ReactNode }

export function Table<T>({ columns, rows, getRowKey, caption }: { columns: TableColumn<T>[]; rows: T[]; getRowKey: (row: T) => string; caption?: string }) {
  return <div className="table-wrap"><table>{caption && <caption className="sr-only">{caption}</caption>}<thead><tr>{columns.map((column) => <th key={column.key}>{column.header}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={getRowKey(row)}>{columns.map((column) => <td key={column.key}>{column.render(row)}</td>)}</tr>)}</tbody></table></div>
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

export function Dialog({ title, children, onClose, wide = false }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className={`modal ${wide ? 'modal--wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <header><h2 id="modal-title">{title}</h2><button type="button" className="icon-button" onClick={onClose} aria-label="Fechar"><X size={19} /></button></header>
      {children}
    </section>
  </div>
}

export const Modal = Dialog

export function ConfirmDialog({ title, description, busy, onConfirm, onClose }: { title: string; description: string; busy?: boolean; onConfirm: () => void; onClose: () => void }) {
  return <Dialog title={title} onClose={onClose}><p className="dialog-copy">{description}</p><footer className="form-actions"><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button variant="danger" disabled={busy} onClick={onConfirm}>{busy ? 'Processando…' : 'Confirmar'}</Button></footer></Dialog>
}