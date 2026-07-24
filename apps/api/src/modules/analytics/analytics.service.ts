import { Injectable, Inject } from '@nestjs/common';
import { sql, eq, and, gte, lte } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '../../database/database.module';
import { orders } from '../../database/schema/orders';
import { products } from '../../database/schema/products';
import { stores } from '../../database/schema/stores';
import { customers } from '../../database/schema/customers';

@Injectable()
export class AnalyticsService {
  constructor(@Inject(DRIZZLE) private db: DrizzleDB) {}

  async getStoreDashboard(storeId: string) {
    const now = new Date();
    const monthStart = new Date(now);
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const prevMonthStart = new Date(monthStart);
    prevMonthStart.setMonth(prevMonthStart.getMonth() - 1);

    const [orderStats, productStats, pendingStats, monthRevRow, prevMonthRevRow, recentOrdersRaw] = await Promise.all([
      this.db.execute(sql`
        SELECT COUNT(*)::int as total,
               COALESCE(SUM(total::numeric), 0) as revenue
        FROM orders
        WHERE store_id = ${storeId}
          AND status NOT IN ('cancelled', 'refunded')
      `),
      this.db.execute(sql`
        SELECT COUNT(*)::int as total FROM products
        WHERE store_id = ${storeId} AND status = 'active'
      `),
      this.db.execute(sql`
        SELECT COUNT(*)::int as total FROM orders
        WHERE store_id = ${storeId} AND status = 'pending'
      `),
      this.db.execute(sql`
        SELECT COALESCE(SUM(total::numeric), 0) as revenue FROM orders
        WHERE store_id = ${storeId}
          AND status NOT IN ('cancelled', 'refunded')
          AND created_at >= ${monthStart.toISOString()}
      `),
      this.db.execute(sql`
        SELECT COALESCE(SUM(total::numeric), 0) as revenue FROM orders
        WHERE store_id = ${storeId}
          AND status NOT IN ('cancelled', 'refunded')
          AND created_at >= ${prevMonthStart.toISOString()}
          AND created_at < ${monthStart.toISOString()}
      `),
      this.db.execute(sql`
        SELECT id, reference, status, total, currency, created_at FROM orders
        WHERE store_id = ${storeId}
        ORDER BY created_at DESC LIMIT 5
      `),
    ]);

    const totalOrders = Number((orderStats.rows[0] as any)?.total ?? 0);
    const totalRevenue = Number((orderStats.rows[0] as any)?.revenue ?? 0);
    const activeProducts = Number((productStats.rows[0] as any)?.total ?? 0);
    const pendingOrders = Number((pendingStats.rows[0] as any)?.total ?? 0);
    const monthRevenue = Number((monthRevRow.rows[0] as any)?.revenue ?? 0);
    const prevMonthRevenue = Number((prevMonthRevRow.rows[0] as any)?.revenue ?? 0);
    const revenueGrowth = prevMonthRevenue > 0
      ? Math.round(((monthRevenue - prevMonthRevenue) / prevMonthRevenue) * 1000) / 10
      : 0;

    return {
      orders: { total: totalOrders, pending: pendingOrders },
      revenue: { total: totalRevenue, month: monthRevenue, growth: revenueGrowth },
      products: { active: activeProducts },
      recentOrders: (recentOrdersRaw.rows ?? []).map((r: any) => ({
        id: r.id,
        reference: r.reference,
        status: r.status,
        total: Number(r.total),
        currency: r.currency,
        createdAt: r.created_at,
      })),
    };
  }

  async getFunnelData() {
    const [total, paid, delivered] = await Promise.all([
      this.db.select({ count: sql<number>`count(*)::int` }).from(orders),
      this.db.select({ count: sql<number>`count(*)::int` }).from(orders)
        .where(sql`status NOT IN ('pending', 'cancelled', 'refunded')`),
      this.db.select({ count: sql<number>`count(*)::int` }).from(orders)
        .where(eq(orders.status, 'delivered')),
    ]);
    return {
      steps: [
        { name: 'Commandes créées', count: total[0].count },
        { name: 'Paiements confirmés', count: paid[0].count },
        { name: 'Livrées', count: delivered[0].count },
      ],
    };
  }

  async getCohortData() {
    const rows = await this.db.execute(sql`
      SELECT
        TO_CHAR(DATE_TRUNC('month', c.created_at), 'YYYY-MM') AS cohort,
        COUNT(DISTINCT c.id)::int AS cohort_size,
        EXTRACT(MONTH FROM AGE(
          DATE_TRUNC('month', o.created_at),
          DATE_TRUNC('month', c.created_at)
        ))::int AS period_offset,
        COUNT(DISTINCT o.customer_id)::int AS active_customers
      FROM customers c
      LEFT JOIN orders o ON o.customer_id = c.id
        AND o.status NOT IN ('cancelled', 'refunded')
        AND o.created_at >= c.created_at
      WHERE c.created_at >= NOW() - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', c.created_at), period_offset
      ORDER BY cohort, period_offset
    `);

    const cohortMap = new Map<string, { size: number; periods: Map<number, number> }>();
    for (const r of rows.rows as any[]) {
      const cohort = r.cohort as string;
      const offset = Number(r.period_offset ?? 0);
      if (!cohortMap.has(cohort)) cohortMap.set(cohort, { size: Number(r.cohort_size), periods: new Map() });
      cohortMap.get(cohort)!.periods.set(offset, Number(r.active_customers));
    }

    return Array.from(cohortMap.entries()).map(([cohort, { size, periods }]) => ({
      cohort,
      size,
      periods: Array.from({ length: 6 }, (_, i) => ({
        period: `M+${i}`,
        customers: periods.get(i) ?? 0,
        retention: size > 0 ? Math.round(((periods.get(i) ?? 0) / size) * 100) : 0,
      })),
    }));
  }

  async getAbandonedCartData(from?: string, to?: string) {
    const since = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const until = to ? new Date(to) : new Date();
    const rows = await this.db.execute(sql`
      SELECT
        DATE(created_at) AS date,
        COUNT(*)::int AS cart_count,
        COUNT(CASE
          WHEN status = 'cancelled'
            OR (status = 'pending' AND created_at < NOW() - INTERVAL '1 hour')
          THEN 1 END)::int AS abandoned_count
      FROM orders
      WHERE created_at >= ${since.toISOString()}
        AND created_at <= ${until.toISOString()}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);
    return (rows.rows as any[]).map((r) => {
      const cartCount = Number(r.cart_count);
      const abandonedCount = Number(r.abandoned_count);
      return {
        date: String(r.date),
        cartCount,
        abandonedCount,
        rate: cartCount > 0 ? Math.round((abandonedCount / cartCount) * 1000) / 10 : 0,
      };
    });
  }

  async getDashboard(period: string = 'month') {
    const now = new Date();
    const periodStart = this.getPeriodStart(now, period);
    const prevPeriodStart = this.getPrevPeriodStart(periodStart, period);

    const [currentOrders] = await this.db
      .select({
        total: sql<number>`count(*)::int`,
        revenue: sql<string>`coalesce(sum(total), '0')`,
        avgValue: sql<string>`coalesce(avg(total), '0')`,
      })
      .from(orders)
      .where(gte(orders.createdAt, periodStart));

    const [prevOrders] = await this.db
      .select({
        total: sql<number>`count(*)::int`,
        revenue: sql<string>`coalesce(sum(total), '0')`,
      })
      .from(orders)
      .where(
        and(
          gte(orders.createdAt, prevPeriodStart),
          lte(orders.createdAt, periodStart),
        ),
      );

    const [currentCustomers] = await this.db
      .select({ total: sql<number>`count(*)::int` })
      .from(customers)
      .where(gte(customers.createdAt, periodStart));

    const [prevCustomers] = await this.db
      .select({ total: sql<number>`count(*)::int` })
      .from(customers)
      .where(
        and(
          gte(customers.createdAt, prevPeriodStart),
          lte(customers.createdAt, periodStart),
        ),
      );

    const [allCustomers] = await this.db
      .select({ total: sql<number>`count(*)::int` })
      .from(customers);

    const [allProducts] = await this.db
      .select({ total: sql<number>`count(*)::int` })
      .from(products);
    const [soldProducts] = await this.db
      .select({ total: sql<number>`count(*)::int` })
      .from(products)
      .where(eq(products.status, 'active'));

    const [allStores] = await this.db
      .select({ total: sql<number>`count(*)::int` })
      .from(stores);
    const [activeStores] = await this.db
      .select({ total: sql<number>`count(*)::int` })
      .from(stores)
      .where(eq(stores.status, 'active'));

    const currentRevenue = Number(currentOrders.revenue);
    const prevRevenue = Number(prevOrders.revenue);
    const currentOrderCount = currentOrders.total;
    const prevOrderCount = prevOrders.total;
    const currentCustomerCount = currentCustomers.total;
    const prevCustomerCount = prevCustomers.total;

    const safeDiv = (a: number, b: number) => (b === 0 ? 0 : (a - b) / b * 100);
    const revenueGrowth = safeDiv(currentRevenue, prevRevenue);
    const orderGrowth = safeDiv(currentOrderCount, prevOrderCount);
    const customerGrowth = safeDiv(currentCustomerCount, prevCustomerCount);

    return {
      summary: {
        periodStart: periodStart.toISOString(),
        periodEnd: now.toISOString(),
        revenue: {
          total: currentRevenue,
          growth: Math.round(revenueGrowth * 10) / 10,
        },
        orders: {
          total: currentOrderCount,
          growth: Math.round(orderGrowth * 10) / 10,
          averageValue: Number(currentOrders.avgValue),
        },
        customers: {
          total: allCustomers.total,
          new: currentCustomerCount,
          growth: Math.round(customerGrowth * 10) / 10,
        },
        products: { total: allProducts.total, sold: soldProducts.total },
        stores: { total: allStores.total, active: activeStores.total },
        conversionRate: 0,
        averageOrderValue: Number(currentOrders.avgValue),
      },
      revenueChart: await this.getRevenueChartData(periodStart),
      ordersChart: await this.getOrdersChartData(periodStart),
      customerChart: await this.getCustomerChartData(periodStart),
      topProducts: await this.getTopProducts(periodStart),
      topCategories: await this.getTopCategories(periodStart),
      topStores: await this.getTopStores(periodStart),
      revenueByPayment: await this.getRevenueByPayment(periodStart),
      geographicData: await this.getGeographicData(periodStart),
    };
  }

  private async getRevenueChartData(since: Date): Promise<{ date: string; value: number }[]> {
    const data = await this.db.execute(sql`
      SELECT DATE(created_at) as date,
             COALESCE(SUM(total::numeric), 0) as value
      FROM orders
      WHERE created_at >= ${since.toISOString()}
        AND status NOT IN ('cancelled', 'refunded')
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);
    return (data.rows ?? []).map((r: any) => ({
      date: String(r.date),
      value: Number(r.value),
    }));
  }

  private async getOrdersChartData(since: Date): Promise<{ date: string; value: number }[]> {
    const data = await this.db.execute(sql`
      SELECT DATE(created_at) as date,
             COUNT(*)::int as value
      FROM orders
      WHERE created_at >= ${since.toISOString()}
        AND status NOT IN ('cancelled', 'refunded')
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);
    return (data.rows ?? []).map((r: any) => ({
      date: String(r.date),
      value: Number(r.value),
    }));
  }

  private async getCustomerChartData(since: Date): Promise<{ date: string; value: number }[]> {
    const data = await this.db.execute(sql`
      SELECT DATE(created_at) as date, COUNT(*)::int as value
      FROM customers
      WHERE created_at >= ${since.toISOString()}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);
    return (data.rows ?? []).map((r: any) => ({
      date: String(r.date),
      value: Number(r.value),
    }));
  }

  private async getTopProducts(since: Date, limit = 5): Promise<any[]> {
    const data = await this.db.execute(sql`
      SELECT
        oi.product_id as id,
        p.name,
        COALESCE(SUM(oi.unit_price::numeric * oi.quantity), 0) as revenue,
        SUM(oi.quantity)::int as quantity
      FROM order_items oi
      INNER JOIN orders o ON o.id = oi.order_id
      INNER JOIN products p ON p.id = oi.product_id
      WHERE o.created_at >= ${since.toISOString()}
        AND o.status NOT IN ('cancelled', 'refunded')
      GROUP BY oi.product_id, p.name
      ORDER BY revenue DESC
      LIMIT ${limit}
    `);
    return (data.rows ?? []).map((r: any) => ({
      id: r.id,
      name: r.name,
      value: Number(r.revenue),
      count: Number(r.quantity),
    }));
  }

  private async getTopCategories(since: Date, limit = 5): Promise<any[]> {
    const data = await this.db.execute(sql`
      SELECT
        c.id,
        c.name,
        COALESCE(SUM(oi.unit_price::numeric * oi.quantity), 0) as revenue,
        SUM(oi.quantity)::int as quantity
      FROM order_items oi
      INNER JOIN orders o ON o.id = oi.order_id
      INNER JOIN products p ON p.id = oi.product_id
      INNER JOIN categories c ON c.id = p.category_id
      WHERE o.created_at >= ${since.toISOString()}
        AND o.status NOT IN ('cancelled', 'refunded')
      GROUP BY c.id, c.name
      ORDER BY revenue DESC
      LIMIT ${limit}
    `);
    return (data.rows ?? []).map((r: any) => ({
      id: r.id,
      name: r.name,
      value: Number(r.revenue),
      count: Number(r.quantity),
    }));
  }

  private async getRevenueByPayment(since: Date): Promise<any[]> {
    const data = await this.db.execute(sql`
      SELECT
        p.method,
        COALESCE(SUM(p.amount::numeric), 0) as total_revenue,
        COUNT(*)::int as count
      FROM payments p
      WHERE p.created_at >= ${since.toISOString()}
        AND p.status = 'completed'
      GROUP BY p.method
      ORDER BY total_revenue DESC
    `);
    const rows = (data.rows ?? []).map((r: any) => ({
      paymentMethod: r.method ?? 'unknown',
      amount: Number(r.total_revenue),
      count: Number(r.count),
    }));
    const totalAmount = rows.reduce((s, r) => s + r.amount, 0);
    return rows.map((r) => ({
      ...r,
      percentage: totalAmount > 0 ? Math.round((r.amount / totalAmount) * 1000) / 10 : 0,
    }));
  }

  private async getTopStores(since: Date): Promise<{ id: string; name: string; value: number; count: number }[]> {
    const data = await this.db.execute(sql`
      SELECT s.id, s.name, COALESCE(SUM(o.total::numeric), 0) as value, COUNT(o.id)::int as count
      FROM stores s
      LEFT JOIN orders o ON o.store_id = s.id AND o.created_at >= ${since.toISOString()}
      GROUP BY s.id, s.name
      ORDER BY value DESC
      LIMIT 5
    `);
    return (data.rows ?? []).map((r: any) => ({
      id: r.id,
      name: r.name,
      value: Number(r.value),
      count: r.count,
    }));
  }

  private async getGeographicData(since: Date): Promise<{ country: string; code: string; orders: number; revenue: number; customers: number }[]> {
    const data = await this.db.execute(sql`
      SELECT
        COALESCE(shipping_address->>'countryName', shipping_address->>'country', 'Inconnu') as country,
        COALESCE(shipping_address->>'countryCode', '') as country_code,
        COUNT(DISTINCT o.id)::int as order_count,
        COALESCE(SUM(o.total::numeric), 0) as revenue,
        COUNT(DISTINCT o.customer_id)::int as customer_count
      FROM orders o
      WHERE o.created_at >= ${since.toISOString()}
        AND o.status NOT IN ('cancelled', 'refunded')
        AND o.shipping_address IS NOT NULL
      GROUP BY shipping_address->>'countryName', shipping_address->>'country', shipping_address->>'countryCode'
      ORDER BY revenue DESC
      LIMIT 20
    `);
    return (data.rows ?? []).map((r: any) => ({
      country: String(r.country ?? 'Inconnu'),
      code: String(r.country_code ?? ''),
      orders: Number(r.order_count),
      revenue: Number(r.revenue),
      customers: Number(r.customer_count),
    }));
  }

  private getPeriodStart(now: Date, period: string): Date {
    const d = new Date(now);
    if (period === 'today') { d.setHours(0, 0, 0, 0); return d; }
    if (period === 'week') { d.setDate(d.getDate() - 7); return d; }
    if (period === 'month') { d.setMonth(d.getMonth() - 1); return d; }
    if (period === 'quarter') { d.setMonth(d.getMonth() - 3); return d; }
    if (period === 'year') { d.setFullYear(d.getFullYear() - 1); return d; }
    d.setMonth(d.getMonth() - 1);
    return d;
  }

  private getPrevPeriodStart(periodStart: Date, period: string): Date {
    const d = new Date(periodStart);
    if (period === 'today') { d.setDate(d.getDate() - 1); return d; }
    if (period === 'week') { d.setDate(d.getDate() - 7); return d; }
    if (period === 'month') { d.setMonth(d.getMonth() - 1); return d; }
    if (period === 'quarter') { d.setMonth(d.getMonth() - 3); return d; }
    if (period === 'year') { d.setFullYear(d.getFullYear() - 1); return d; }
    d.setMonth(d.getMonth() - 1);
    return d;
  }
}
