import type { SmsAdapter, SmsCredentials, SmsSendInput } from '../sms-adapter';

const API_URL = 'https://api.orange.com';

/**
 * Orange SMS API (zone Orange Afrique) — OAuth2 client_credentials puis POST
 * sur /smsmessaging/v1/outbound/{senderAddress}/requests. Le senderAddress
 * est le numéro court/dédié fourni par Orange au contrat.
 * Docs : developer.orange.com → SMS
 */
export class OrangeSmsAdapter implements SmsAdapter {
  readonly code = 'orange_sms';
  readonly label = 'Orange SMS API';
  readonly credentialKeys = [
    { key: 'clientId', label: 'Client ID (OAuth)', secret: false },
    { key: 'clientSecret', label: 'Client Secret (OAuth)', secret: true },
    {
      key: 'senderAddress',
      label: 'Sender address (tel:+225…)',
      secret: false,
      hint: 'Numéro dédié fourni par Orange, format tel:+XXX',
    },
  ];

  private async token(creds: SmsCredentials, base: string): Promise<string> {
    const res = await fetch(`${base}/oauth/v3/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${creds.clientId}:${creds.clientSecret}`).toString('base64')}`,
      },
      body: 'grant_type=client_credentials',
    });
    const body = (await res.json()) as any;
    if (!body?.access_token) {
      throw new Error(
        `Orange SMS OAuth : ${body?.error_description ?? `HTTP ${res.status}`}`,
      );
    }
    return String(body.access_token);
  }

  async send(creds: SmsCredentials, input: SmsSendInput) {
    try {
      const base = input.apiEndpoint || API_URL;
      const accessToken = await this.token(creds, base);
      const sender = creds.senderAddress.startsWith('tel:')
        ? creds.senderAddress
        : `tel:${creds.senderAddress}`;
      const to = input.to.startsWith('tel:') ? input.to : `tel:${input.to}`;
      const res = await fetch(
        `${base}/smsmessaging/v1/outbound/${encodeURIComponent(sender)}/requests`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            outboundSMSMessageRequest: {
              address: to,
              senderAddress: sender,
              ...(input.senderId ? { senderName: input.senderId } : {}),
              outboundSMSTextMessage: { message: input.message },
            },
          }),
        },
      );
      if (res.status !== 201) {
        const body = (await res.json().catch(() => ({}))) as any;
        return {
          ok: false,
          message:
            body?.requestError?.serviceException?.text ??
            `Orange SMS HTTP ${res.status}`,
        };
      }
      return { ok: true };
    } catch (e) {
      return {
        ok: false,
        message: e instanceof Error ? e.message : 'Erreur réseau',
      };
    }
  }

  async testConnection(
    creds: SmsCredentials,
    ctx: { apiEndpoint?: string | null },
  ) {
    try {
      await this.token(creds, ctx.apiEndpoint || API_URL);
      return { ok: true, message: 'OAuth Orange SMS accepté' };
    } catch (e) {
      return {
        ok: false,
        message: e instanceof Error ? e.message : 'Erreur réseau',
      };
    }
  }
}
