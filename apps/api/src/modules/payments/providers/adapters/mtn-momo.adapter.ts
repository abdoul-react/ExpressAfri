import { randomUUID } from 'node:crypto';
import type {
  GatewayAdapter,
  GatewayCredentials,
  GatewayInitializeInput,
  GatewayInitializeResult,
  GatewayWebhookEvent,
} from '../gateway-adapter';

const SANDBOX_URL = 'https://sandbox.momodeveloper.mtn.com';
const PROD_URL = 'https://momodeveloper.mtn.com';

/**
 * MTN MoMo Collections (API directe). Particularité : requesttopay est
 * ASYNCHRONE sans page de paiement — le client valide sur son téléphone
 * (push USSD) et il n'y a PAS de webhook fiable : la confirmation passe par
 * getStatus (réconciliation active, déjà branchée sur l'endpoint statut).
 * Docs : momodeveloper.mtn.com
 */
export class MtnMomoAdapter implements GatewayAdapter {
  readonly code = 'mtn_direct';
  readonly label = 'MTN MoMo (direct)';
  readonly credentialKeys = [
    {
      key: 'subscriptionKey',
      label: 'Subscription Key (Collections)',
      secret: true,
      hint: 'Profil momodeveloper.mtn.com → Subscriptions → Collections',
    },
    { key: 'apiUser', label: 'API User (UUID)', secret: false },
    { key: 'apiKey', label: 'API Key', secret: true },
    {
      key: 'targetEnvironment',
      label: 'Target environment',
      secret: false,
      hint: 'sandbox, ou le code pays en production (ex. mtnivorycoast)',
    },
  ];

  private baseUrl(isSandbox: boolean, endpoint?: string | null): string {
    return endpoint || (isSandbox ? SANDBOX_URL : PROD_URL);
  }

  private async token(
    creds: GatewayCredentials,
    base: string,
  ): Promise<string> {
    const res = await fetch(`${base}/collection/token/`, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': creds.subscriptionKey,
        Authorization: `Basic ${Buffer.from(`${creds.apiUser}:${creds.apiKey}`).toString('base64')}`,
      },
    });
    const body = (await res.json()) as any;
    if (!body?.access_token) {
      throw new Error(`MTN MoMo OAuth : HTTP ${res.status}`);
    }
    return String(body.access_token);
  }

  async initialize(
    creds: GatewayCredentials,
    input: GatewayInitializeInput,
  ): Promise<GatewayInitializeResult> {
    if (!input.phoneNumber) {
      throw new Error('MTN MoMo : numéro de téléphone du payeur requis');
    }
    const base = this.baseUrl(input.isSandbox, input.apiEndpoint);
    const accessToken = await this.token(creds, base);
    const referenceId = randomUUID();
    const res = await fetch(`${base}/collection/v1_0/requesttopay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': creds.subscriptionKey,
        'X-Reference-Id': referenceId,
        'X-Target-Environment':
          creds.targetEnvironment || (input.isSandbox ? 'sandbox' : ''),
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        amount: String(Math.round(Number(input.amount))),
        // Le sandbox MTN n'accepte que l'EUR
        currency: input.isSandbox ? 'EUR' : input.currency,
        externalId: input.paymentId,
        payer: {
          partyIdType: 'MSISDN',
          partyId: input.phoneNumber.replace(/\D/g, ''),
        },
        payerMessage: 'Commande ExpressAfri',
        payeeNote: input.paymentId,
      }),
    });
    // 202 Accepted = demande envoyée au téléphone du client
    if (res.status !== 202) {
      const body = (await res.json().catch(() => ({}))) as any;
      throw new Error(`MTN MoMo : ${body?.message ?? `HTTP ${res.status}`}`);
    }
    return {
      providerPaymentId: referenceId,
      // Pas de page web : le client valide sur son téléphone. Le mobile
      // affiche l'écran d'attente et le statut est réconcilié par polling.
      checkoutUrl: undefined,
      status: 'pending',
    };
  }

  verifyWebhook(): boolean {
    // Pas de webhook signé exploitable : tout POST entrant est refusé, la
    // vérité vient de getStatus. Refuser ici est un choix de sécurité.
    return false;
  }

  parseWebhook(rawBody: Buffer): GatewayWebhookEvent {
    const body = JSON.parse(rawBody.toString('utf8'));
    return {
      eventId: String(body?.externalId ?? '') + ':' + String(body?.status ?? ''),
      providerPaymentId: String(body?.referenceId ?? ''),
      status: body?.status === 'SUCCESSFUL' ? 'captured' : 'failed',
    };
  }

  async getStatus(
    creds: GatewayCredentials,
    providerPaymentId: string,
    ctx: { isSandbox: boolean; apiEndpoint?: string | null },
  ): Promise<'pending' | 'captured' | 'failed'> {
    const base = this.baseUrl(ctx.isSandbox, ctx.apiEndpoint);
    const accessToken = await this.token(creds, base);
    const res = await fetch(
      `${base}/collection/v1_0/requesttopay/${encodeURIComponent(providerPaymentId)}`,
      {
        headers: {
          'Ocp-Apim-Subscription-Key': creds.subscriptionKey,
          'X-Target-Environment':
            creds.targetEnvironment || (ctx.isSandbox ? 'sandbox' : ''),
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    const body = (await res.json()) as any;
    const status = String(body?.status ?? '');
    if (status === 'SUCCESSFUL') return 'captured';
    if (status === 'FAILED' || status === 'REJECTED' || status === 'TIMEOUT')
      return 'failed';
    return 'pending';
  }

  async testConnection(
    creds: GatewayCredentials,
    ctx: { isSandbox: boolean; apiEndpoint?: string | null },
  ): Promise<{ ok: boolean; message?: string }> {
    try {
      await this.token(creds, this.baseUrl(ctx.isSandbox, ctx.apiEndpoint));
      return { ok: true, message: 'OAuth MTN MoMo accepté' };
    } catch (e) {
      return {
        ok: false,
        message: e instanceof Error ? e.message : 'Erreur réseau',
      };
    }
  }
}
