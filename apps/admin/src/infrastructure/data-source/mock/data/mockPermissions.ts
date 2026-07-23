import { PERMISSIONS, type Permission } from '@/types/Permission'

export const MOCK_PERMISSIONS = Object.entries(PERMISSIONS).map(([key, label]) => ({
  key: key as Permission,
  label,
}))
