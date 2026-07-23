import { Injectable, Inject, Logger } from '@nestjs/common'
import { eq, inArray } from 'drizzle-orm'
import { DRIZZLE, type DrizzleDB } from '../../database/database.module'
import { pushTokens } from '../../database/schema/push-tokens'

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'

type PushMessage = { title: string; body: string; data?: Record<string, unknown> }

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name)

  constructor(@Inject(DRIZZLE) private db: DrizzleDB) {}

  /**
   * Enregistre (ou réassocie) un jeton Expo Push pour un client. Upsert sur le
   * `token` : un même appareil qui change de compte réécrit sa ligne vers le
   * client courant.
   */
  async registerToken(customerId: string, token: string, platform?: string) {
    const value = (token ?? '').trim()
    if (!value) return
    await this.db
      .insert(pushTokens)
      .values({ customerId, token: value, platform })
      .onConflictDoUpdate({
        target: pushTokens.token,
        set: { customerId, platform, updatedAt: new Date() },
      })
  }

  /** Retire un jeton (déconnexion). */
  async removeToken(token: string) {
    const value = (token ?? '').trim()
    if (!value) return
    await this.db.delete(pushTokens).where(eq(pushTokens.token, value))
  }

  /**
   * Envoie une notification push à tous les appareils d'un client. Best-effort :
   * ne lève jamais (une notif ratée ne doit pas casser l'action métier). No-op
   * si le client n'a aucun jeton. Purge les jetons périmés (`DeviceNotRegistered`).
   */
  async sendToCustomer(customerId: string | null | undefined, message: PushMessage): Promise<void> {
    try {
      if (!customerId) return
      const rows = await this.db.select().from(pushTokens).where(eq(pushTokens.customerId, customerId))
      if (rows.length === 0) return

      const messages = rows.map((r) => ({
        to: r.token,
        title: message.title,
        body: message.body,
        data: message.data ?? {},
        sound: 'default' as const,
      }))

      // Expo accepte des lots ≤ 100 messages.
      const stale: string[] = []
      for (let i = 0; i < messages.length; i += 100) {
        const batch = messages.slice(i, i + 100)
        const res = await fetch(EXPO_PUSH_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(batch),
        })
        if (!res.ok) {
          this.logger.warn(`Expo push HTTP ${res.status}`)
          continue
        }
        const json: any = await res.json()
        const tickets: any[] = Array.isArray(json?.data) ? json.data : []
        tickets.forEach((ticket, idx) => {
          if (ticket?.status === 'error' && ticket?.details?.error === 'DeviceNotRegistered') {
            const bad = batch[idx]?.to
            if (bad) stale.push(bad)
          }
        })
      }

      if (stale.length > 0) {
        await this.db.delete(pushTokens).where(inArray(pushTokens.token, stale))
      }
    } catch (err) {
      this.logger.warn(`sendToCustomer a échoué (ignoré) : ${(err as Error)?.message ?? err}`)
    }
  }
}
