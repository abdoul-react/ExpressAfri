import { Injectable, Inject } from '@nestjs/common'
import { sql, eq, and, gte, lte } from 'drizzle-orm'
import { DRIZZLE, type DrizzleDB } from '../../database/database.module'
import { orders } from '../../database/schema/orders'
import { products } from '../../database/schema/products'
import { stores } from '../../database/schema/stores'
import { customers } from '../../database/schema/customers'
import { affiliates } from '../../database/schema/affiliates'

@Injectable()
export class AnalyticsService {
  constructor(@Inject(DRIZZLE) private db: DrizzleDB) {}

  async getDashboard(period: string = 'month') {
    const now = new Date()
    const periodStart = this.getPeriodStart(now, period)
    const prevPeriodStart = this.getPeriodStart(periodStart, period)

    const [currentOrders] = await this.db.select({
      total: sql<number>`count(*)::int`,
      revenue: sql<string>`coalesce(sum(total), '0')`,
      avgValue: sql<string>`coalesce(avg(total), '0')`,
    }).from(orders).where(gte(orders.createdAt, periodStart))

    const [prevOrders] = await this.db.select({
      total: sql<number>`count(*)::int`,
      revenue: sql<string>`coalesce(sum(total), '0')`,
    }).from(orders).where(and(gte(orders.createdAt, prevPeriodStart), lte(orders.createdAt, periodStart)))

    const [currentCustomers] = await this.db.select({
      total: sql<number>`count(*)::int`,
    }).from(customers).where(gte(customers.createdAt, periodStart))

    const [prevCustomers] = await this.db.select({
      total: sql<number>`count(*)::int`,
    }).from(customers).where(and(gte(customers.createdAt, prevPeriodStart), lte(customers.createdAt, periodStart)))

    const [allCustomers] = await this.db.select({ total: sql<number>`count(*)::int` }).from(customers)

    const [allProducts] = await this.db.select({ total: sql<number>`count(*)::int` }).from(products)
    const [soldProducts] = await this.db.select({ total: sql<number>`count(*)::int` }).from(products).where(eq(products.status, 'active'))

    const [allStores] = await this.db.select({ total: sql<number>`count(*)::int` }).from(stores)
    const [activeStores] = await this.db.select({ total: sql<number>`count(*)::int` }).from(stores).where(eq(stores.status, 'active'))

    const currentRevenue = Number(currentOrders.revenue)
    const prevRevenue = Number(prevOrders.revenue)
    const currentOrderCount = currentOrders.total
    const prevOrderCount = prevOrders.total
    const currentCustomerCount = currentCustomers.total
    const prevCustomerCount = prevCustomers.total

    const revenueGrowth = prevRevenue ? ((currentRevenue - prevRevenue) / prevRevenue) * 100 : 0
    const orderGrowth = prevOrderCount ? ((currentOrderCount - prevOrderCount) / prevOrderCount) * 100 : 0
    const customerGrowth = prevCustomerCount ? ((currentCustomerCount - prevCustomerCount) / prevCustomerCount) * 100 : 0

    return {
      summary: {
        periodStart: periodStart.toISOString(),
        periodEnd: now.toISOString(),
        revenue: { total: currentRevenue, growth: Math.round(revenueGrowth * 10) / 10 },
        orders: { total: currentOrderCount, growth: Math.round(orderGrowth * 10) / 10, averageValue: Number(currentOrders.avgValue) },
        customers: { total: allCustomers.total, new: currentCustomerCount, growth: Math.round(customerGrowth * 10) / 10 },
        products: { total: allProducts.total, sold: soldProducts.total },
        stores: { total: allStores.total, active: activeStores.total },
        conversionRate: 2.4,
        averageOrderValue: Number(currentOrders.avgValue),
      },
      revenueChart: await this.getChartData(orders.total, 'day', periodStart),
      ordersChart: await this.getChartData(orders.total, 'day', periodStart),
      customerChart: await this.getChartData(customers.id, 'day', periodStart),
      topProducts: [],
      topCategories: [],
      topStores: await this.getTopStores(periodStart),
      revenueByPayment: [],
      geographicData: [],
    }
  }

  private async getChartData(field: any, interval: string, since: Date): Promise<{ date: string; value: number }[]> {
    const data = await this.db.execute(sql`
      SELECT DATE(created_at) as date, COUNT(*)::int as value
      FROM ${field === orders.total ? sql`orders` : sql`customers`}
      WHERE created_at >= ${since.toISOString()}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `)
    return (data.rows ?? []).map((r: any) => ({ date: r.date, value: Number(r.value) }))
  }

  private async getTopStores(since: Date): Promise<{ id: string; name: string; value: number; count: number; growth?: number }[]> {
    const data = await this.db.execute(sql`
      SELECT s.id, s.name, COALESCE(SUM(o.total::numeric), 0) as value, COUNT(o.id)::int as count
      FROM stores s
      LEFT JOIN orders o ON o.store_id = s.id AND o.created_at >= ${since.toISOString()}
      GROUP BY s.id, s.name
      ORDER BY value DESC
      LIMIT 5
    `)
    return (data.rows ?? []).map((r: any) => ({ id: r.id, name: r.name, value: Number(r.value), count: r.count }))
  }

  private getPeriodStart(now: Date, period: string): Date {
    const d = new Date(now)
    if (period === 'today') { d.setHours(0, 0, 0, 0); return d }
    if (period === 'week') { d.setDate(d.getDate() - 7); return d }
    if (period === 'month') { d.setMonth(d.getMonth() - 1); return d }
    if (period === 'quarter') { d.setMonth(d.getMonth() - 3); return d }
    if (period === 'year') { d.setFullYear(d.getFullYear() - 1); return d }
    d.setMonth(d.getMonth() - 1); return d
  }
}
