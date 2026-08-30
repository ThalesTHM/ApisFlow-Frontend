import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useDeferredValue, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import type { z } from 'zod'
import { api } from '../api/client'
import { Button, ConfirmDialog, EmptyState, ErrorState, Modal, Spinner } from './ui'

export interface Entity { id: string }
export interface FieldOption { value: string; label: string }
export interface FieldDefinition {
  name: string; label: string; type?: 'text' | 'email' | 'password' | 'date' | 'number' | 'select' | 'textarea' | 'checkbox'
  options?: FieldOption[]; placeholder?: string; step?: string; hiddenOnCreate?: boolean
}
export interface Column<T> { label: string; render: (item: T) => ReactNode }

interface CrudPageProps<T extends Entity> {
  title: string; subtitle: string; singular: string; endpoint: string; queryKey: string
  columns: Column<T>[]; fields: FieldDefinition[]; canManage: boolean
  schema: (editing: boolean) => z.ZodType<unknown>
  initialValues: (item?: T) => Record<string, string | boolean | undefined>
  toPayload: (values: Record<string, unknown>, editing: boolean) => unknown
}

function ResourceForm<T extends Entity>({ item, fields, schema, initialValues, toPayload, busy, onSubmit, onClose }: Pick<CrudPageProps<T>, 'fields' | 'schema' | 'initialValues' | 'toPayload'> & { item: T | null; busy: boolean; onSubmit: (body: unknown) => void; onClose: () => void }) {
  const [errors, setErrors] = useState<Record<string, string>>({})
  const defaults = initialValues(item ?? undefined)
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const values: Record<string, unknown> = {}
    new FormData(form).forEach((value, key) => { values[key] = value })
    for (const field of fields.filter((value) => value.type === 'checkbox')) values[field.name] = form.elements.namedItem(field.name) instanceof HTMLInputElement && (form.elements.namedItem(field.name) as HTMLInputElement).checked
    const parsed = schema(Boolean(item)).safeParse(values)
    if (!parsed.success) {
      const next: Record<string, string> = {}
      for (const issue of parsed.error.issues) next[String(issue.path[0] ?? '_')] = issue.message
      setErrors(next)
      return
    }
    onSubmit(toPayload(parsed.data as Record<string, unknown>, Boolean(item)))
  }
  return <form className="resource-form" onSubmit={submit} noValidate><div className="resource-form-grid">{fields.filter((field) => !(field.hiddenOnCreate && !item)).map((field) => <label className={`field ${field.type === 'textarea' ? 'field--wide' : ''}`} key={field.name}><span>{field.label}</span>{field.type === 'select' ? <select name={field.name} defaultValue={String(defaults[field.name] ?? '')} aria-invalid={Boolean(errors[field.name])}><option value="">Selecione</option>{field.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select> : field.type === 'textarea' ? <textarea name={field.name} defaultValue={String(defaults[field.name] ?? '')} placeholder={field.placeholder} aria-invalid={Boolean(errors[field.name])} /> : field.type === 'checkbox' ? <input name={field.name} type="checkbox" defaultChecked={Boolean(defaults[field.name])} aria-invalid={Boolean(errors[field.name])} /> : <input name={field.name} type={field.type ?? 'text'} defaultValue={String(defaults[field.name] ?? '')} placeholder={field.placeholder} step={field.step} aria-invalid={Boolean(errors[field.name])} />}{errors[field.name] && <small role="alert">{errors[field.name]}</small>}</label>)}</div>{errors._ && <p className="form-error">{errors._}</p>}<footer className="form-actions"><Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button><Button type="submit" disabled={busy}>{busy ? 'Salvando…' : 'Salvar'}</Button></footer></form>
}

export function CrudPage<T extends Entity>(props: CrudPageProps<T>) {
  const { title, subtitle, singular, endpoint, queryKey, columns, canManage } = props
  const client = useQueryClient()
  const [editing, setEditing] = useState<T | null | undefined>(undefined)
  const [deleting, setDeleting] = useState<T | null>(null)
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search.toLocaleLowerCase())
  const query = useQuery({ queryKey: [queryKey], queryFn: () => api.get<T[]>(endpoint) })
  const save = useMutation({ mutationFn: (body: unknown) => editing ? api.patch<T>(`${endpoint}/${editing.id}`, body) : api.post<T>(endpoint, body), onSuccess: async () => { await client.invalidateQueries({ queryKey: [queryKey] }); toast.success(`${singular} ${editing ? 'atualizado' : 'criado'} com sucesso.`); setEditing(undefined) }, onError: (error) => toast.error(error instanceof Error ? error.message : 'Não foi possível salvar.') })
  const remove = useMutation({ mutationFn: (item: T) => api.delete(`${endpoint}/${item.id}`), onSuccess: async () => { await client.invalidateQueries({ queryKey: [queryKey] }); toast.success(`${singular} excluído com sucesso.`); setDeleting(null) }, onError: (error) => toast.error(error instanceof Error ? error.message : 'Não foi possível excluir.') })
  const rows = (query.data ?? []).filter((item) => JSON.stringify(item).toLocaleLowerCase().includes(deferredSearch))

  return <main className="page"><header className="page-header"><div><p className="eyebrow">Cadastros</p><h1>{title}</h1><p>{subtitle}</p></div>{canManage && <Button onClick={() => setEditing(null)}><Plus size={17} /> Novo</Button>}</header><div className="table-toolbar"><label><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar registros" aria-label={`Buscar em ${title}`} /></label><span>{rows.length} registro{rows.length === 1 ? '' : 's'}</span></div>{query.isLoading ? <Spinner /> : query.isError ? <ErrorState error={query.error} onRetry={() => query.refetch()} /> : rows.length === 0 ? <EmptyState title={search ? 'Nenhum resultado' : `Nenhum ${singular.toLowerCase()}`} description={search ? 'Tente outro termo de busca.' : 'Os registros cadastrados aparecerão aqui.'} /> : <div className="table-wrap"><table><thead><tr>{columns.map((column) => <th key={column.label}>{column.label}</th>)}{canManage && <th><span className="sr-only">Ações</span></th>}</tr></thead><tbody>{rows.map((item) => <tr key={item.id}>{columns.map((column) => <td key={column.label} data-label={column.label}>{column.render(item)}</td>)}{canManage && <td className="row-actions"><button className="icon-button" onClick={() => setEditing(item)} aria-label={`Editar ${singular}`}><Pencil size={16} /></button><button className="icon-button danger-icon" onClick={() => setDeleting(item)} aria-label={`Excluir ${singular}`}><Trash2 size={16} /></button></td>}</tr>)}</tbody></table></div>}{editing !== undefined && <Modal title={`${editing ? 'Editar' : 'Novo'} ${singular.toLowerCase()}`} onClose={() => setEditing(undefined)}><ResourceForm {...props} item={editing} busy={save.isPending} onSubmit={(body) => save.mutate(body)} onClose={() => setEditing(undefined)} /></Modal>}{deleting && <ConfirmDialog title={`Excluir ${singular.toLowerCase()}?`} description="Esta ação não pode ser desfeita e pode ser recusada se houver registros relacionados." busy={remove.isPending} onConfirm={() => remove.mutate(deleting)} onClose={() => setDeleting(null)} />}</main>
}