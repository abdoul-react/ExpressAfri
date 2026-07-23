import { Injectable, Inject, NotFoundException } from '@nestjs/common'
import { eq, sql } from 'drizzle-orm'
import { DRIZZLE, type DrizzleDB } from '../../database/database.module'
import { appSettings, featureFlags } from '../../database/schema/settings'

@Injectable()
export class SettingsService {
  constructor(@Inject(DRIZZLE) private db: DrizzleDB) {}

  async listSettings() {
    return this.db.select().from(appSettings).orderBy(appSettings.group, appSettings.key)
  }

  async updateSetting(key: string, value: string) {
    const [updated] = await this.db.update(appSettings)
      .set({ value, updatedAt: new Date() })
      .where(eq(appSettings.key, key))
      .returning()
    if (!updated) throw new NotFoundException('Paramètre introuvable')
    return updated
  }

  async listFeatureFlags() {
    return this.db.select().from(featureFlags).orderBy(featureFlags.group, featureFlags.key)
  }

  async toggleFeatureFlag(key: string, enabled: boolean) {
    const [updated] = await this.db.update(featureFlags)
      .set({ enabled, updatedAt: new Date() })
      .where(eq(featureFlags.key, key))
      .returning()
    if (!updated) throw new NotFoundException('Fonctionnalité introuvable')
    return updated
  }
}
