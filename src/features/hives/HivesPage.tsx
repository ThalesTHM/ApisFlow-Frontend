import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { api } from '../../api/client'
import type { Apiary, Hive } from '../../api/types'
import { useAuth } from '../../auth/useAuth'
import { CrudPage } from '../../components/CrudPage'
import { Badge } from '../../components/ui'

const schema = () => z.object({ apiaryId: z.uuid('Selecione um apiário.'), code: z.string().min(1, 'Informe o código.').max(50), queenStatus: z.enum(['PRESENT', 'ABSENT', 'UNKNOWN']), colonyStatus: z.enum(['STRONG', 'MODERATE', 'WEAK', 'INACTIVE']), installationDate: z.iso.date('Informe uma data válida.'), notes: z.string().max(1000).optional() })

export function HivesPage() {
  const { canManage } = useAuth()
  const apiaries = useQuery({ queryKey: ['apiaries'], queryFn: () => api.get<Apiary[]>('/apiaries') })
  const name = (id: string) => apiaries.data?.find((item) => item.id === id)?.name ?? id.slice(0, 8)
  return <CrudPage<Hive> title="Colmeias" subtitle="Saúde da colônia, rainha e vínculo com o apiário." singular="Colmeia" endpoint="/hives" queryKey="hives" canManage={canManage} schema={schema} fields={[{ name: 'apiaryId', label: 'Apiário', type: 'select', options: apiaries.data?.map((item) => ({ value: item.id, label: item.name })) }, { name: 'code', label: 'Código' }, { name: 'queenStatus', label: 'Rainha', type: 'select', options: [{ value: 'PRESENT', label: 'Presente' }, { value: 'ABSENT', label: 'Ausente' }, { value: 'UNKNOWN', label: 'Desconhecida' }] }, { name: 'colonyStatus', label: 'Colônia', type: 'select', options: [{ value: 'STRONG', label: 'Forte' }, { value: 'MODERATE', label: 'Moderada' }, { value: 'WEAK', label: 'Fraca' }, { value: 'INACTIVE', label: 'Inativa' }] }, { name: 'installationDate', label: 'Data de instalação', type: 'date' }, { name: 'notes', label: 'Observações', type: 'textarea' }]} columns={[{ label: 'Código', render: (item) => <strong>{item.code}</strong> }, { label: 'Apiário', render: (item) => name(item.apiaryId) }, { label: 'Colônia', render: (item) => <Badge value={item.colonyStatus} /> }, { label: 'Rainha', render: (item) => <Badge value={item.queenStatus} /> }]} initialValues={(item) => ({ apiaryId: item?.apiaryId, code: item?.code, queenStatus: item?.queenStatus ?? 'UNKNOWN', colonyStatus: item?.colonyStatus ?? 'MODERATE', installationDate: item?.installationDate?.slice(0, 10), notes: item?.notes ?? '' })} toPayload={(values) => { if (!values.notes) delete values.notes; return values }} />
}