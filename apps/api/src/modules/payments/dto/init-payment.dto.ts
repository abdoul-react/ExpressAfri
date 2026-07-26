import { IsString, IsOptional, MaxLength } from 'class-validator';

export class InitPaymentDto {
  // Pas de liste figée : le catalogue payment_methods est la source de vérité
  // (une méthode inconnue échoue proprement au routage vers sa passerelle).
  @IsString()
  @IsOptional()
  @MaxLength(50)
  method?: string;

  @IsString()
  @IsOptional()
  returnUrl?: string;
}
