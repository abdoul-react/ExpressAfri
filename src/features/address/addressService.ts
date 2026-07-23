import { addressDataSource, type Address } from "@/infrastructure/data-source";
import { isMock } from "@/infrastructure/mock";

export async function listAddresses(customerId: string): Promise<Address[]> {
  return addressDataSource.list(customerId);
}

export async function createAddress(
  customerId: string,
  data: Omit<Address, "id">,
): Promise<Address> {
  return addressDataSource.create(customerId, data);
}

export async function updateAddress(
  id: string,
  customerId: string,
  data: Partial<Omit<Address, "id">>,
): Promise<Address> {
  return addressDataSource.update(id, customerId, data);
}

export async function deleteAddress(id: string, customerId: string): Promise<void> {
  return addressDataSource.delete(id, customerId);
}

export async function setDefaultAddress(
  id: string,
  customerId: string,
): Promise<Address> {
  return addressDataSource.setDefault(id, customerId);
}

export const addressService = {
  list: listAddresses,
  create: createAddress,
  update: updateAddress,
  delete: deleteAddress,
  setDefault: setDefaultAddress,
};
