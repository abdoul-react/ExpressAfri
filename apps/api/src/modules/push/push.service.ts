import { Injectable, Inject, Logger } from '@nestjs/common';
import { eq, inArray } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '../../database/database.module';
import { pushTokens } from '../../database/schema/push-tokens';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1_000;

type PushMessage = {
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  constructor(@Inject(DRIZZLE) private db: DrizzleDB) {}

  async registerToken(customerId: string, token: string, platform?: string) {
    const value = (token ?? '').trim();
    if (!value) return;
    await this.db
      .insert(pushTokens)
      .values({ customerId, token: value, platform })
      .onConflictDoUpdate({
        target: pushTokens.token,
        set: { customerId, platform, updatedAt: new Date() },
      });
  }

  async removeToken(token: string) {
    const value = (token ?? '').trim();
    if (!value) return;
    await this.db.delete(pushTokens).where(eq(pushTokens.token, value));
  }

  async sendToCustomer(
    customerId: string | null | undefined,
    message: PushMessage,
  ): Promise<void> {
    try {
      if (!customerId) return;
      const rows = await this.db
        .select()
        .from(pushTokens)
        .where(eq(pushTokens.customerId, customerId));
      if (rows.length === 0) return;

      const messages = rows.map((r) => ({
        to: r.token,
        title: message.title,
        body: message.body,
        data: {
          ...(message.data ?? {}),
          ...(message.data?.orderId
            ? { deepLink: `expressafri://orders/${message.data.orderId}` }
            : {}),
          ...(message.data?.trackingId
            ? { deepLink: `expressafri://orders/tracking/${message.data.trackingId}` }
            : {}),
        },
        sound: 'default' as const,
      }));

      const stale: string[] = [];
      for (let i = 0; i < messages.length; i += 100) {
        const batch = messages.slice(i, i + 100);
        let lastErr: Error | undefined;
        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
          if (attempt > 0) {
            await new Promise((r) =>
              setTimeout(r, RETRY_DELAY_MS * Math.pow(2, attempt - 1)),
            );
          }
          try {
            const res = await fetch(EXPO_PUSH_URL, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
              },
              body: JSON.stringify(batch),
            });
            if (res.ok) {
              const json: any = await res.json();
              const tickets: any[] = Array.isArray(json?.data) ? json.data : [];
              tickets.forEach((ticket, idx) => {
                if (
                  ticket?.status === 'error' &&
                  ticket?.details?.error === 'DeviceNotRegistered'
                ) {
                  const bad = batch[idx]?.to;
                  if (bad) stale.push(bad);
                }
              });
              lastErr = undefined;
              break;
            }
            if (res.status >= 500) {
              lastErr = new Error(`Expo HTTP ${res.status}`);
              continue;
            }
            lastErr = new Error(`Expo HTTP ${res.status} (non retryable)`);
            break;
          } catch (fetchErr) {
            lastErr =
              fetchErr instanceof Error
                ? fetchErr
                : new Error(String(fetchErr));
          }
        }
        if (lastErr) {
          this.logger.warn(
            `Push batch échoué après ${MAX_RETRIES} tentatives: ${lastErr.message}`,
          );
        }
      }

      if (stale.length > 0) {
        await this.db
          .delete(pushTokens)
          .where(inArray(pushTokens.token, stale));
      }
    } catch (err) {
      this.logger.warn(
        `sendToCustomer a échoué (ignoré) : ${(err as Error)?.message ?? err}`,
      );
    }
  }
}
