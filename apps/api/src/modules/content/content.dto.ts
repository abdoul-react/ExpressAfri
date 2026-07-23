import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsInt, IsIn, IsISO8601, IsArray, ArrayNotEmpty, IsUUID, IsObject } from 'class-validator'
import { Type } from 'class-transformer'

const SCREENS = ['home', 'store', 'feed', 'account'] as const
const SECTION_TYPES = ['products', 'stores', 'banners', 'categories', 'inspiration', 'custom'] as const
const DISPLAY_STYLES = ['horizontal-scroll', 'grid', 'list', 'card'] as const

// ── Banners ──
// Les champs optionnels acceptent null : l'admin envoie explicitement null pour vider un champ.
// @IsOptional() laisse passer null et undefined ; la valeur null atteint Drizzle et vide la colonne.

export class CreateBannerDto {
  @IsString() @IsNotEmpty()
  title!: string

  @IsOptional() @IsString()
  subtitle?: string | null

  @IsOptional() @IsString()
  description?: string | null

  @IsString() @IsNotEmpty()
  imageUrl!: string

  @IsOptional() @IsString()
  linkUrl?: string | null

  @IsOptional() @IsString()
  ctaText?: string | null

  @IsOptional() @IsString()
  discountLabel?: string | null

  @IsOptional() @IsString()
  backgroundColor?: string | null

  @IsOptional() @IsIn(SCREENS as unknown as string[])
  screen?: typeof SCREENS[number]

  @IsOptional() @IsInt() @Type(() => Number)
  position?: number

  @IsOptional() @IsBoolean()
  isActive?: boolean

  @IsOptional() @IsISO8601()
  startDate?: string | null

  @IsOptional() @IsISO8601()
  endDate?: string | null
}

export class UpdateBannerDto extends CreateBannerDto {
  // À l'update tout devient optionnel (title/imageUrl restent NOT NULL en base :
  // s'ils sont envoyés, ils doivent être des chaînes non vides)
  @IsOptional() @IsString() @IsNotEmpty()
  declare title: string

  @IsOptional() @IsString() @IsNotEmpty()
  declare imageUrl: string
}

// ── Feed sections ──

export class CreateFeedSectionDto {
  @IsString() @IsNotEmpty()
  title!: string

  @IsIn(SECTION_TYPES as unknown as string[])
  type!: typeof SECTION_TYPES[number]

  @IsOptional() @IsIn(DISPLAY_STYLES as unknown as string[])
  displayStyle?: typeof DISPLAY_STYLES[number]

  @IsOptional() @IsInt() @Type(() => Number)
  position?: number

  @IsOptional() @IsBoolean()
  isActive?: boolean

  // jsonb libre (ex. { endDate } pour le compteur Flash Deal) ; null pour l'effacer
  @IsOptional() @IsObject()
  data?: Record<string, unknown> | null
}

export class UpdateFeedSectionDto extends CreateFeedSectionDto {
  @IsOptional() @IsString() @IsNotEmpty()
  declare title: string

  @IsOptional() @IsIn(SECTION_TYPES as unknown as string[])
  declare type: typeof SECTION_TYPES[number]
}

export class ReorderDto {
  @IsArray() @ArrayNotEmpty() @IsUUID('4', { each: true })
  ids!: string[]
}
