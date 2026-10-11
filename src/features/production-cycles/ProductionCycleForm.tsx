import { zodResolver } from '@hookform/resolvers/zod'
import { LoaderCircle } from 'lucide-react'
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import type { Hive, ProductionCycle } from '../../api/types'
import { ContentCard, FormPage } from '../../components/PageLayouts'
import { Button, Input, Select, Textarea } from '../../components/ui'
import { formatStatus } from '../../utils/format'
import { productionCycleSchema, toProductionCycleRequest, type ProductionCycleFormValues } from './production-cycle-schema'

const statuses = ['PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED'] as const

export function ProductionCycleForm({ cycle, hives, busy, onSubmit, onCancel }: { cycle?: ProductionCycle; hives: Hive[]; busy: boolean; onSubmit: (values: ReturnType<typeof toProductionCycleRequest>) => Promise<unknown>; onCancel: () => void }) {
  const [serverError, setServerError] = useState('')
  const { control, register, handleSubmit, formState: { errors } } = useForm<ProductionCycleFormValues>({ resolver: zodResolver(productionCycleSchema), defaultValues: { hiveId: cycle?.hiveId ?? '', startDate: cycle?.startDate.slice(0, 10) ?? '', endDate: cycle?.endDate?.slice(0, 10) ?? '', status: cycle?.status ?? 'PLANNED', estimatedProductionKg: cycle?.estimatedProductionKg ?? '', actualProductionKg: cycle?.actualProductionKg ?? '', notes: cycle?.notes ?? '' } })
  const completed = useWatch({ control, name: 'status' }) === 'COMPLETED'
  const submit = handleSubmit(async (values) => { try { setServerError(''); await onSubmit(toProductionCycleRequest(values)) } catch (error) { setServerError(error instanceof Error ? error.message : 'Não foi possível salvar o ciclo.') } })
  return <FormPage title={cycle ? 'Editar ciclo de produção' : 'Novo ciclo de produção'} description="Cada colmeia pode ter somente um ciclo ativo." onSubmit={submit} noValidate><ContentCard title="Dados do ciclo"><div className="resource-form"><div className="resource-form-grid"><Select label="Colmeia" options={hives.map((hive) => ({ value: hive.id, label: hive.code }))} error={errors.hiveId?.message} {...register('hiveId')} /><Select label="Situação" options={statuses.map((status) => ({ value: status, label: formatStatus(status) }))} error={errors.status?.message} {...register('status')} /><Input label="Data inicial" type="date" error={errors.startDate?.message} {...register('startDate')} /><Input label="Data final" type="date" required={completed} error={errors.endDate?.message} {...register('endDate')} /><Input label="Produção estimada (kg)" inputMode="decimal" placeholder="0.00" error={errors.estimatedProductionKg?.message} {...register('estimatedProductionKg')} /><Input label="Produção real (kg)" inputMode="decimal" placeholder="0.00" required={completed} error={errors.actualProductionKg?.message} {...register('actualProductionKg')} /><Textarea label="Observações" rows={5} error={errors.notes?.message} {...register('notes')} /></div>{serverError && <p className="form-error form-pad" role="alert">{serverError}</p>}<footer className="form-actions"><Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button><Button type="submit" disabled={busy}>{busy && <LoaderCircle className="spin" size={17} />} Salvar ciclo</Button></footer></div></ContentCard></FormPage>
}