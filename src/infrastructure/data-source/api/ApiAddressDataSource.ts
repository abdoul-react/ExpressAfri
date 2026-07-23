import type { AddressDataSource, Address } from "../AddressDataSource";
import { apiAdapter } from "@/infrastructure/api/apiAdapter";

/**
 * Adresses du client CONNECTÉ. Les routes /mobile/addresses identifient le
 * client via son jeton — le paramètre customerId de l'interface est donc
 * ignoré ici (conservé pour compatibilité avec l'interface partagée).
 * (Les anciennes routes /customers/:id/addresses sont réservées à l'admin.)
 */
const BASE = "/mobile/addresses";

export class ApiAddressDataSource implements AddressDataSource {
  async list(_customerId: string): Promise<Address[]> {
    return apiAdapter.get(BASE);
  }

  async create(_customerId: string, data: Omit<Address, "id">): Promise<Address> {
    return apiAdapter.post(BASE, data as any);
  }

  async update(
    id: string,
    _customerId: string,
    data: Partial<Omit<Address, "id">>,
  ): Promise<Address> {
    return apiAdapter.put(`${BASE}/${id}`, data as any);
  }

  async delete(id: string, _customerId: string): Promise<void> {
    return apiAdapter.del(`${BASE}/${id}`);
  }

  async setDefault(id: string, _customerId: string): Promise<Address> {
    return apiAdapter.put(`${BASE}/${id}/default`, {});
  }
}
