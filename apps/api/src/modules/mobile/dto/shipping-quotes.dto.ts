import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Min,
  ValidateNested,
} from 'class-validator';

export class StoreQuoteRequestDto {
  @IsUUID()
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
