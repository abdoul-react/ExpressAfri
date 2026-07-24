import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  private getTransporter(): nodemailer.Transporter {
    if (this.transporter) return this.transporter;

    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT ?? '587');
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
      this.logger.warn('SMTP non configuré (SMTP_HOST/SMTP_USER/SMTP_PASS manquants) — emails désactivés');
      return null as any;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
    return this.transporter;
  }

  async sendPasswordReset(to: string, resetUrl: string): Promise<void> {
    const from = process.env.MAIL_FROM ?? `ExpressAfri <noreply@expressafri.com>`;
    const transport = this.getTransporter();

    if (!transport) {
      this.logger.warn(`[MAIL SKIPPED] reset url pour ${to}: ${resetUrl}`);
      return;
    }

    try {
      await transport.sendMail({
        from,
        to,
        subject: 'Réinitialisation de votre mot de passe — ExpressAfri',
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto">
            <h2 style="color:#f97316">ExpressAfri — Réinitialisation du mot de passe</h2>
            <p>Bonjour,</p>
            <p>Vous avez demandé la réinitialisation de votre mot de passe administrateur. Cliquez sur le lien ci-dessous (valable 1 heure) :</p>
            <p style="text-align:center;margin:32px 0">
              <a href="${resetUrl}" style="background:#f97316;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600">
                Réinitialiser mon mot de passe
              </a>
            </p>
            <p style="color:#6b7280;font-size:13px">Si vous n'avez pas fait cette demande, ignorez cet e-mail.</p>
            <p style="color:#6b7280;font-size:12px">Lien direct : ${resetUrl}</p>
          </div>
        `,
      });
      this.logger.log(`[MAIL SENT] reset password → ${to}`);
    } catch (err: any) {
      this.logger.error(`[MAIL ERROR] ${err?.message}`);
    }
  }
}
