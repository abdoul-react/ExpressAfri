import { Logger } from '@nestjs/common';
import type { SmsAdapter, SmsCredentials, SmsSendInput } from '../sms-adapter';

/**
 * Fournisseur factice de développement : le SMS est loggé (numéro masqué,
 * SANS le contenu — un code OTP ne doit jamais finir dans les logs).
 */
export class MockSmsAdapter implements SmsAdapter {
  readonly code = 'sms_mock';
  readonly label = 'Mock (développement)';
  readonly credentialKeys = [];
  private readonly logger = new Logger(MockSmsAdapter.name);

  async send(_creds: SmsCredentials, input: SmsSendInput) {
    const masked = input.to.replace(/\d(?=\d{2})/g, '•');
    this.logger.log(`[SMS mock] → ${masked} (${input.message.length} car.)`);
    return { ok: true, providerId: `mock_${Date.now()}` };
  }

  async testConnection() {
    return { ok: true, message: 'Mock : toujours disponible' };
  }
}
