import { describe, expect, it } from 'vitest'
import type { Apiary, Hive, HoneyBatch, Order, ProductionCycle } from '../../api/types'
import { selectBatchSummary, selectCycleStatusSummary, selectDashboardMetrics, selectHiveStatusSummary, selectRecentOrders } from './dashboard-selectors'

const apiaries = [{ id: 'a1' }, { id: 'a2' }] as Apiary[]
const hives = [{ id: 'h1', colonyStatus: 'STRONG' }, { id: 'h2', colonyStatus: 'WEAK' }, { id: 'h3', colonyStatus: 'STRONG' }] as Hive[]
const cycles = [{ id: 'c1', status: 'ACTIVE' }, { id: 'c2', status: 'ACTIVE' }, { id: 'c3', status: 'COMPLETED' }] as ProductionCycle[]
const batches = [{ id: 'b1', availableQuantityKg: '0.10', quality: 'PREMIUM', status: 'AVAILABLE' }, { id: 'b2', availableQuantityKg: '0.20', quality: 'STANDARD', status: 'BLOCKED' }, { id: 'b3', availableQuantityKg: '12.345', quality: 'PREMIUM', status: 'DEPLETED' }] as HoneyBatch[]
const orders = [{ id: 'o1', status: 'PENDING', createdAt: '2026-09-01T10:00:00Z' }, { id: 'o2', status: 'CONFIRMED', createdAt: '2026-09-02T10:00:00Z' }, { id: 'o3', status: 'CANCELLED', createdAt: '2026-08-30T10:00:00Z' }, { id: 'o4', status: 'CONFIRMED', createdAt: '2026-09-03T10:00:00Z' }] as Order[]

describe('Dashboard selectors', () => {
  it('calculates top-level operational metrics with decimal-safe stock totals', () => {
    expect(selectDashboardMetrics({ apiaries, hives, cycles, batches, orders })).toEqual({ totalApiaries: 2, totalHives: 3, activeProductionCycles: 2, availableHoneyKg: '12.65', pendingOrders: 1, confirmedOrders: 2, cancelledOrders: 1 })
  })

  it('counts hives and production cycles by every supported status', () => {
    expect(selectHiveStatusSummary(hives)).toEqual({ STRONG: 2, MODERATE: 0, WEAK: 1, INACTIVE: 0 })
    expect(selectCycleStatusSummary(cycles)).toEqual({ PLANNED: 0, ACTIVE: 2, COMPLETED: 1, CANCELLED: 0 })
  })

  it('summarizes honey batches independently by quality and status', () => {
    expect(selectBatchSummary(batches)).toEqual({ quality: { STANDARD: 1, PREMIUM: 2 }, status: { AVAILABLE: 1, DEPLETED: 1, BLOCKED: 1 } })
  })

  it('returns recent orders in descending creation order without mutating input', () => {
    expect(selectRecentOrders(orders, 3).map((order) => order.id)).toEqual(['o4', 'o2', 'o1'])
    expect(orders.map((order) => order.id)).toEqual(['o1', 'o2', 'o3', 'o4'])
  })
})