import { IsString, IsOptional, IsIn } from 'class-validator'

export class InitPaymentDto {
  @IsString()
  @IsOptional()
  @IsIn(['orange_money', 'wave', 'mobile_money', 'card', 'cod', 'wallet'])
  method?: string

  @IsString()
  @IsOptional()
  returnUrl?: string
}
