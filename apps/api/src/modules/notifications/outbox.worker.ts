import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common'
import { OutboxService } from './outbox.service'
import { ChatService } from '../chat/chat.service'
import { PushService } from '../push/push.service'
import { AppLoggerService } from '../../common/logger/logger.service'
import { setLogContext } from '../../common/interceptors/request-id.interceptor'

const POLL_INTERVAL_MS = 5_000

@Injectable()
export class OutboxWorker implements OnModuleInit, OnModuleDestroy {
  private timer: ReturnType<typeof setInterval> | null = null

  constructor(
    private outbox: OutboxService,
    private chat: ChatService,
    private push: PushService,
    private logger: AppLoggerService,
  ) {}

  onModuleInit() {
    this.timer = setInterval(() => this.tick(), POLL_INTERVAL_MS)
    // Prevent the interval from keeping the Node process alive (useful for tests)
    const timer = this.timer
    if (timer && typeof (timer as unknown as { unref?: () => void }).unref === 'function') {
      ;(timer as unknown as { unref: () => void }).unref()
    }
    this.tick()
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  private async tick() {
    try {
      await this.outbox.processNextBatch((event) => this.handle(event))
    } catch (err) {
      this.logger.error(`tick outbox échoué: ${(err as Error)?.message}`)
    }
  }

  private async handle(event: { type: string; payload: unknown; id: string }) {
    const p = event.payload as Record<string, unknown>
    switch (event.type) {
      case 'order.status_changed':
      case 'order.shipment_created':
      case 'order.item_issue':
        const orderId = p.orderId as string
        const content = p.content as string
        const customerId = p.customerId as string | undefined
        const orderNumber = p.orderNumber as string | undefined

        // Publier le message système dans le chat de la commande
        if (orderId && content) {
          await this.chat.postOrderSystemMessage(orderId, content)
        }

        // Envoyer une notification push au client (best-effort, ne pas bloquer)
        if (customerId && orderNumber) {
          try {
            await this.push.sendToCustomer(customerId, {
              title: `Commande ${orderNumber}`,
              body: content.slice(0, 160),
              data: { type: 'order', orderId },
            })
          } catch (err) {
            setLogContext('orderId', orderId)
            this.logger.warn(`Échec envoi push pour commande ${orderId}: ${err instanceof Error ? err.message : err}`)
          }
        }
        break
      default:
        setLogContext('aggregateId', event.id)
        this.logger.warn(`Type d'événement outbox inconnu: ${event.type}`)
    }
  }

  get isRunning(): boolean {
    return this.timer !== null
  }
}
