import type { SmsAdapter, SmsCredentials, SmsSendInput } from '../sms-adapter';

const API_URL = 'https://api.twilio.com/2010-04-01';

/**
 * Twilio — SMS mondial. Auth Basic accountSid:authToken, POST form-urlencoded
 * sur /Accounts/{sid}/Messages.json. Le `from` est soit le sender ID
 * alphanumérique (pays qui l'acceptent), soit un numéro Twilio acheté.
 * Docs : twilio.com/docs/sms
 */
export class TwilioSmsAdapter implements SmsAdapter {
  readonly code = 'twilio';
  readonly label = 'Twilio';
  readonly credentialKeys = [
    { key: 'accountSid', label: 'Account SID (AC…)', secret: false },
    { key: 'authToken', label: 'Auth Token', secret: true },
    {
      key: 'fromNumber',
      label: 'Numéro expéditeur (+1…)',
      secret: false,
      hint: 'Numéro Twilio acheté ; le Sender ID alphanumérique le remplace là où il est accepté',
    },
  ];

  async send(creds: SmsCredentials, input: SmsSendInput) {
    const base = input.apiEndpoint || API_URL;
    const params = new URLSearchParams({
      To: input.to,
      From: input.senderId || creds.fromNumber,
      Body: input.message,
    });
    const res = await fetch(
      `${base}/Accounts/${encodeURIComponent(creds.accountSid)}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(`${creds.accountSid}:${creds.authToken}`).toString('base64')}`,
        },
        body: params.toString(),
      },
    );
    const body = (await res.json()) as any;
    if (!res.ok || body?.error_code) {
      return {
        ok: false,
        message: body?.message ?? `Twilio HTTP ${res.status}`,
      };
    }
    return { ok: true, providerId: String(body?.sid ?? '') };
  }

  async testConnection(
    creds: SmsCredentials,
    ctx: { apiEndpoint?: string | null },
  ) {
    try {
      const base = ctx.apiEndpoint || API_URL;
      const res = await fetch(
        `${base}/Accounts/${encodeURIComponent(creds.accountSid)}.json`,
        {
          headers: {
            Authorization: `Basic ${Buffer.from(`${creds.accountSid}:${creds.authToken}`).toString('base64')}`,
          },
        },
      );
      if (res.status === 401) {
        return { ok: false, message: 'Account SID ou Auth Token invalide' };
      }
      return { ok: true, message: 'Identifiants Twilio acceptés' };
    } catch (e) {
      return {
        ok: false,
        message: e instanceof Error ? e.message : 'Erreur réseau',
      };
    }
  }
}
