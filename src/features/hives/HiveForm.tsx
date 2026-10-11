import { zodResolver } from '@hookform/resolvers/zod'
import { LoaderCircle } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import type { Apiary, Hive } from '../../api/types'
import { ContentCard, FormPage } from '../../components/PageLayouts'
import { Button, Input, Select, Textarea } from '../../components/ui'
import { formatStatus } from '../../utils/format'
import { hiveSchema, toHiveRequest, type HiveFormValues } from './hive-schema'

const queenStatuses = ['PRESENT', 'ABSENT', 'UNKNOWN'] as const
const colonyStatuses = ['STRONG', 'MODERATE', 'WEAK', 'INACTIVE'] as const

export function HiveForm({ hive, apiaries, busy, onSubmit, onCancel }: { hive?: Hive; apiaries: Apiary[]; busy: boolean; onSubmit: (values: ReturnType<typeof toHiveRequest>) => Promise<unknown>; onCancel: () => void }) {
  const [serverError, setServerError] = useState('')
  const { register, handleSubmit, formState: { errors } } = useForm<HiveFormValues>({
    resolver: zodResolver(hiveSchema),
    defaultValues: { apiaryId: hive?.apiaryId ?? '', code: hive?.code ?? '', queenStatus: hive?.queenStatus ?? 'UNKNOWN', colonyStatus: hive?.colonyStatus ?? 'MODERATE', installationDate: hive?.installationDate.slice(0, 10) ?? '', notes: hive?.notes ?? '' },
  })
  const submit = handleSubmit(async (values) => {
    try { setServerError(''); await onSubmit(toHiveRequest(values)) }
    catch (error) { setServerError(error instanceof Error ? error.message : 'Não foi possível salvar a colmeia.') }
  })
  return <FormPage title={hive ? 'Editar colmeia' : 'Nova colmeia'} description="O código deve ser único na cooperativa." onSubmit={submit} noValidate><ContentCard title="Dados da colmeia"><div className="resource-form"><div className="resource-form-grid"><Select label="Apiário" options={apiaries.map((apiary) => ({ value: apiary.id, label: apiary.name }))} error={errors.apiaryId?.message} {...register('apiaryId')} /><Input label="Código" autoFocus error={errors.code?.message} {...register('code')} /><Select label="Situação da rainha" options={queenStatuses.map((status) => ({ value: status, label: formatStatus(status) }))} error={errors.queenStatus?.message} {...register('queenStatus')} /><Select label="Situação da colônia" options={colonyStatuses.map((status) => ({ value: status, label: formatStatus(status) }))} error={errors.colonyStatus?.message} {...register('colonyStatus')} /><Input label="Data de instalação" type="date" error={errors.installationDate?.message} {...register('installationDate')} /><Textarea label="Observações" rows={5} error={errors.notes?.message} {...register('notes')} /></div>{serverError && <p className="form-error form-pad" role="alert">{serverError}</p>}<footer className="form-actions"><Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button><Button type="submit" disabled={busy}>{busy && <LoaderCircle className="spin" size={17} />} Salvar colmeia</Button></footer></div></ContentCard></FormPage>
}