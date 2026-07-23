const RECEIPT_TEMPLATE_COLORS = {
  pageBg: '#f3f4f6',
  surface: '#ffffff',
  surfaceMuted: '#f9fafb',
  border: '#e5e7eb',
  borderLight: '#f3f4f6',
  inkStrong: '#111827',
  ink: '#374151',
  inkMuted: '#6b7280',
  inkFaint: '#9ca3af',
  brand: '#f97316',
  brandLight: '#fb923c',
} as const

export function generateReceiptHTML(opts: {
  orderNumber: string
  customerName: string
  customerEmail?: string | null
  customerPhone?: string | null
  amount: number
  currency: string
  sentAt?: string | null
  createdAt?: string | null
  accentColor?: string
  brandName?: string
  logoUrl?: string
  footerText?: string
  showBarcode?: boolean
}): string {
  const c = RECEIPT_TEMPLATE_COLORS
  const brand = opts.accentColor ?? c.brand
  const brandLight = opts.accentColor ?? c.brandLight
  const brandName = opts.brandName || 'ExpressAfri'
  const logoUrl = opts.logoUrl || ''
  const footerText = opts.footerText || 'Merci pour votre achat.'
  const showBarcode = opts.showBarcode ?? false

  const date = opts.sentAt
    ? new Date(opts.sentAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
    : opts.createdAt
      ? new Date(opts.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
      : new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
  const amount = new Intl.NumberFormat('fr-FR').format(opts.amount) + ' ' + opts.currency

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: ${c.pageBg}; display: flex; justify-content: center; padding: 32px 16px; }
    .receipt { background: ${c.surface}; width: 100%; max-width: 480px; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,.08); }
    .header { background: linear-gradient(135deg, ${brand} 0%, ${brandLight} 100%); padding: 28px 28px 20px; color: ${c.surface}; }
    .header-inner { display: flex; align-items: center; gap: 14px; }
    .logo { height: 48px; max-width: 140px; object-fit: contain; border-radius: 6px; background: rgba(255,255,255,.15); padding: 4px 8px; }
    .header h1 { font-size: 22px; font-weight: 700; letter-spacing: -.5px; }
    .header p { font-size: 13px; opacity: .85; margin-top: 4px; }
    .badge { display: inline-block; background: rgba(255,255,255,.2); border-radius: 20px; padding: 3px 12px; font-size: 12px; font-weight: 600; margin-top: 10px; }
    .body { padding: 24px 28px; }
    .section { margin-bottom: 20px; }
    .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .8px; color: ${c.inkFaint}; margin-bottom: 10px; }
    .row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid ${c.borderLight}; }
    .row:last-child { border-bottom: none; }
    .row .label { font-size: 13px; color: ${c.inkMuted}; }
    .row .value { font-size: 13px; font-weight: 600; color: ${c.inkStrong}; }
    .total-row { background: ${c.surfaceMuted}; border-radius: 8px; padding: 14px 16px; margin-top: 8px; display: flex; justify-content: space-between; align-items: center; }
    .total-row .label { font-size: 14px; font-weight: 600; color: ${c.ink}; }
    .total-row .value { font-size: 20px; font-weight: 800; color: ${brand}; }
    .barcode-section { padding: 16px 28px 0; text-align: center; }
    .barcode-label { font-family: 'Courier New', monospace; font-size: 13px; letter-spacing: 4px; color: ${c.inkStrong}; font-weight: 700; border: 2px solid ${c.border}; display: inline-block; padding: 8px 16px; border-radius: 4px; }
    .barcode-sub { font-size: 10px; color: ${c.inkFaint}; margin-top: 4px; }
    .footer { padding: 16px 28px; background: ${c.surfaceMuted}; border-top: 1px solid ${c.border}; text-align: center; }
    .footer p { font-size: 12px; color: ${c.inkFaint}; }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="header">
      <div class="header-inner">
        ${logoUrl ? `<img src="${logoUrl}" alt="${brandName}" class="logo" />` : ''}
        <div>
          <h1>${brandName}</h1>
          <p>Reçu de paiement</p>
        </div>
      </div>
      <div class="badge">N° ${opts.orderNumber}</div>
    </div>
    <div class="body">
      <div class="section">
        <p class="section-title">Informations client</p>
        <div class="row"><span class="label">Nom</span><span class="value">${opts.customerName}</span></div>
        ${opts.customerEmail ? `<div class="row"><span class="label">Email</span><span class="value">${opts.customerEmail}</span></div>` : ''}
        ${opts.customerPhone ? `<div class="row"><span class="label">Téléphone</span><span class="value">${opts.customerPhone}</span></div>` : ''}
      </div>
      <div class="section">
        <p class="section-title">Détail de la commande</p>
        <div class="row"><span class="label">Référence commande</span><span class="value">${opts.orderNumber}</span></div>
        <div class="row"><span class="label">Date</span><span class="value">${date}</span></div>
        <div class="row"><span class="label">Statut</span><span class="value">Payé</span></div>
      </div>
      <div class="total-row">
        <span class="label">Total payé</span>
        <span class="value">${amount}</span>
      </div>
    </div>
    ${showBarcode ? `
    <div class="barcode-section">
      <div class="barcode-label">${opts.orderNumber}</div>
      <p class="barcode-sub">Référence commande</p>
    </div>` : ''}
    <div class="footer">
      <p>${footerText}</p>
      <p style="margin-top:4px;">Ce reçu a été généré automatiquement.</p>
    </div>
  </div>
</body>
</html>`
}
