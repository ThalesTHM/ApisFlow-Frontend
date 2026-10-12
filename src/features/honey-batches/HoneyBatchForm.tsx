import Decimal from 'decimal.js'
import { zodResolver } from '@hookform/resolvers/zod'
import { LoaderCircle } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import type { HoneyBatch, ProductionCycle } from '../../api/types'
import { ContentCard, FormPage } from '../../components/PageLayouts'
import { Button, Input, Select } from '../../components/ui'
import { formatDate, formatKilograms, formatStatus } from '../../utils/format'
import { honeyBatchSchema, toHoneyBatchRequest, validateHoneyBatch, type HoneyBatchFormValues } from './honey-batch-schema'

const qualities = ['STANDARD', 'PREMIUM'] as const
const statuses = ['AVAILABLE', 'DEPLETED', 'BLOCKED'] as const

function cycleLabel(cycle: ProductionCycle) {
  return `${formatDate(cycle.startDate)} · ${formatStatus(cycle.status)}`
}

export function HoneyBatchForm({ batch, cycles, busy, onSubmit, onCancel }: { batch?: HoneyBatch; cycles: ProductionCycle[]; busy: boolean; onSubmit: (values: ReturnType<typeof toHoneyBatchRequest>) => Promise<unknown>; onCancel: () => void }) {
  const [serverError, setServerError] = useState('')
  const { register, handleSubmit, setError, formState: { errors } } = useForm<HoneyBatchFormValues>({
    resolver: zodResolver(honeyBatchSchema),
    defaultValues: {
      productionCycleId: batch?.productionCycleId ?? '', code: batch?.code ?? '', productionDate: batch?.productionDate.slice(0, 10) ?? '', quantityKg: batch?.quantityKg ?? '', quality: batch?.quality ?? 'STANDARD', status: batch?.status ?? 'AVAILABLE',
    },
  })
  const submit = handleSubmit(async (values) => {
    const businessErrors = validateHoneyBatch(values, batch)
    if (businessErrors.status) setError('status', { message: businessErrors.status })
    if (businessErrors.quantityKg) setError('quantityKg', { message: businessErrors.quantityKg })
    if (Object.keys(businessErrors).length) return
    try { setServerError(''); await onSubmit(toHoneyBatchRequest(values)) } catch (error) { setServerError(error instanceof Error ? error.message : 'Não foi possível salvar o lote.') }
  })
  const soldQuantity = batch ? new Decimal(batch.quantityKg).minus(batch.availableQuantityKg) : null
  const allowedStatuses = batch ? statuses : statuses.filter((status) => status !== 'DEPLETED')
  return <FormPage title={batch ? 'Editar lote de mel' : 'Novo lote de mel'} description="O estoque disponível é atualizado somente pelas operações de venda." onSubmit={submit} noValidate><ContentCard title="Dados do lote"><div className="resource-form"><div className="resource-form-grid"><Select label="Ciclo de produção" options={cycles.map((cycle) => ({ value: cycle.id, label: cycleLabel(cycle) }))} error={errors.productionCycleId?.message} {...register('productionCycleId')} /><Input label="Código" autoFocus error={errors.code?.message} {...register('code')} /><Input label="Data de produção" type="date" error={errors.productionDate?.message} {...register('productionDate')} /><Input label="Quantidade total (kg)" inputMode="decimal" placeholder="0.00" error={errors.quantityKg?.message} {...register('quantityKg')} /><Select label="Qualidade" options={qualities.map((quality) => ({ value: quality, label: formatStatus(quality) }))} error={errors.quality?.message} {...register('quality')} /><Select label="Situação" options={allowedStatuses.map((status) => ({ value: status, label: formatStatus(status) }))} error={errors.status?.message} {...register('status')} />{batch && <div className="stock-readonly field--wide"><span>Estoque controlado pelo sistema</span><strong>{formatKilograms(batch.availableQuantityKg)} disponíveis</strong><small>{formatKilograms(soldQuantity)} já vendidos</small></div>}</div>{serverError && <p className="form-error form-pad" role="alert">{serverError}</p>}<footer className="form-actions"><Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button><Button type="submit" disabled={busy}>{busy && <LoaderCircle className="spin" size={17} />} Salvar lote</Button></footer></div></ContentCard></FormPage>
}