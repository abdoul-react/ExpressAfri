import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class CreateOrderItemDto {
  @IsUUID()
  productId!: string;

  @IsOptional()
  @IsUUID()
  variantId?: string;

  @IsInt()
  @Min(1)
  quantity!: number;
}

/** Moyen de paiement choisi pour UNE boutique du panier. */
export class StorePaymentChoiceDto {
  @IsUUID()
  storeId!: string;

  /**
   * Provider tel qu'activé par la boutique (`store_payment_methods.provider`).
   * Pas de liste figée ici : c'est le boutiquier qui décide, la validation est
   * donc sémantique et faite côté service.
   */
  @IsString()
  @MaxLength(64)
  paymentMethod!: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  phoneNumber?: string;
}

export class CreateOrderDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];

  @IsUUID()
  shippingAddressId!: string;

  /**
   * Moyen appliqué à toutes les boutiques, conservé pour les clients qui
   * ignorent encore `payments`. `payments` est prioritaire quand il est fourni.
   */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  paymentMethod?: string;

  /**
   * Un choix par boutique : le panier produit une commande par boutique, et
   * chaque boutique n'accepte que les moyens qu'elle a activés.
   */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StorePaymentChoiceDto)
  payments?: StorePaymentChoiceDto[];

  @IsOptional()
  @IsString()
  @MaxLength(64)
  couponCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  idempotencyKey?: string;
}
