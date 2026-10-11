import Decimal from 'decimal.js'
import { zodResolver } from '@hookform/resolvers/zod'
import { LoaderCircle, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import type { HoneyBatch } from '../../api/types'
import { ContentCard, FormPage } from '../../components/PageLayouts'
import { Button, Input, Select } from '../../components/ui'
import { formatCurrency, formatKilograms } from '../../utils/format'
import { calculateOrderTotal, orderSchema, toCreateOrderRequest, type OrderFormValues } from './order-schema'

const emptyItem = { honeyBatchId: '', quantityKg: '', unitPrice: '' }

function itemSubtotal(quantity: string | undefined, unitPrice: string | undefined) {
  try { return new Decimal(quantity || 0).times(unitPrice || 0) } catch { return new Decimal(0) }
}

export function OrderForm({ batches, busy, onSubmit, onCancel }: { batches: HoneyBatch[]; busy: boolean; onSubmit: (values: ReturnType<typeof toCreateOrderRequest>) => Promise<unknown>; onCancel: () => void }) {
  const [serverError, setServerError] = useState('')
  const { control, register, handleSubmit, formState: { errors } } = useForm<OrderFormValues>({ resolver: zodResolver(orderSchema), defaultValues: { customerName: '', customerPhone: '', items: [emptyItem] } })
  const { fields, append, remove } = useFieldArray({ control, name: 'items' })
  const items = useWatch({ control, name: 'items' }) ?? []
  const submit = handleSubmit(async (values) => { try { setServerError(''); await onSubmit(toCreateOrderRequest(values)) } catch (error) { setServerError(error instanceof Error ? error.message : 'Não foi possível criar o pedido.') } })
  const batchOptions = batches.map((batch) => ({ value: batch.id, label: `${batch.code} · ${formatKilograms(batch.availableQuantityKg)} disponíveis` }))
  return <FormPage title="Novo pedido" description="O total definitivo e a baixa de estoque são processados pelo servidor." onSubmit={submit} noValidate><ContentCard title="Cliente"><div className="resource-form-grid"><Input label="Nome do cliente" autoFocus error={errors.customerName?.message} {...register('customerName')} /><Input label="Telefone" error={errors.customerPhone?.message} {...register('customerPhone')} /></div></ContentCard><ContentCard title="Itens" description="Cada lote pode aparecer somente uma vez."><div className="order-items">{fields.map((field, index) => <div className="order-item" key={field.id}><span className="order-item__number">{index + 1}</span><Select label="Lote de mel" options={batchOptions} error={errors.items?.[index]?.honeyBatchId?.message} {...register(`items.${index}.honeyBatchId`)} /><Input label="Quantidade (kg)" inputMode="decimal" placeholder="0.00" error={errors.items?.[index]?.quantityKg?.message} {...register(`items.${index}.quantityKg`)} /><Input label="Preço unitário" inputMode="decimal" placeholder="0.00" error={errors.items?.[index]?.unitPrice?.message} {...register(`items.${index}.unitPrice`)} /><div className="order-item__subtotal"><span>Subtotal</span><strong>{formatCurrency(itemSubtotal(items[index]?.quantityKg, items[index]?.unitPrice))}</strong></div><button type="button" className="icon-button danger-icon" disabled={fields.length === 1} onClick={() => remove(index)} aria-label={`Remover item ${index + 1}`} title="Remover item"><Trash2 size={17} /></button></div>)}{errors.items?.root?.message && <p className="form-error" role="alert">{errors.items.root.message}</p>}<Button type="button" variant="secondary" className="add-order-item" onClick={() => append(emptyItem)}><Plus size={17} /> Adicionar item</Button></div></ContentCard><ContentCard className="order-summary" title="Prévia do pedido"><div className="order-total"><span>Total estimado</span><strong>{formatCurrency(calculateOrderTotal(items))}</strong></div></ContentCard>{serverError && <p className="form-error" role="alert">{serverError}</p>}<footer className="form-actions"><Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button><Button type="submit" disabled={busy}>{busy && <LoaderCircle className="spin" size={17} />} Criar pedido</Button></footer></FormPage>
}