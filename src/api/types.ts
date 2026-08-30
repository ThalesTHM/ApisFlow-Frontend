export type UserRole = 'ADMIN' | 'MANAGER' | 'OPERATOR'
export type QueenStatus = 'PRESENT' | 'ABSENT' | 'UNKNOWN'
export type ColonyStatus = 'STRONG' | 'MODERATE' | 'WEAK' | 'INACTIVE'
export type ProductionCycleStatus = 'PLANNED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'
export type HoneyQuality = 'STANDARD' | 'PREMIUM'
export type HoneyBatchStatus = 'AVAILABLE' | 'DEPLETED' | 'BLOCKED'
export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED'

export interface Tenant { id: string; name: string; slug: string }
export interface User {
  id: string; tenantId: string; name: string; email: string; role: UserRole
  isActive: boolean; createdAt: string; updatedAt: string
}
export interface AuthResponse { accessToken: string; tenant: Tenant; user: User }
export interface LoginRequest { tenantSlug: string; email: string; password: string }
export interface RegisterRequest extends LoginRequest { tenantName: string; name: string }

export interface Apiary {
  id: string; tenantId: string; name: string; location: string
  latitude: string | null; longitude: string | null; description: string | null
  createdAt: string; updatedAt: string
}
export interface Hive {
  id: string; tenantId: string; apiaryId: string; code: string
  queenStatus: QueenStatus; colonyStatus: ColonyStatus; installationDate: string
  notes: string | null; createdAt: string; updatedAt: string
}
export interface ProductionCycle {
  id: string; tenantId: string; hiveId: string; startDate: string; endDate: string | null
  status: ProductionCycleStatus; estimatedProductionKg: string | null
  actualProductionKg: string | null; notes: string | null
}
export interface HoneyBatch {
  id: string; tenantId: string; productionCycleId: string; code: string
  productionDate: string; quantityKg: string; availableQuantityKg: string
  quality: HoneyQuality; status: HoneyBatchStatus
}
export interface OrderItem {
  id: string; tenantId: string; orderId: string; honeyBatchId: string
  quantityKg: string; unitPrice: string; subtotal: string; honeyBatch?: HoneyBatch & {
    productionCycle?: ProductionCycle & { hive?: Hive }
  }
}
export interface Order {
  id: string; tenantId: string; customerName: string; customerDocument: string
  status: OrderStatus; total: string; createdAt: string; items?: OrderItem[]
}

export interface ApiErrorBody {
  statusCode: number; error: string; message: string | string[]; path: string
  timestamp: string; requestId?: string
}

export interface CreateUserRequest { name: string; email: string; password: string; role: UserRole }
export type UpdateUserRequest = Partial<CreateUserRequest> & { isActive?: boolean }
export interface ApiaryRequest {
  name: string; location: string; latitude?: number; longitude?: number; description?: string
}
export interface HiveRequest {
  apiaryId: string; code: string; queenStatus?: QueenStatus; colonyStatus?: ColonyStatus
  installationDate: string; notes?: string
}
export interface ProductionCycleRequest {
  hiveId: string; startDate: string; endDate?: string; status?: ProductionCycleStatus
  estimatedProductionKg?: number; actualProductionKg?: number; notes?: string
}
export interface HoneyBatchRequest {
  productionCycleId: string; code: string; productionDate: string; quantityKg: number
  quality: HoneyQuality; status?: HoneyBatchStatus
}
export interface CreateOrderRequest {
  customerName: string; customerDocument: string
  items: Array<{ honeyBatchId: string; quantityKg: number; unitPrice: number }>
}