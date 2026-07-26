import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator';

export class StoreQuoteRequestDto {
  // Pas @IsUUID() : la boutique système (00000000-…-000000000001) porte un
  // chiffre de version 0 que le validateur UUID strict rejette.
  @IsString()
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, {
    message: 'storeId doit être un identifiant valide',
  })
  storeId: string;

  @IsNumber()
  @Min(0)
  subtotal: number;
}

export class ShippingQuotesDto {
  /** Code pays ISO-2 de l'adresse de livraison (ex. NE, CI, TG) */
  @IsString()
  @Length(2, 2)
  country: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => StoreQuoteRequestDto)
  stores: StoreQuoteRequestDto[];

  @IsOptional()
  @IsString()
  currency?: string;
}
