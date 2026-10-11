import { zodResolver } from '@hookform/resolvers/zod'
import { LoaderCircle } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import type { Apiary } from '../../api/types'
import { ContentCard, FormPage } from '../../components/PageLayouts'
import { Button, Input, Textarea } from '../../components/ui'
import { apiarySchema, toApiaryRequest, type ApiaryFormValues } from './apiary-schema'

export function ApiaryForm({ apiary, busy, onSubmit, onCancel }: { apiary?: Apiary; busy: boolean; onSubmit: (values: ReturnType<typeof toApiaryRequest>) => Promise<unknown>; onCancel: () => void }) {
  const [serverError, setServerError] = useState('')
  const { register, handleSubmit, formState: { errors } } = useForm<ApiaryFormValues>({
    resolver: zodResolver(apiarySchema),
    defaultValues: {
      name: apiary?.name ?? '', location: apiary?.location ?? '', latitude: apiary?.latitude ?? '',
      longitude: apiary?.longitude ?? '', description: apiary?.description ?? '',
    },
  })
  const submit = handleSubmit(async (values) => {
    try { setServerError(''); await onSubmit(toApiaryRequest(values)) }
    catch (error) { setServerError(error instanceof Error ? error.message : 'Não foi possível salvar o apiário.') }
  })

  return <FormPage title={apiary ? 'Editar apiário' : 'Novo apiário'} description="Informe os dados do local. Latitude e longitude são opcionais, mas devem ser preenchidas juntas." onSubmit={submit} noValidate><ContentCard title="Dados do apiário"><div className="resource-form"><div className="resource-form-grid"><Input label="Nome" autoFocus error={errors.name?.message} {...register('name')} /><Input label="Localização" error={errors.location?.message} {...register('location')} /><Input label="Latitude" type="number" step="0.000001" placeholder="-23.550520" error={errors.latitude?.message} {...register('latitude')} /><Input label="Longitude" type="number" step="0.000001" placeholder="-46.633308" error={errors.longitude?.message} {...register('longitude')} /><Textarea label="Descrição" rows={5} error={errors.description?.message} {...register('description')} /></div>{serverError && <p className="form-error form-pad" role="alert">{serverError}</p>}<footer className="form-actions"><Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button><Button type="submit" disabled={busy}>{busy && <LoaderCircle className="spin" size={17} />} Salvar apiário</Button></footer></div></ContentCard></FormPage>
}