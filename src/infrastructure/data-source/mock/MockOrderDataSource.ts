import type { OrderDataSource } from "../OrderDataSource";
import type { Order, OrderStatus } from "@/types";
import { PRODUCTS } from "./products";

function buildMockOrders(): Order[] {
  const today = new Date();
  const d1 = new Date(today); d1.setDate(d1.getDate() - 3);
  const d2 = new Date(today); d2.setDate(d2.getDate() - 8);
  const d3 = new Date(today); d3.setDate(d3.getDate() - 15);
  const d4 = new Date(today); d4.setDate(d4.getDate() + 7);
  const d5 = new Date(today); d5.setDate(d5.getDate() + 14);
  const d6 = new Date(today); d6.setDate(d6.getDate() - 20);
  const d7 = new Date(today); d7.setDate(d7.getDate() - 30);
  const d8 = new Date(today); d8.setDate(d8.getDate() - 45);

  return [
    {
      id: "AF2026001", items: PRODUCTS.slice(0, 2), status: "shipped" as OrderStatus,
      totalUsd: 89.98, shippingUsd: 0, taxUsd: 8.99, createdAt: d1.toISOString(),
      address: { name: "Amadou Diallo", phone: "+227 91 23 45 67", street: "123 Avenue de l'Indépendance", city: "Niamey", country: "Niger" },
      trackingNumber: "EXPR20260714NE001", estimatedDelivery: d4.toLocaleDateString("fr-FR"),
    },
    {
      id: "AF2026002", items: PRODUCTS.slice(1, 3), status: "toShip" as OrderStatus,
      totalUsd: 65.5, shippingUsd: 12.0, taxUsd: 6.55, createdAt: d2.toISOString(),
      address: { name: "Fatouma Sidibé", phone: "+227 97 65 43 21", street: "45 Rue du Marché", city: "Niamey", country: "Niger" },
    },
    {
      id: "AF2026003", items: PRODUCTS.slice(0, 1), status: "unpaid" as OrderStatus,
      totalUsd: 29.99, shippingUsd: 5.0, taxUsd: 3.0, createdAt: d3.toISOString(),
      address: { name: "Ibrahim Kane", phone: "+227 88 77 66 55", street: "8 Boulevard de la République", city: "Niamey", country: "Niger" },
    },
    {
      id: "AF2026004", items: PRODUCTS.slice(2, 4), status: "toReview" as OrderStatus,
      totalUsd: 112.5, shippingUsd: 8.0, taxUsd: 11.25, createdAt: d6.toISOString(),
      address: { name: "Aïcha Mohamed", phone: "+227 92 34 56 78", street: "67 Rue du Commerce", city: "Niamey", country: "Niger" },
      trackingNumber: "EXPR20260625NE002", estimatedDelivery: d5.toLocaleDateString("fr-FR"),
    },
    {
      id: "AF2026005", items: PRODUCTS.slice(1, 2), status: "returns" as OrderStatus,
      totalUsd: 45.0, shippingUsd: 0, taxUsd: 4.5, createdAt: d7.toISOString(),
      address: { name: "Moussa Ali", phone: "+227 95 67 89 01", street: "12 Avenue des Arts", city: "Niamey", country: "Niger" },
    },
    {
      id: "AF2026006", items: PRODUCTS.slice(3, 5), status: "shipped" as OrderStatus,
      totalUsd: 156.0, shippingUsd: 0, taxUsd: 15.6, createdAt: d8.toISOString(),
      address: { name: "Hassan Diallo", phone: "+227 93 45 67 89", street: "5 Rue de la Paix", city: "Niamey", country: "Niger" },
      trackingNumber: "EXPR20260531NE003", estimatedDelivery: d4.toLocaleDateString("fr-FR"),
    },
  ];
}

export class MockOrderDataSource implements OrderDataSource {
  private orders = buildMockOrders();

  async getOrdersByStatus(status: OrderStatus | "all"): Promise<Order[]> {
    return status === "all" ? this.orders : this.orders.filter((o) => o.status === status);
  }

  async getOrderById(id: string): Promise<Order | undefined> {
    return this.orders.find((o) => o.id === id);
  }
}
