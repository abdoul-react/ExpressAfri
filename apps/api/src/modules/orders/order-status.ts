import { BadRequestException } from '@nestjs/common';

export type OrderItemStatus =
  'pending' | 'ready' | 'shipped' | 'delivered' | 'cancelled' | 'issue';

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded'
  | 'partially_shipped';

export type ShipmentStatus = 'preparing' | 'shipped' | 'delivered';

const ORDER_ITEM_TRANSITIONS: Record<OrderItemStatus, OrderItemStatus[]> = {
  pending: ['ready', 'issue'],
  ready: ['shipped', 'issue', 'ready'],
  shipped: ['delivered', 'issue'],
  delivered: [],
  cancelled: [],
  issue: ['pending'],
};

const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['shipped', 'cancelled', 'processing'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered', 'cancelled'],
  delivered: ['refunded'],
  cancelled: [],
  refunded: [],
  partially_shipped: ['shipped', 'delivered', 'cancelled'],
};

export function assertOrderItemTransition(
  from: OrderItemStatus,
  to: OrderItemStatus,
): void {
  const allowed = ORDER_ITEM_TRANSITIONS[from];
  if (!allowed?.includes(to)) {
    throw new BadRequestException(
      `Transition de statut article invalide : "${from}" → "${to}"`,
    );
  }
}

export function assertOrderTransition(
  from: OrderStatus,
  to: OrderStatus,
): void {
  const allowed = ORDER_TRANSITIONS[from];
  if (!allowed?.includes(to)) {
    throw new BadRequestException(
      `Transition de statut commande invalide : "${from}" → "${to}"`,
    );
  }
}
