import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, like, or, and, sql, inArray, desc } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '../../database/database.module';
import { customers, addresses } from '../../database/schema/customers';
import { orders, orderItems } from '../../database/schema/orders';
import { AuditService } from '../audit/audit.service';

type CustomerRow = typeof customers.$inferSelect;
type AddressRow = typeof addresses.$inferSelect;

/** Ne jamais renvoyer le hash de mot de passe au client. */
function sanitize(customer: CustomerRow) {
  const { passwordHash: _passwordHash, ...safe } = customer;
  return safe;
}

/** Complète la fiche avec le contact de l'adresse par défaut (ville, pays, téléphone). */
function withAddressContact(
  customer: CustomerRow,
  address: AddressRow | undefined,
) {
  return {
    ...sanitize(customer),
    phone: customer.phone ?? address?.phone ?? null,
    city: address?.city ?? null,
    countryCode: address?.countryCode ?? null,
  };
}

@Injectable()
export class CustomersService {
  constructor(
    @Inject(DRIZZLE) private db: DrizzleDB,
    private audit: AuditService,
  ) {}

  private pickDefaultAddress(list: AddressRow[]): AddressRow | undefined {
    return list.find((a) => a.isDefault) ?? list[0];
  }

  async list(params: {
    page?: number;
    limit?: number;
    search?: string;
    storeId?: string;
  }) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 10;
    const offset = (page - 1) * limit;
    const conditions = [];
    if (params.search)
      conditions.push(
        or(
          like(customers.firstName, `%${params.search}%`),
          like(customers.lastName, `%${params.search}%`),
          like(customers.email, `%${params.search}%`),
        ),
      );
    if (params.storeId) conditions.push(eq(customers.storeId, params.storeId));
    const where = conditions.length ? and(...conditions) : undefined;
    const [data, [{ count }]] = await Promise.all([
      this.db
        .select()
        .from(customers)
        .where(where)
        .limit(limit)
        .offset(offset)
        .orderBy(customers.createdAt),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(customers)
        .where(where),
    ]);

    // Adresse par défaut de chaque client de la page (une seule requête)
    const ids = data.map((c) => c.id);
    const addressList = ids.length
      ? await this.db
          .select()
          .from(addresses)
          .where(inArray(addresses.customerId, ids))
      : [];
    const byCustomer = new Map<string, AddressRow[]>();
    for (const a of addressList) {
      const list = byCustomer.get(a.customerId) ?? [];
      list.push(a);
      byCustomer.set(a.customerId, list);
    }

    const enriched = data.map((c) =>
      withAddressContact(
        c,
        this.pickDefaultAddress(byCustomer.get(c.id) ?? []),
      ),
    );
    return { data: enriched, total: Number(count), page };
  }

  async getById(id: string) {
    const [customer] = await this.db
      .select()
      .from(customers)
      .where(eq(customers.id, id))
      .limit(1);
    if (!customer) throw new NotFoundException('Client introuvable');
    const addressList = await this.db
      .select()
      .from(addresses)
      .where(eq(addresses.customerId, id));
    return {
      ...withAddressContact(customer, this.pickDefaultAddress(addressList)),
      addresses: addressList,
    };
  }

  async create(data: any) {
    const [customer] = await this.db.insert(customers).values(data).returning();

    // ✅ Audit log
    await this.audit.create({
      action: 'CREATE',
      resource: 'customers',
      resourceId: customer.id,
      details: {
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
      },
      status: 'success',
    });

    return customer;
  }

  async update(id: string, data: any) {
    const [customer] = await this.db
      .update(customers)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(customers.id, id))
      .returning();
    if (!customer) throw new NotFoundException('Client introuvable');

    // ✅ Audit log
    await this.audit.create({
      action: 'UPDATE',
      resource: 'customers',
      resourceId: id,
      details: { updatedFields: Object.keys(data) },
      status: 'success',
    });

    return customer;
  }

  async delete(id: string) {
    const [customer] = await this.db
      .update(customers)
      .set({
        deletedAt: new Date(),
        email: `deleted_${id}@removed.invalid`,
        updatedAt: new Date(),
      })
      .where(eq(customers.id, id))
      .returning();
    if (!customer) throw new NotFoundException('Client introuvable');

    await this.audit.create({
      action: 'DELETE',
      resource: 'customers',
      resourceId: id,
      details: { email: customer.email, firstName: customer.firstName },
      status: 'success',
    });

    return { deleted: true, id };
  }

  async banCustomer(id: string, reason: string, adminId: string) {
    const [customer] = await this.db
      .update(customers)
      .set({ isBanned: true, bannedAt: new Date(), bannedReason: reason, updatedAt: new Date() })
      .where(eq(customers.id, id))
      .returning();
    if (!customer) throw new NotFoundException('Client introuvable');

    await this.audit.create({
      action: 'BAN',
      resource: 'customers',
      resourceId: id,
      actorId: adminId,
      details: { reason },
      status: 'success',
    });

    return sanitize(customer);
  }

  async unbanCustomer(id: string) {
    const [customer] = await this.db
      .update(customers)
      .set({ isBanned: false, bannedAt: null, bannedReason: null, updatedAt: new Date() })
      .where(eq(customers.id, id))
      .returning();
    if (!customer) throw new NotFoundException('Client introuvable');
    return sanitize(customer);
  }

  // ── Addresses ──

  async listAddresses(customerId: string) {
    return this.db
      .select()
      .from(addresses)
      .where(eq(addresses.customerId, customerId))
      .orderBy(addresses.createdAt);
  }

  async createAddress(customerId: string, data: any) {
    // storeId hérité du client si non fourni (colonne NOT NULL)
    if (!data.storeId) {
      const [owner] = await this.db
        .select({ storeId: customers.storeId })
        .from(customers)
        .where(eq(customers.id, customerId))
        .limit(1);
      if (!owner) throw new NotFoundException('Client introuvable');
      data = { ...data, storeId: owner.storeId };
    }
    const existing = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(addresses)
      .where(eq(addresses.customerId, customerId));
    const isFirst = Number(existing[0].count) === 0;
    const shouldBeDefault = data.isDefault ?? isFirst;

    if (shouldBeDefault) {
      return this.db.transaction(async (tx) => {
        const [addr] = await tx
          .insert(addresses)
          .values({ ...data, customerId, isDefault: true })
          .returning();
        await tx
          .update(addresses)
          .set({ isDefault: false })
          .where(
            and(
              eq(addresses.customerId, customerId),
              sql`${addresses.id} != ${addr.id}`,
            ),
          );
        return addr;
      });
    }

    const [addr] = await this.db
      .insert(addresses)
      .values({ ...data, customerId, isDefault: false })
      .returning();
    return addr;
  }

  async updateAddress(id: string, customerId: string, data: any) {
    if (data.isDefault) {
      return this.db.transaction(async (tx) => {
        const [addr] = await tx
          .update(addresses)
          .set({ ...data, updatedAt: new Date() })
          .where(and(eq(addresses.id, id), eq(addresses.customerId, customerId)))
          .returning();
        if (!addr) throw new NotFoundException('Adresse introuvable');
        await tx
          .update(addresses)
          .set({ isDefault: false })
          .where(
            and(
              eq(addresses.customerId, customerId),
              sql`${addresses.id} != ${addr.id}`,
            ),
          );
        return addr;
      });
    }

    const [addr] = await this.db
      .update(addresses)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(addresses.id, id), eq(addresses.customerId, customerId)))
      .returning();
    if (!addr) throw new NotFoundException('Adresse introuvable');
    return addr;
  }

  async deleteAddress(id: string, customerId: string) {
    const [addr] = await this.db
      .delete(addresses)
      .where(and(eq(addresses.id, id), eq(addresses.customerId, customerId)))
      .returning();
    if (!addr) throw new NotFoundException('Adresse introuvable');
    return addr;
  }

  async setDefaultAddress(id: string, customerId: string) {
    const [addr] = await this.db
      .select()
      .from(addresses)
      .where(and(eq(addresses.id, id), eq(addresses.customerId, customerId)))
      .limit(1);
    if (!addr) throw new NotFoundException('Adresse introuvable');

    const [updated] = await this.db.transaction(async (tx) => {
      await tx
        .update(addresses)
        .set({ isDefault: false })
        .where(eq(addresses.customerId, customerId));
      return tx
        .update(addresses)
        .set({ isDefault: true, updatedAt: new Date() })
        .where(eq(addresses.id, id))
        .returning();
    });
    return updated;
  }

  async getStats() {
    const [[{ count }], [{ totalSpent }]] = await Promise.all([
      this.db.select({ count: sql<number>`count(*)` }).from(customers),
      this.db
        .select({ totalSpent: sql<string>`coalesce(sum(total_spent), '0')` })
        .from(customers),
    ]);
    return { totalCustomers: Number(count), totalRevenue: Number(totalSpent) };
  }

  async getCustomerOrders(customerId: string, params: { page?: number; limit?: number } = {}) {
    const [customer] = await this.db
      .select({ id: customers.id })
      .from(customers)
      .where(eq(customers.id, customerId))
      .limit(1);
    if (!customer) throw new NotFoundException('Client introuvable');

    const page = params.page ?? 1;
    const limit = params.limit ?? 10;
    const offset = (page - 1) * limit;

    const [data, [{ count }]] = await Promise.all([
      this.db
        .select()
        .from(orders)
        .where(eq(orders.customerId, customerId))
        .orderBy(desc(orders.createdAt))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(orders)
        .where(eq(orders.customerId, customerId)),
    ]);

    const orderIds = data.map((o) => o.id);
    const items = orderIds.length
      ? await this.db
          .select()
          .from(orderItems)
          .where(inArray(orderItems.orderId, orderIds))
      : [];
    const itemsByOrder = new Map<string, typeof items>();
    for (const item of items) {
      const list = itemsByOrder.get(item.orderId) ?? [];
      list.push(item);
      itemsByOrder.set(item.orderId, list);
    }

    return {
      data: data.map((o) => ({ ...o, items: itemsByOrder.get(o.id) ?? [] })),
      total: Number(count),
      page,
    };
  }
}
