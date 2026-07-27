import type { SmsAdapter, SmsCredentials, SmsSendInput } from '../sms-adapter';

const API_URL = 'https://api.africastalking.com/version1';

/**
 * Africa's Talking — SMS panafricain (bien implanté en Afrique de l'Ouest et
 * de l'Est, tarifs locaux). Auth par header apiKey + username, POST
 * form-urlencoded sur /messaging. Docs : developers.africastalking.com
 */
export class AfricasTalkingSmsAdapter implements SmsAdapter {
  readonly code = 'africas_talking';
  readonly label = "Africa's Talking";
  readonly credentialKeys = [
    {
      key: 'username',
      label: "Username (app AT, 'sandbox' pour tester)",
      secret: false,
    },
    { key: 'apiKey', label: 'API Key', secret: true },
  ];

  async send(creds: SmsCredentials, input: SmsSendInput) {
    const base = input.apiEndpoint || API_URL;
    const params = new URLSearchParams({
      username: creds.username,
      to: input.to,
      message: input.message,
    });
    if (input.senderId) params.set('from', input.senderId);
    const res = await fetch(`${base}/messaging`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        apiKey: creds.apiKey,
        Accept: 'application/json',
      },
      body: params.toString(),
    });
    const body = (await res.json().catch(() => ({}))) as any;
    const recipient = body?.SMSMessageData?.Recipients?.[0];
    // statusCode 100/101/102 = accepté/en file
    const ok =
      recipient &&
      [100, 101, 102].includes(Number(recipient.statusCode ?? 0));
    if (!ok) {
      return {
        ok: false,
        message:
          recipient?.status ??
          body?.SMSMessageData?.Message ??
          `Africa's Talking HTTP ${res.status}`,
      };
    }
    return { ok: true, providerId: String(recipient.messageId ?? '') };
  }

  async testConnection(
    creds: SmsCredentials,
    ctx: { apiEndpoint?: string | null },
  ) {
    try {
      const base = ctx.apiEndpoint || API_URL;
      const res = await fetch(
        `${base}/user?username=${encodeURIComponent(creds.username)}`,
        { headers: { apiKey: creds.apiKey, Accept: 'application/json' } },
      );
      if (res.status === 401) {
        return { ok: false, message: 'API Key ou username invalide' };
      }
      const body = (await res.json().catch(() => null)) as any;
      if (body?.UserData) {
        return {
          ok: true,
          message: `Compte OK — solde : ${body.UserData.balance ?? '?'}`,
        };
      }
      return { ok: true, message: "Identifiants Africa's Talking acceptés" };
    } catch (e) {
      return {
        ok: false,
        message: e instanceof Error ? e.message : 'Erreur réseau',
      };
    }
  }
}
