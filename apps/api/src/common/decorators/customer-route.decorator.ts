import { SetMetadata } from '@nestjs/common'

// Marque une route/un contrôleur comme réservé aux clients mobiles :
// le JwtAuthGuard global (admin) laisse passer, et c'est le
// CustomerAuthGuard local qui prend le relais.
export const IS_CUSTOMER_KEY = 'isCustomerRoute'
export const CustomerRoute = () => SetMetadata(IS_CUSTOMER_KEY, true)
