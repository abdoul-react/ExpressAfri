import type { Receipt, ReceiptSettings } from '../../AdminReceiptDataSource'

const NAMES = ['Abdou', 'Aminata', 'Ibrahim', 'Fatou', 'Moussa', 'Kadija', 'Oumar', 'Aissatou', 'Mamadou', 'Fanta']
const EMAILS = ['abdou', 'aminata', 'ibrahim', 'fatou', 'moussa', 'kadija', 'oumar', 'aissatou', 'mamadou', 'fanta']

export const MOCK_RECEIPTS: Receipt[] = Array.from({ length: 18 }, (_, i) => {
  const statuses: Receipt['status'][] = ['sent', 'sent', 'unsent', 'sent', 'failed', 'unsent']
  const types: Receipt['type'][] = ['email', 'sms', 'print', 'email', 'email', 'sms']
  const status = statuses[i % statuses.length]
  const type = types[i % types.length]
  return {
    id: `rec_${String(i + 1).padStart(4, '0')}`,
    orderId: `ord_${String(i + 1).padStart(4, '0')}`,
    orderNumber: `CMD-${String(1000 + i)}`,
    customerName: NAMES[i % NAMES.length],
    customerEmail: `${EMAILS[i % EMAILS.length]}@email.com`,
    customerPhone: i % 3 === 0 ? `+221 77 ${String(100 + i).slice(1)} ${String(200 + i).slice(1)} ${String(300 + i).slice(1)}` : undefined,
    amount: [15000, 45000, 25000, 65000, 35000, 8500, 12000, 55000, 32000, 72000][i % 10],
    currency: 'XOF',
    status,
    type,
    sentAt: status === 'sent' ? new Date(2026, 6, 1 + i, 10 + (i % 8), (i * 7) % 60).toISOString() : undefined,
    createdAt: new Date(2026, 5, 20 + i, 8, 0).toISOString(),
    downloadUrl: status === 'sent' ? `https://receipts.expressafri.com/${String(i + 1).padStart(4, '0')}.pdf` : undefined,
  }
})

export const MOCK_RECEIPT_SETTINGS: ReceiptSettings = {
  autoSend: true,
  defaultType: 'email',
  prefix: 'REC-',
  footerText: 'Merci pour votre confiance ! L\'équipe ExpressAfri',
  emailSubject: 'Votre reçu de commande {orderNumber}',
  emailTemplate: `Bonjour {customerName},

Merci pour votre commande {orderNumber}.

Montant : {amount} {currency}
Date : {date}

Votre reçu est joint à cet email.

{footer}`,
}
