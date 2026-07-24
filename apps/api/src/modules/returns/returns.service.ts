import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { eq, like, or, and, sql, desc, inArray } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '../../database/database.module';
import { returns, returnItems } from '../../database/schema/returns';
import { orders } from '../../database/schema/orders';
import { customers } from '../../database/schema/customers';

@Injectable()
export class ReturnsService {
  constructor(@Inject(DRIZZLE) private db: DrizzleDB) {}

  async list(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  }) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 10;
    const offset = (page - 1) * limit;
    const conditions = [];
    if (params.status) conditions.push(eq(returns.status, params.status));
    const where = conditions.length ? and(...conditions) : undefined;

    const [data, [{ count }]] = await Promise.all([
      this.db
        .select({
          id: returns.id,
          storeId: returns.storeId,
          orderId: returns.orderId,
          customerId: returns.customerId,
          reason: returns.reason,
          status: returns.status,
          refundAmount: returns.refundAmount,
          refundMethod: returns.refundMethod,
          notes: returns.notes,
          reviewedBy: returns.reviewedBy,
          reviewedAt: returns.reviewedAt,
          createdAt: returns.createdAt,
          updatedAt: returns.updatedAt,
          customerFirstName: customers.firstName,
          customerLastName: customers.lastName,
          customerEmail: customers.email,
        })
        .from(returns)
        .leftJoin(customers, eq(returns.customerId, customers.id))
        .where(where)
        .limit(limit)
        .offset(offset)
        .orderBy(desc(returns.createdAt)),
      this.db.select({ count: sql<number>`count(*)` }).from(returns).where(where),
    ]);

    const returnIds = data.map((r) => r.id);
    const allItems = returnIds.length
      ? await this.db
          .select()
          .from(returnItems)
          .where(inArray(returnItems.returnId, returnIds))
      : [];

    const itemsByReturn = new Map<string, typeof allItems>();
    for (const item of allItems) {
      const list = itemsByReturn.get(item.returnId) ?? [];
      list.push(item);
      itemsByReturn.set(item.returnId, list);
    }

    const enriched = data.map((r) => ({
      ...r,
      customerName:
        r.customerFirstName && r.customerLastName
          ? `${r.customerFirstName} ${r.customerLastName}`
          : null,
      items: itemsByReturn.get(r.id) ?? [],
      itemCount: (itemsByReturn.get(r.id) ?? []).length,
    }));

    return { data: enriched, total: Number(count), page };
  }

  async getById(id: string) {
    const [ret] = await this.db
      .select()
      .from(returns)
      .where(eq(returns.id, id))
      .limit(1);
    if (!ret) throw new NotFoundException('Retour introuvable');
    const items = await this.db
      .select()
      .from(returnItems)
      .where(eq(returnItems.returnId, id));
    return { ...ret, items };
  }

  async create(data: any) {
    const { items, ...returnData } = data;
    const [ret] = await this.db.insert(returns).values(returnData).returning();
    if (items?.length)
      await this.db
        .insert(returnItems)
        .values(items.map((i: any) => ({ ...i, returnId: ret.id })));
    return this.getById(ret.id);
  }

  async updateStatus(
    id: string,
    status: string,
    data?: { refundAmount?: number; refundMethod?: string; notes?: string; reason?: string; rejectionReason?: string },
  ) {
    const updateData: Record<string, any> = { status, updatedAt: new Date() };
    if (data?.refundAmount !== undefined) updateData.refundAmount = String(data.refundAmount);
    if (data?.refundMethod) updateData.refundMethod = data.refundMethod;
    if (data?.rejectionReason) updateData.notes = data.rejectionReason;
    else if (data?.notes) updateData.notes = data.notes;
    else if (data?.reason) updateData.notes = data.reason;
    const [ret] = await this.db
      .update(returns)
      .set(updateData)
      .where(eq(returns.id, id))
      .returning();
    if (!ret) throw new NotFoundException('Retour introuvable');
    return ret;
  }

  async getSummary() {
    const rows = await this.db
      .select({ status: returns.status, count: sql<number>`count(*)` })
      .from(returns)
      .groupBy(returns.status);
    const byStatus: Record<string, number> = {};
    for (const r of rows) byStatus[r.status] = Number(r.count);
    return {
      pending: byStatus['pending'] ?? 0,
      approved: byStatus['approved'] ?? 0,
      refunded: byStatus['refunded'] ?? 0,
      rejected: byStatus['rejected'] ?? 0,
      total: rows.reduce((s, r) => s + Number(r.count), 0),
    };
  }

  // ── Client (mobile) ──

  /** Retours du client, avec leurs articles, du plus récent au plus ancien. */
  async mobileList(customerId: string) {
    const rows = await this.db
      .select()
      .from(returns)
      .where(eq(returns.customerId, customerId))
      .orderBy(desc(returns.createdAt));

    return Promise.all(
      rows.map(async (r) => {
        const items = await this.db
          .select()
          .from(returnItems)
          .where(eq(returnItems.returnId, r.id));
        return {
          id: r.id,
          orderId: r.orderId,
          reason: r.reason,
          status: r.status,
          refundAmount: r.refundAmount ? Number(r.refundAmount) : null,
          createdAt: r.createdAt?.toISOString(),
          items: items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
          })),
        };
      }),
    );
  }

  /** Crée une demande de retour pour une commande appartenant au client. */
  async mobileCreate(
    customerId: string,
    data: {
      orderId: string;
      reason: string;
      items?: { productId: string; quantity: number }[];
    },
  ) {
    // La commande doit exister et appartenir au client
    const [order] = await this.db
      .select()
      .from(orders)
      .where(
        and(eq(orders.id, data.orderId), eq(orders.customerId, customerId)),
      )
      .limit(1);
    if (!order) throw new NotFoundException('Commande introuvable');

    // Une seule demande en cours par commande
    const [existing] = await this.db
      .select({ id: returns.id })
      .from(returns)
      .where(
        and(
          eq(returns.orderId, data.orderId),
          eq(returns.customerId, customerId),
          eq(returns.status, 'pending'),
        ),
      )
      .limit(1);
    if (existing)
      throw new ConflictException(
        'Une demande de retour est déjà en cours pour cette commande',
      );

    const [ret] = await this.db
      .insert(returns)
      .values({
        storeId: order.storeId,
        orderId: data.orderId,
        customerId,
        reason: data.reason.trim(),
        status: 'pending',
      })
      .returning();

    const UUID_RE =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const validItems = (data.items ?? []).filter((i) =>
      UUID_RE.test(i.productId),
    );
    if (validItems.length) {
      await this.db.insert(returnItems).values(
        validItems.map((i) => ({
          returnId: ret.id,
          productId: i.productId,
          quantity: Math.max(1, i.quantity ?? 1),
        })),
      );
    }

    return {
      id: ret.id,
      status: ret.status,
      createdAt: ret.createdAt?.toISOString(),
    };
  }
}
