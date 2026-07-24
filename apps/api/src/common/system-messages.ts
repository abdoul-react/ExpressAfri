/**
 * Messages système envoyés dans la boîte de réception du client (chat).
 * Traduits en fr/en/ar selon la langue préférée du client.
 * Langue par défaut : 'fr'.
 */

type Lang = 'fr' | 'en' | 'ar';

function lang(l: string | null | undefined): Lang {
  if (l === 'en' || l === 'ar') return l;
  return 'fr';
}

export function orderStatusMessage(
  status: string,
  orderNumber: string,
  language?: string | null,
): string | null {
  const l = lang(language);
  const maps: Record<Lang, Record<string, string>> = {
    fr: {
      confirmed: `Bonne nouvelle ! Votre commande ${orderNumber} a été confirmée. Nous préparons votre colis. 📦`,
      shipped: `Votre commande ${orderNumber} a été expédiée ! 🚚 Suivez sa progression dans « Mes commandes ».`,
      delivered: `Votre commande ${orderNumber} a été livrée. ✅ Merci pour votre confiance !`,
      cancelled: `Votre commande ${orderNumber} a été annulée. Contactez-nous pour toute question.`,
      refunded: `Un remboursement a été initié pour votre commande ${orderNumber}.`,
    },
    en: {
      confirmed: `Great news! Your order ${orderNumber} has been confirmed. We're preparing your package. 📦`,
      shipped: `Your order ${orderNumber} has been shipped! 🚚 Track it in "My Orders".`,
      delivered: `Your order ${orderNumber} has been delivered. ✅ Thank you for your trust!`,
      cancelled: `Your order ${orderNumber} has been cancelled. Contact us if you have any questions.`,
      refunded: `A refund has been initiated for your order ${orderNumber}.`,
    },
    ar: {
      confirmed: `خبر سار! تم تأكيد طلبك ${orderNumber}. نحن نجهّز طردك. 📦`,
      shipped: `تم شحن طلبك ${orderNumber}! 🚚 تابع تقدمه في "طلباتي".`,
      delivered: `تم تسليم طلبك ${orderNumber}. ✅ شكراً لثقتك بنا!`,
      cancelled: `تم إلغاء طلبك ${orderNumber}. تواصل معنا لأي استفسار.`,
      refunded: `تم بدء استرداد المبلغ لطلبك ${orderNumber}.`,
    },
  };
  return maps[l][status] ?? null;
}

export function receiptMessage(
  r: { orderNumber: string; amount: string; currency: string },
  language?: string | null,
): string {
  const l = lang(language);
  const formatted = new Intl.NumberFormat('fr-FR').format(Number(r.amount));
  const msgs: Record<Lang, string> = {
    fr: `🧾 Reçu ${r.orderNumber}\nMontant : ${formatted} ${r.currency}\nMerci pour votre achat !`,
    en: `🧾 Receipt ${r.orderNumber}\nAmount: ${formatted} ${r.currency}\nThank you for your purchase!`,
    ar: `🧾 إيصال ${r.orderNumber}\nالمبلغ: ${formatted} ${r.currency}\nشكراً لشرائك!`,
  };
  return msgs[l];
}

export function pushOrderTitle(
  orderNumber: string,
  language?: string | null,
): string {
  const l = lang(language);
  const titles: Record<Lang, string> = {
    fr: `Commande ${orderNumber}`,
    en: `Order ${orderNumber}`,
    ar: `طلب ${orderNumber}`,
  };
  return titles[l];
}

export function pushNewMessageTitle(language?: string | null): string {
  const l = lang(language);
  const titles: Record<Lang, string> = {
    fr: 'Nouveau message',
    en: 'New message',
    ar: 'رسالة جديدة',
  };
  return titles[l];
}
