import { z } from 'zod'
import type { Apiary } from '../../api/types'
import { useAuth } from '../../auth/useAuth'
import { CrudPage } from '../../components/CrudPage'

const decimal = (min: number, max: number) => z.preprocess((value) => value === '' ? undefined : Number(value), z.number().min(min).max(max).optional())
const schema = () => z.object({ name: z.string().min(2, 'Informe ao menos 2 caracteres.').max(100), location: z.string().min(2, 'Informe a localização.').max(200), latitude: decimal(-90, 90), longitude: decimal(-180, 180), description: z.string().max(1000).optional() }).refine((value) => (value.latitude === undefined) === (value.longitude === undefined), { message: 'Latitude e longitude devem ser informadas juntas.', path: ['latitude'] })

export function ApiariesPage() {
  const { canManage } = useAuth()
  return <CrudPage<Apiary> title="Apiários" subtitle="Locais de manejo e concentração das colmeias." singular="Apiário" endpoint="/apiaries" queryKey="apiaries" canManage={canManage} schema={schema} fields={[{ name: 'name', label: 'Nome' }, { name: 'location', label: 'Localização' }, { name: 'latitude', label: 'Latitude', type: 'number', step: '0.000001' }, { name: 'longitude', label: 'Longitude', type: 'number', step: '0.000001' }, { name: 'description', label: 'Descrição', type: 'textarea' }]} columns={[{ label: 'Nome', render: (item) => <strong>{item.name}</strong> }, { label: 'Localização', render: (item) => item.location }, { label: 'Coordenadas', render: (item) => item.latitude && item.longitude ? `${item.latitude}, ${item.longitude}` : 'Não informadas' }]} initialValues={(item) => ({ name: item?.name, location: item?.location, latitude: item?.latitude ?? '', longitude: item?.longitude ?? '', description: item?.description ?? '' })} toPayload={(values) => { if (values.latitude === undefined) { delete values.latitude; delete values.longitude } if (!values.description) delete values.description; return values }} />
}