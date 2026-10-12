import Decimal from 'decimal.js'
import type { Apiary, ColonyStatus, Hive, HoneyBatch, HoneyBatchStatus, HoneyQuality, Order, OrderStatus, ProductionCycle, ProductionCycleStatus } from '../../api/types'

export function countByStatus<T, S extends string>(items: T[], getStatus: (item: T) => S, statuses: readonly S[]): Record<S, number> {
  const counts = Object.fromEntries(statuses.map((status) => [status, 0])) as Record<S, number>
  items.forEach((item) => { counts[getStatus(item)] += 1 })
  return counts
}

export function selectDashboardMetrics(resources: { apiaries: Apiary[]; hives: Hive[]; cycles: ProductionCycle[]; batches: HoneyBatch[]; orders: Order[] }) {
  const orderCounts = countByStatus(resources.orders, (order) => order.status, ['PENDING', 'CONFIRMED', 'CANCELLED'] as const)
  return {
    totalApiaries: resources.apiaries.length,
    totalHives: resources.hives.length,
    activeProductionCycles: resources.cycles.filter((cycle) => cycle.status === 'ACTIVE').length,
    availableHoneyKg: resources.batches.reduce((total, batch) => total.plus(batch.availableQuantityKg), new Decimal(0)).toFixed(2),
    pendingOrders: orderCounts.PENDING,
    confirmedOrders: orderCounts.CONFIRMED,
    cancelledOrders: orderCounts.CANCELLED,
  }
}

export function selectHiveStatusSummary(hives: Hive[]) {
  return countByStatus(hives, (hive) => hive.colonyStatus, ['STRONG', 'MODERATE', 'WEAK', 'INACTIVE'] as ColonyStatus[])
}

export function selectCycleStatusSummary(cycles: ProductionCycle[]) {
  return countByStatus(cycles, (cycle) => cycle.status, ['PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED'] as ProductionCycleStatus[])
}

export function selectBatchSummary(batches: HoneyBatch[]) {
  return {
    quality: countByStatus(batches, (batch) => batch.quality, ['STANDARD', 'PREMIUM'] as HoneyQuality[]),
    status: countByStatus(batches, (batch) => batch.status, ['AVAILABLE', 'DEPLETED', 'BLOCKED'] as HoneyBatchStatus[]),
  }
}

export function selectOrderStatusSummary(orders: Order[]) {
  return countByStatus(orders, (order) => order.status, ['PENDING', 'CONFIRMED', 'CANCELLED'] as OrderStatus[])
}

export function selectRecentOrders(orders: Order[], limit = 5) {
  return [...orders].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()).slice(0, limit)
}