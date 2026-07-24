import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import {
  eq,
  sql,
  and,
  like,
  or,
  inArray,
  notInArray,
  asc,
  desc,
} from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '../../database/database.module';
import {
  deliveryPersons,
  deliveryAssignments,
} from '../../database/schema/delivery';
import { orders } from '../../database/schema/orders';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class DeliveryService {
  constructor(
    @Inject(DRIZZLE) private db: DrizzleDB,
    private audit: AuditService,
  ) {}

  async listPersons(params: {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: boolean;
    countryCode?: string;
    region?: string;
  }) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 10;
    const offset = (page - 1) * limit;

    const filters = [];
    if (params.search) {
      filters.push(
        or(
          like(deliveryPersons.name, `%${params.search}%`),
          like(deliveryPersons.phone, `%${params.search}%`),
          like(deliveryPersons.email, `%${params.search}%`),
        ),
      );
    }
    if (params.isActive !== undefined) {
      filters.push(eq(deliveryPersons.isActive, params.isActive));
    }
    if (params.countryCode) {
      filters.push(eq(deliveryPersons.countryCode, params.countryCode));
    }
    if (params.region) {
      filters.push(eq(deliveryPersons.region, params.region));
    }

    const where = filters.length ? and(...filters) : undefined;

    const [data, [{ count }]] = await Promise.all([
      this.db
        .select()
        .from(deliveryPersons)
        .where(where)
        .limit(limit)
        .offset(offset)
        .orderBy(asc(deliveryPersons.name)),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(deliveryPersons)
        .where(where),
    ]);

    return { data, total: Number(count), page };
  }

  async getPersonById(id: string) {
    const [person] = await this.db
      .select()
      .from(deliveryPersons)
      .where(eq(deliveryPersons.id, id));

    if (!person) throw new NotFoundException('Livreur introuvable');
    return person;
  }

  async createPerson(data: {
    storeId?: string;
    name: string;
    phone: string;
    email?: string;
    vehicleType?: string;
    countryCode?: string;
    countryName?: string;
    region?: string;
    address?: string;
    idCardNumber?: string;
    licensePlate?: string;
    profilePhoto?: string;
  }) {
    const [person] = await this.db
      .insert(deliveryPersons)
      .values(data)
      .returning();

    await this.audit.create({
      action: 'CREATE',
      resource: 'delivery_persons',
      resourceId: person.id,
      details: { name: person.name, phone: person.phone },
      status: 'success',
    });

    return person;
  }

  async updatePerson(
    id: string,
    data: Partial<{
      name: string;
      phone: string;
      email: string;
      vehicleType: string;
      countryCode: string;
      countryName: string;
      region: string;
      address: string;
      idCardNumber: string;
      licensePlate: string;
      profilePhoto: string;
      isActive: boolean;
      isVerified: boolean;
    }>,
  ) {
    const [person] = await this.db
      .update(deliveryPersons)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(deliveryPersons.id, id))
      .returning();

    if (!person) throw new NotFoundException('Livreur introuvable');

    await this.audit.create({
      action: 'UPDATE',
      resource: 'delivery_persons',
      resourceId: id,
      details: { name: person.name, updatedFields: Object.keys(data) },
      status: 'success',
    });

    return person;
  }

  async deletePerson(id: string) {
    const [{ activeCount }] = await this.db
      .select({ activeCount: sql<number>`count(*)` })
      .from(deliveryAssignments)
      .where(
        and(
          eq(deliveryAssignments.deliveryPersonId, id),
          inArray(deliveryAssignments.status, ['assigned', 'picked_up', 'in_transit']),
        ),
      );

    if (Number(activeCount) > 0) {
      throw new ConflictException('Ce livreur a des livraisons actives en cours');
    }

    const [person] = await this.db
      .delete(deliveryPersons)
      .where(eq(deliveryPersons.id, id))
      .returning();

    if (!person) throw new NotFoundException('Livreur introuvable');

    await this.audit.create({
      action: 'DELETE',
      resource: 'delivery_persons',
      resourceId: id,
      details: { name: person.name, phone: person.phone },
      status: 'success',
    });

    return person;
  }

  async listAssignments(params: {
    page?: number;
    limit?: number;
    deliveryPersonId?: string;
  }) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 10;
    const offset = (page - 1) * limit;

    const where = params.deliveryPersonId
      ? eq(deliveryAssignments.deliveryPersonId, params.deliveryPersonId)
      : undefined;

    const [data, [{ count }]] = await Promise.all([
      this.db
        .select()
        .from(deliveryAssignments)
        .where(where)
        .limit(limit)
        .offset(offset)
        .orderBy(desc(deliveryAssignments.assignedAt)),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(deliveryAssignments)
        .where(where),
    ]);

    return { data, total: Number(count), page };
  }

  async assignDelivery(data: { deliveryPersonId: string; orderId: string }) {
    const [person] = await this.db
      .select()
      .from(deliveryPersons)
      .where(eq(deliveryPersons.id, data.deliveryPersonId));

    if (!person) throw new NotFoundException('Livreur introuvable');

    const [order] = await this.db
      .select()
      .from(orders)
      .where(eq(orders.id, data.orderId));

    if (!order) throw new NotFoundException('Commande introuvable');

    const [existing] = await this.db
      .select()
      .from(deliveryAssignments)
      .where(
        and(
          eq(deliveryAssignments.orderId, data.orderId),
          inArray(deliveryAssignments.status, ['assigned', 'picked_up']),
        ),
      );

    if (existing)
      throw new BadRequestException(
        'Cette commande a déjà une livraison en cours',
      );

    const [assignment] = await this.db
      .insert(deliveryAssignments)
      .values({
        deliveryPersonId: data.deliveryPersonId,
        orderId: data.orderId,
        storeId: order.storeId,
      })
      .returning();

    await this.audit.create({
      action: 'ASSIGN',
      resource: 'delivery_assignments',
      resourceId: assignment.id,
      details: {
        deliveryPersonId: data.deliveryPersonId,
        orderId: data.orderId,
      },
      status: 'success',
    });

    return assignment;
  }

  async updateAssignmentStatus(
    id: string,
    data: { status: string; notes?: string },
  ) {
    const [existing] = await this.db
      .select()
      .from(deliveryAssignments)
      .where(eq(deliveryAssignments.id, id))
      .limit(1);
    if (!existing) throw new NotFoundException('Assignation introuvable');

    const updateData: Record<string, unknown> = {
      status: data.status,
      updatedAt: new Date(),
    };

    if (data.notes !== undefined) updateData.notes = data.notes;

    if (data.status === 'picked_up') {
      updateData.pickedUpAt = new Date();
    }

    if (data.status === 'delivered') {
      updateData.deliveredAt = new Date();
      if (!existing.pickedUpAt) {
        updateData.pickedUpAt = new Date();
      }
    }

    const [assignment] = await this.db
      .update(deliveryAssignments)
      .set(updateData)
      .where(eq(deliveryAssignments.id, id))
      .returning();

    if (!assignment) throw new NotFoundException('Assignation introuvable');

    if (data.status === 'delivered') {
      await this.db
        .update(deliveryPersons)
        .set({
          totalDeliveries: sql`${deliveryPersons.totalDeliveries} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(deliveryPersons.id, assignment.deliveryPersonId));
    }

    await this.audit.create({
      action: 'UPDATE_ASSIGNMENT_STATUS',
      resource: 'delivery_assignments',
      resourceId: id,
      details: { status: data.status, notes: data.notes },
      status: 'success',
    });

    return assignment;
  }

  async rateAssignment(id: string, data: { rating: number; notes?: string }) {
    if (data.rating < 1 || data.rating > 5) {
      throw new BadRequestException('La note doit être comprise entre 1 et 5');
    }

    const [assignment] = await this.db
      .update(deliveryAssignments)
      .set({
        rating: data.rating,
        notes: data.notes ?? undefined,
        updatedAt: new Date(),
      })
      .where(eq(deliveryAssignments.id, id))
      .returning();

    if (!assignment) throw new NotFoundException('Assignation introuvable');

    const person = await this.db
      .select()
      .from(deliveryPersons)
      .where(eq(deliveryPersons.id, assignment.deliveryPersonId));

    if (!person.length) throw new NotFoundException('Livreur introuvable');

    const [{ avg }] = await this.db
      .select({ avg: sql<number>`avg(${deliveryAssignments.rating})` })
      .from(deliveryAssignments)
      .where(
        and(
          eq(deliveryAssignments.deliveryPersonId, assignment.deliveryPersonId),
          sql`${deliveryAssignments.rating} is not null`,
        ),
      );

    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(deliveryAssignments)
      .where(
        and(
          eq(deliveryAssignments.deliveryPersonId, assignment.deliveryPersonId),
          sql`${deliveryAssignments.rating} is not null`,
        ),
      );

    await this.db
      .update(deliveryPersons)
      .set({
        rating: sql`${avg}::numeric(3,2)`,
        ratingCount: Number(count),
        updatedAt: new Date(),
      })
      .where(eq(deliveryPersons.id, assignment.deliveryPersonId));

    return { assignment, person: person[0] };
  }

  async listAvailableOrders(params: { page?: number; limit?: number }) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 10;
    const offset = (page - 1) * limit;

    const assignedOrderIds = this.db
      .select({ orderId: deliveryAssignments.orderId })
      .from(deliveryAssignments)
      .where(inArray(deliveryAssignments.status, ['assigned', 'picked_up']));

    const [data, [{ count }]] = await Promise.all([
      this.db
        .select()
        .from(orders)
        .where(
          and(
            eq(orders.status, 'confirmed'),
            notInArray(orders.id, assignedOrderIds),
          ),
        )
        .limit(limit)
        .offset(offset)
        .orderBy(desc(orders.createdAt)),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(orders)
        .where(
          and(
            eq(orders.status, 'confirmed'),
            notInArray(orders.id, assignedOrderIds),
          ),
        ),
    ]);

    return { data, total: Number(count), page };
  }
}
