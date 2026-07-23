import { IconName } from '@/icons';
import { PaymentMethodId } from '@/types';

export const PAYMENT_METHODS: {
  id: PaymentMethodId;
  icon: IconName;
  labelKey: string;
  hintKey: string;
  operators?: string[];
}[] = [
  {
    id: 'mobileMoney',
    icon: 'phone',
    labelKey: 'payment.mobileMoney',
    hintKey: 'payment.mobileMoneyHint',
  },
  { id: 'card', icon: 'creditCard', labelKey: 'payment.card', hintKey: 'payment.cardHint' },
  { id: 'cod', icon: 'truck', labelKey: 'payment.cod', hintKey: 'payment.codHint' },
  { id: 'wallet', icon: 'wallet', labelKey: 'payment.wallet', hintKey: 'payment.walletHint' },
];
