import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { OutboxService } from './outbox.service';
import { ChatService } from '../chat/chat.service';
import { PushService } from '../push/push.service';
import { AppLoggerService } from '../../common/logger/logger.service';
import { setLogContext } from '../../common/interceptors/request-id.interceptor';

const POLL_INTERVAL_MS = 5_000;

@Injectable()
export class OutboxWorker implements OnModuleInit, OnModuleDestroy {
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private outbox: OutboxService,
    private chat: ChatService,
    private push: PushService,
    private logger: AppLoggerService,
  ) {}

  onModuleInit() {
    this.timer = setInterval(() => this.tick(), POLL_INTERVAL_MS);
    // Prevent the interval from keeping the Node process alive (useful for tests)
    const timer = this.timer;
    if (
      timer &&
      typeof (timer as unknown as { unref?: () => void }).unref === 'function'
    ) {
      (timer as unknown as { unref: () => void }).unref();
    }
    this.tick();
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async tick() {
    try {
      await this.outbox.processNextBatch((event) => this.handle(event));
    } catch (err) {
      this.logger.error(`tick outbox échoué: ${(err as Error)?.message}`);
    }
  }

  private async handle(event: { type: string; payload: unknown; id: string }) {
    const p = event.payload as Record<string, unknown>;
    switch (event.type) {
      case 'order.status_changed':
      case 'order.shipment_created':
      case 'order.item_issue': {
        const orderId = p.orderId as string;
        const content = p.content as string;
        const customerId = p.customerId as string | undefined;
        const orderNumber = p.orderNumber as string | undefined;

        if (orderId && content) {
          await this.chat.postOrderSystemMessage(orderId, content);
        }

        if (customerId && orderNumber) {
          try {
            await this.push.sendToCustomer(customerId, {
              title: `Commande ${orderNumber}`,
              body: content.slice(0, 160),
              data: { type: 'order', orderId },
            });
          } catch (err) {
            setLogContext('orderId', orderId);
            this.logger.warn(
              `Échec envoi push pour commande ${orderId}: ${err instanceof Error ? err.message : err}`,
            );
          }
        }
        break;
      }
      case 'payment.refunded': {
        const customerId = p.customerId as string | undefined;
        const orderNumber = p.orderNumber as string | undefined;
        const amount = p.amount as string | undefined;
        if (customerId) {
          try {
            await this.push.sendToCustomer(customerId, {
              title: 'Remboursement effectué',
              body: amount
                ? `Votre remboursement de ${amount} a été traité.`
                : `Votre commande ${orderNumber ?? ''} a été remboursée.`,
              data: { type: 'payment', orderId: p.orderId as string },
            });
          } catch (err) {
            this.logger.warn(`Échec push payment.refunded: ${err instanceof Error ? err.message : err}`);
          }
        }
        break;
      }
      case 'return.status_changed': {
        const customerId = p.customerId as string | undefined;
        const status = p.status as string | undefined;
        if (customerId) {
          try {
            await this.push.sendToCustomer(customerId, {
              title: 'Retour mis à jour',
              body: `Votre retour est maintenant : ${status ?? 'mis à jour'}.`,
              data: { type: 'return', returnId: p.returnId as string },
            });
          } catch (err) {
            this.logger.warn(`Échec push return.status_changed: ${err instanceof Error ? err.message : err}`);
          }
        }
        break;
      }
      case 'loyalty.points_earned': {
        const customerId = p.customerId as string | undefined;
        const points = p.points as number | undefined;
        if (customerId) {
          try {
            await this.push.sendToCustomer(customerId, {
              title: 'Points de fidélité',
              body: `Vous avez gagné ${points ?? ''} points de fidélité !`,
              data: { type: 'loyalty' },
            });
          } catch (err) {
            this.logger.warn(`Échec push loyalty.points_earned: ${err instanceof Error ? err.message : err}`);
          }
        }
        break;
      }
      case 'loyalty.points_adjusted': {
        const customerId = p.customerId as string | undefined;
        const points = p.points as number | undefined;
        const reason = p.reason as string | undefined;
        if (customerId) {
          try {
            await this.push.sendToCustomer(customerId, {
              title: 'Points fidélité mis à jour',
              body: points != null
                ? `Vous avez ${points > 0 ? '+' : ''}${points} point(s). ${reason ?? ''}`.trim()
                : reason ?? 'Vos points ont été mis à jour.',
              data: { type: 'loyalty' },
            });
          } catch (err) {
            this.logger.warn(`Échec push loyalty pour customer ${customerId}: ${err instanceof Error ? err.message : err}`);
          }
        }
        break;
      }
      case 'campaign.launched': {
        const targets = (p.customerIds as string[] | undefined) ?? [];
        const title = (p.title as string | undefined) ?? 'Nouvelle promotion';
        const body = (p.body as string | undefined) ?? '';
        for (const cid of targets) {
          try {
            await this.push.sendToCustomer(cid, { title, body, data: { type: 'campaign' } });
          } catch {
            // best-effort
          }
        }
        break;
      }
      case 'notification.broadcast': {
        const targets = (p.customerIds as string[] | undefined) ?? [];
        const title = (p.title as string | undefined) ?? 'Notification';
        const body = (p.body as string | undefined) ?? '';
        for (const cid of targets) {
          try {
            await this.push.sendToCustomer(cid, { title, body, data: { type: 'broadcast' } });
          } catch {
            // best-effort
          }
        }
        break;
      }
      default:
        setLogContext('aggregateId', event.id);
        this.logger.warn(`Type d'événement outbox inconnu: ${event.type}`);
    }
  }

  get isRunning(): boolean {
    return this.timer !== null;
  }
}
