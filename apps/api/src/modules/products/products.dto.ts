import {
  IsString, IsNotEmpty, IsOptional, IsBoolean, IsInt, IsIn,
  IsArray, IsUUID, ValidateNested, Min, ArrayMaxSize,
} from 'class-validator'
import { Type, Transform } from 'class-transformer'

const PRODUCT_STATUS = ['active', 'draft', 'archived', 'pending', 'rejected'] as const

/** Normalise une chaîne vide en undefined : l'admin envoie "" pour « aucune
 *  catégorie », ce que @IsUUID rejetterait. */
const emptyToUndefined = ({ value }: { value: unknown }) =>
  value === '' || value === null ? undefined : value

/**
 * DTOs du module produits. Ils remplacent les anciens `@Body() body: any` :
 * la validation (class-validator) rejette désormais tout payload malformé AVANT
 * d'atteindre le service. Le ValidationPipe global est en `whitelist +
 * forbidNonWhitelisted` → CHAQUE champ réellement envoyé par l'admin doit être
 * déclaré ici, sinon la requête est refusée (400).
 *
 * Note : l'admin envoie `price`/`comparePrice` en chaîne (Drizzle `decimal`),
 * `stock` en nombre.
 */

// ── Attribut de variante : { name: "Taille", value: "L" } ──
export class VariantAttributeDto {
  @IsString() @IsNotEmpty()
  name!: string

  @IsString() @IsNotEmpty()
  value!: string
}

// ── Variante envoyée par l'admin ──
export class ProductVariantDto {
  @IsOptional() @IsString()
  sku?: string

  @IsOptional() @IsString()
  label?: string

  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => VariantAttributeDto)
  attributes?: VariantAttributeDto[]

  // decimal → transmis en chaîne (ou null pour hériter du prix produit)
  @IsOptional() @IsString()
  price?: string | null

  @IsOptional() @IsInt() @Min(0)
  stock?: number

  @IsOptional() @IsString()
  imageUrl?: string | null

  @IsOptional() @IsInt()
  sortOrder?: number

  @IsOptional() @IsBoolean()
  isActive?: boolean
}

// ── Image envoyée par l'admin : { url, alt, sortOrder } ──
export class ProductImageDto {
  @IsString() @IsNotEmpty()
  url!: string

  @IsOptional() @IsString()
  alt?: string

  @IsOptional() @IsInt()
  sortOrder?: number
}

export class CreateProductDto {
  @IsString() @IsNotEmpty()
  name!: string

  @IsOptional() @IsString()
  description?: string

  // decimal → chaîne (ex. "15000.00")
  @IsString() @IsNotEmpty()
  price!: string

  @IsOptional() @IsString()
  comparePrice?: string | null

  @IsOptional() @Transform(emptyToUndefined) @IsUUID()
  categoryId?: string | null

  @IsOptional() @IsIn(PRODUCT_STATUS as unknown as string[])
  status?: typeof PRODUCT_STATUS[number]

  // SKU + stock d'un produit SIMPLE : persistés côté service sur la variante par
  // défaut (la table products n'a pas ces colonnes).
  @IsOptional() @IsString()
  sku?: string

  @IsOptional() @IsInt() @Min(0)
  stock?: number

  @IsOptional() @IsArray() @IsString({ each: true })
  tags?: string[]

  @IsOptional() @IsArray() @ArrayMaxSize(8) @ValidateNested({ each: true }) @Type(() => ProductImageDto)
  images?: ProductImageDto[]

  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ProductVariantDto)
  variants?: ProductVariantDto[]

  // Injecté par le contrôleur depuis le jeton (gérant de boutique) — jamais de
  // confiance dans le corps client, mais doit être whitelisté pour passer.
  @IsOptional() @IsUUID()
  storeId?: string
}

// À l'update tout est optionnel : le nom, s'il est envoyé, reste non vide.
export class UpdateProductDto extends CreateProductDto {
  @IsOptional() @IsString() @IsNotEmpty()
  declare name: string

  @IsOptional() @IsString() @IsNotEmpty()
  declare price: string
}

export class ModerateProductDto {
  @IsIn(['approved', 'rejected'])
  status!: 'approved' | 'rejected'

  @IsOptional() @IsString()
  reason?: string
}

// Filtres de liste (query string) — remplacent le `@Query() query: any`.
export class ProductQueryDto {
  @IsOptional() @IsInt() @Min(1) @Type(() => Number)
  page?: number

  @IsOptional() @IsInt() @Min(1) @Type(() => Number)
  limit?: number

  @IsOptional() @IsString()
  search?: string

  @IsOptional() @Transform(emptyToUndefined) @IsUUID()
  storeId?: string

  @IsOptional() @Transform(emptyToUndefined) @IsUUID()
  categoryId?: string

  @IsOptional() @IsString()
  status?: string

  @IsOptional() @IsString()
  moderationStatus?: string

  @IsOptional() @IsString()
  sortBy?: string

  @IsOptional() @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc'
}
