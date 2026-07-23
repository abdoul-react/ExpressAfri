export interface Address {
  id: string
  countryCode: string
  contactName: string
  phone: string
  street: string
  apartment?: string
  city: string
  province?: string
  postalCode?: string
  label?: string
  isDefault?: boolean
}

export interface AddressDataSource {
  list(customerId: string): Promise<Address[]>
  create(customerId: string, data: Omit<Address, 'id'>): Promise<Address>
  update(id: string, customerId: string, data: Partial<Omit<Address, 'id'>>): Promise<Address>
  delete(id: string, customerId: string): Promise<void>
  setDefault(id: string, customerId: string): Promise<Address>
}
