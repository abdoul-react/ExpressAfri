import { Module, Global } from '@nestjs/common';
import { CryptoService } from './crypto.service';

/**
 * Global : le chiffrement des secrets est une préoccupation transverse, tout
 * module qui manipule une donnée sensible doit pouvoir l'injecter sans câblage.
 */
@Global()
@Module({
  providers: [CryptoService],
  exports: [CryptoService],
})
export class CryptoModule {}
