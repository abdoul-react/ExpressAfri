import type { RoleId } from './Role'

export interface AdminUser {
  id: string
  email: string
  name: string
  role: RoleId
  permissions: string[] | '*'
  isSuperAdmin: boolean
  avatar?: string
  /** Gérant de boutique : id de SA boutique — toutes ses vues sont cloisonnées à celle-ci. */
  storeId?: string | null
}
