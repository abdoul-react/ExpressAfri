import type { AdminPermissionDataSource } from '../AdminPermissionDataSource'
import { MOCK_PERMISSIONS } from './data/mockPermissions'

export class MockAdminPermissionDataSource implements AdminPermissionDataSource {
  private delay(ms = 100) { return new Promise<void>((r) => setTimeout(r, ms)) }

  async list() {
    await this.delay()
    return [...MOCK_PERMISSIONS]
  }
}
