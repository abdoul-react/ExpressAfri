import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  IsIn,
  Min,
  MaxLength,
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

export class CreateOrderDto {
  @IsArray()
  @ArrayMinSize(1)
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];

  @IsUUID()
  shippingAddressId!: string;

  @IsString()
  @IsIn(['orange_money', 'wave', 'mobile_money', 'card', 'cod', 'wallet'])
  paymentMethod!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  couponCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @IsString()
  @IsUUID()
  idempotencyKey!: string;
}
