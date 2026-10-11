import Decimal from 'decimal.js'
import type { ColonyStatus, HoneyBatchStatus, HoneyQuality, OrderStatus, ProductionCycleStatus, QueenStatus, UserRole } from '../api/types'

type DomainStatus = UserRole | QueenStatus | ColonyStatus | ProductionCycleStatus | HoneyQuality | HoneyBatchStatus | OrderStatus

const statusLabels: Record<DomainStatus, string> = {
  ADMIN: 'Administrador', MANAGER: 'Gestor', OPERATOR: 'Operador',
  PRESENT: 'Presente', ABSENT: 'Ausente', UNKNOWN: 'Desconhecido',
  STRONG: 'Forte', MODERATE: 'Moderada', WEAK: 'Fraca', INACTIVE: 'Inativa',
  PLANNED: 'Planejado', ACTIVE: 'Ativo', COMPLETED: 'Concluído', CANCELLED: 'Cancelado',
  STANDARD: 'Padrão', PREMIUM: 'Premium', AVAILABLE: 'Disponível', DEPLETED: 'Esgotado', BLOCKED: 'Bloqueado',
  PENDING: 'Pendente', CONFIRMED: 'Confirmado',
}

const decimalFormatter = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const dateFormatter = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' })

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—'
  const date = value instanceof Date ? value : new Date(value.length === 10 ? `${value}T00:00:00Z` : value)
  return Number.isNaN(date.getTime()) ? '—' : dateFormatter.format(date)
}

export function formatKilograms(value: Decimal.Value | null | undefined): string {
  return value === null || value === undefined ? '—' : `${decimalFormatter.format(new Decimal(value).toNumber())} kg`
}

export function formatCurrency(value: Decimal.Value | null | undefined): string {
  return value === null || value === undefined ? '—' : currencyFormatter.format(new Decimal(value).toDecimalPlaces(2).toNumber())
}

export function formatStatus(value: DomainStatus): string {
  return statusLabels[value]
}