import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { api } from '../../api/client'
import type { HoneyBatch, ProductionCycle } from '../../api/types'
import { useAuth } from '../../auth/useAuth'
import { CrudPage } from '../../components/CrudPage'
import { Badge } from '../../components/ui'

const schema = (editing: boolean) => z.object({ productionCycleId: z.uuid('Selecione um ciclo.'), code: z.string().min(1, 'Informe o código.').max(50), productionDate: z.iso.date(), quantityKg: z.coerce.number().min(0.01, 'Informe uma quantidade positiva.'), quality: z.enum(['STANDARD', 'PREMIUM']), status: z.enum(editing ? ['AVAILABLE', 'DEPLETED', 'BLOCKED'] : ['AVAILABLE', 'BLOCKED']) })

export function HoneyBatchesPage() {
  const { canManage } = useAuth()
  const cycles = useQuery({ queryKey: ['production-cycles'], queryFn: () => api.get<ProductionCycle[]>('/production-cycles') })
  const name = (id: string) => cycles.data?.find((item) => item.id === id)?.startDate.slice(0, 10) ?? id.slice(0, 8)
  return <CrudPage<HoneyBatch> title="Lotes de mel" subtitle="Estoque disponível e rastreabilidade da produção." singular="Lote" endpoint="/honey-batches" queryKey="honey-batches" canManage={canManage} schema={schema} fields={[{ name: 'productionCycleId', label: 'Ciclo de origem', type: 'select', options: cycles.data?.map((item) => ({ value: item.id, label: `${item.startDate.slice(0, 10)} · ${item.status}` })) }, { name: 'code', label: 'Código' }, { name: 'productionDate', label: 'Data de produção', type: 'date' }, { name: 'quantityKg', label: 'Quantidade total (kg)', type: 'number', step: '0.01' }, { name: 'quality', label: 'Qualidade', type: 'select', options: [{ value: 'STANDARD', label: 'Padrão' }, { value: 'PREMIUM', label: 'Premium' }] }, { name: 'status', label: 'Situação', type: 'select', options: [{ value: 'AVAILABLE', label: 'Disponível' }, { value: 'BLOCKED', label: 'Bloqueado' }, { value: 'DEPLETED', label: 'Esgotado' }] }]} columns={[{ label: 'Código', render: (item) => <strong>{item.code}</strong> }, { label: 'Ciclo', render: (item) => name(item.productionCycleId) }, { label: 'Disponível', render: (item) => `${item.availableQuantityKg} kg` }, { label: 'Qualidade', render: (item) => <Badge value={item.quality} /> }, { label: 'Situação', render: (item) => <Badge value={item.status} /> }]} initialValues={(item) => ({ productionCycleId: item?.productionCycleId, code: item?.code, productionDate: item?.productionDate?.slice(0, 10), quantityKg: item?.quantityKg, quality: item?.quality ?? 'STANDARD', status: item?.status ?? 'AVAILABLE' })} toPayload={(values) => values} />
}