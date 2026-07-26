import {
  Injectable,
  Inject,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  eq,
  and,
  sql,
  desc,
  inArray,
  like,
  gte,
  isNull,
  getTableColumns,
} from 'drizzle-orm';
import * as bcrypt from 'bcryptjs';
import { DRIZZLE, type DrizzleDB } from '../../database/database.module';
import {
  customers,
  addresses,
  storeFollows,
} from '../../database/schema/customers';
import { CreateOrderDto } from './dto/create-order.dto';
import {
  products,
  categories,
  productImages,
  productVariants,
} from '../../database/schema/products';
import { stores, storeMedia } from '../../database/schema/stores';
import {
  storeSections,
  storeSectionItems,
} from '../../database/schema/store-sections';
import {
  storeGroups,
  storeGroupItems,
} from '../../database/schema/store-groups';
import { coupons, couponUsage } from '../../database/schema/coupons';
import { otpCodes } from '../../database/schema/otp';
import { contentBlocks } from '../../database/schema/content';
import {
  banners,
  logos,
  socialLinks,
  seoMetadata,
  paymentMethods,
  feedSections,
  staticPages,
  feedPosts,
  feedPostLikes,
} from '../../database/schema/content-cms';
import { appSettings, featureFlags } from '../../database/schema/settings';
import { conversations, messages } from '../../database/schema/chat';
import { productReviews } from '../../database/schema/reviews';
import {
  orders,
  orderItems,
  orderStatusLog,
} from '../../database/schema/orders';
import { payments } from '../../database/schema/payments';
import { shippingZones, shippingMethods } from '../../database/schema/shipping';
import {
  quoteStoreShipping,
  type StoreShippingQuote,
} from '../shipping/store-shipping.util';
import { loyaltyPoints } from '../../database/schema/loyalty';

import { ImageVisionService } from '../../common/vision/image-vision.service';
import { StorePaymentMethodsService } from '../stores/store-payment-methods.service';

// Boutique système (seedée) : les customers.storeId NOT NULL doivent référencer une boutique existante
const SYSTEM_STORE_ID = '00000000-0000-0000-0000-000000000001';

/** Seules les boutiques approuvées sont publiables : rien d'une boutique en attente, rejetée ou suspendue ne doit fuiter. */
const APPROVED_STORE = 'approved';

/** Condition réutilisable : la ligne appartient à une boutique approuvée. */
function belongsToApprovedStore(storeIdColumn: any) {
  return sql`exists (select 1 from ${stores} where ${stores.id} = ${storeIdColumn} and ${stores.status} = ${APPROVED_STORE})`;
}

/**
 * Colonnes produit + nom de la boutique d'origine, pour l'insigne de provenance
 * affiché sur les cartes, la fiche produit et le panier.
 *
 * Sous-requête corrélée plutôt qu'une jointure : la jointure obligerait chaque
 * appelant à projeter explicitement ses colonnes, et un oubli passerait
 * inaperçu. Écrite en SQL brut car Drizzle rendrait `products.store_id` non
 * qualifié, qui résoudrait alors vers la table interne de la sous-requête.
 *
 * `storeName` est nul pour la boutique système : ces produits n'ont pas de
 * vendeur, et le client ne doit alors voir aucun insigne.
 */
const PRODUCT_COLUMNS_WITH_STORE = {
  ...getTableColumns(products),
  storeName: sql<
    string | null
  >`(select s.name from stores s where s.id = products.store_id and s.id <> ${SYSTEM_STORE_ID})`,
};

/**
 * Pastilles couleur de la fiche produit : traduit le nom saisi par l'admin
 * (français ou anglais, insensible à la casse/accents) en code hex.
 * Un code hex saisi directement (ex: "#1A2B3C") est renvoyé tel quel.
 * Couleur inconnue → pas de pastille (l'option s'affiche en texte seul).
 */
const COLOR_HEX: Record<string, string> = {
  noir: '#1A1A1A',
  black: '#1A1A1A',
  blanc: '#FFFFFF',
  white: '#FFFFFF',
  gris: '#8E8E93',
  grey: '#8E8E93',
  gray: '#8E8E93',
  rouge: '#E53935',
  red: '#E53935',
  bordeaux: '#7B1F2B',
  burgundy: '#7B1F2B',
  rose: '#F06292',
  pink: '#F06292',
  orange: '#FB8C00',
  jaune: '#FDD835',
  yellow: '#FDD835',
  or: '#D4AF37',
  dore: '#D4AF37',
  gold: '#D4AF37',
  vert: '#43A047',
  green: '#43A047',
  kaki: '#7C7B46',
  khaki: '#7C7B46',
  turquoise: '#26C6DA',
  cyan: '#26C6DA',
  bleu: '#1E88E5',
  blue: '#1E88E5',
  marine: '#173A5E',
  navy: '#173A5E',
  violet: '#8E24AA',
  purple: '#8E24AA',
  mauve: '#B39DDB',
  marron: '#6D4C41',
  brun: '#6D4C41',
  brown: '#6D4C41',
  beige: '#D7C4A3',
  creme: '#F5F0E1',
  cream: '#F5F0E1',
  argent: '#C0C0C0',
  silver: '#C0C0C0',
  multicolore: '#FFFFFF',
  multicolor: '#FFFFFF',
};

function colorToHex(value: string): string | undefined {
  const raw = value.trim();
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(raw)) return raw;
  const normalized = raw.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  return COLOR_HEX[normalized];
}

@Injectable()
export class MobileService {
  constructor(
    @Inject(DRIZZLE) private db: DrizzleDB,
    private jwt: JwtService,
    private vision: ImageVisionService,
    private storePayments: StorePaymentMethodsService,
  ) {}

  private signToken(customer: { id: string; email: string | null }) {
    const payload = {
      sub: customer.id,
      email: customer.email,
      type: 'customer',
    };
    return {
      accessToken: this.jwt.sign(payload, { expiresIn: '30d' }),
      refreshToken: this.jwt.sign(payload, { expiresIn: '90d' }),
    };
  }

  private toProfile(c: any) {
    return {
      id: c.id,
      name: `${c.firstName} ${c.lastName}`.trim(),
      email: c.email,
      phone: c.phone,
      avatar: c.avatar ?? '',
      gender: c.gender ?? null,
      birthYear: c.birthYear ?? null,
    };
  }

  // ====== AUTH ======

  async register(data: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    password: string;
  }) {
    const existing = await this.db
      .select()
      .from(customers)
      .where(eq(customers.email, data.email))
      .limit(1);
    if (existing.length)
      throw new ConflictException('Cet email est déjà utilisé');

    const hash = await bcrypt.hash(data.password, 10);
    const [customer] = await this.db
      .insert(customers)
      .values({
        storeId: SYSTEM_STORE_ID,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        passwordHash: hash,
      })
      .returning();

    const tokens = this.signToken(customer);
    return { user: this.toProfile(customer), ...tokens };
  }

  async login(email: string, password: string) {
    const [customer] = await this.db
      .select()
      .from(customers)
      .where(eq(customers.email, email))
      .limit(1);
    if (!customer)
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    if (!customer.passwordHash)
      throw new UnauthorizedException('Compte sans mot de passe (guest/OTP)');

    const valid = await bcrypt.compare(password, customer.passwordHash);
    if (!valid)
      throw new UnauthorizedException('Email ou mot de passe incorrect');

    const tokens = this.signToken(customer);
    return { user: this.toProfile(customer), ...tokens };
  }

  async requestOtp(
    contact: string,
    mode: 'phone' | 'email' = 'email',
    ipAddress = '',
  ) {
    const recentCount = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(otpCodes)
      .where(
        and(
          eq(otpCodes.contact, contact),
          sql`${otpCodes.createdAt} > now() - interval '1 hour'`,
        ),
      );

    if (Number(recentCount[0].count) >= 3) {
      throw new BadRequestException(
        'Trop de tentatives. Réessayez dans 1 heure.',
      );
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.db
      .insert(otpCodes)
      .values({
        contact,
        codeHash,
        expiresAt,
        attempts: 0,
        ipAddress: ipAddress || null,
        ipAttempts: 0,
      })
      .onConflictDoUpdate({
        target: otpCodes.contact,
        set: {
          codeHash,
          expiresAt,
          attempts: 0,
          ipAddress: ipAddress || null,
          ipAttempts: 0,
          usedAt: null,
          createdAt: new Date(),
        },
      });

    // En production : envoyer SMS/email ici sans logger le code
    return { ok: true };
  }

  async verifyOtp(contact: string, code: string, ipAddress = '') {
    const [stored] = await this.db
      .select()
      .from(otpCodes)
      .where(eq(otpCodes.contact, contact))
      .limit(1);

    if (!stored) throw new UnauthorizedException('Code invalide');

    if (stored.usedAt) {
      throw new UnauthorizedException('Code déjà utilisé');
    }

    if (stored.expiresAt < new Date()) {
      await this.db.delete(otpCodes).where(eq(otpCodes.contact, contact));
      throw new UnauthorizedException('Code expiré');
    }

    if ((stored.attempts ?? 0) >= (stored.maxAttempts ?? 5)) {
      throw new ForbiddenException(
        'Trop de tentatives. Demandez un nouveau code.',
      );
    }

    const isValid = await bcrypt.compare(code, stored.codeHash);
    if (!isValid) {
      await this.db
        .update(otpCodes)
        .set({
          attempts: sql`${otpCodes.attempts} + 1`,
          ipAttempts: sql`${otpCodes.ipAttempts} + 1`,
        })
        .where(eq(otpCodes.contact, contact));
      throw new UnauthorizedException('Code incorrect');
    }

    await this.db
      .update(otpCodes)
      .set({ usedAt: new Date() })
      .where(eq(otpCodes.contact, contact));

    let customer = await this.db
      .select()
      .from(customers)
      .where(
        contact.includes('@')
          ? eq(customers.email, contact)
          : eq(customers.phone, contact),
      )
      .limit(1)
      .then((r) => r[0]);

    if (!customer) {
      const isEmail = contact.includes('@');
      const [c] = await this.db
        .insert(customers)
        .values({
          storeId: SYSTEM_STORE_ID,
          firstName: isEmail ? contact.split('@')[0] : contact,
          lastName: '',
          email: isEmail ? contact : '',
          phone: isEmail ? '' : contact,
          isGuest: true,
        })
        .returning();
      customer = c;
    }

    const tokens = this.signToken(customer);
    return { user: this.toProfile(customer), ...tokens };
  }

  async refreshToken(token: string) {
    try {
      const payload = this.jwt.verify(token);
      if (payload.type !== 'customer') throw new UnauthorizedException();

      const [customer] = await this.db
        .select()
        .from(customers)
        .where(eq(customers.id, payload.sub))
        .limit(1);
      if (!customer) throw new UnauthorizedException();

      const tokens = this.signToken(customer);
      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      };
    } catch {
      throw new UnauthorizedException('Token invalide ou expiré');
    }
  }

  async socialLogin(
    provider: string,
    data: { email?: string; name?: string; id?: string; idToken?: string; accessToken?: string },
  ) {
    if (provider === 'google') {
      const token = data.idToken ?? data.accessToken;
      if (!token) throw new BadRequestException('Token Google manquant');
      try {
        const url = data.idToken
          ? `https://oauth2.googleapis.com/tokeninfo?id_token=${token}`
          : `https://www.googleapis.com/oauth2/v1/userinfo?access_token=${token}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Token Google invalide');
        const profile = await res.json();
        if (profile.error) throw new Error('Token Google rejeté : ' + profile.error);
        data.email = profile.email ?? data.email;
        data.name = profile.name ?? data.name;
        data.id = profile.sub ?? profile.id ?? data.id;
      } catch (e: any) {
        throw new BadRequestException('Authentification Google échouée : ' + e.message);
      }
    }

    if (provider === 'facebook') {
      const token = data.accessToken;
      if (!token) throw new BadRequestException('Token Facebook manquant');
      try {
        const appId = process.env.FACEBOOK_APP_ID;
        const appSecret = process.env.FACEBOOK_APP_SECRET;
        const appToken = `${appId}|${appSecret}`;
        const [inspectRes, profileRes] = await Promise.all([
          fetch(`https://graph.facebook.com/debug_token?input_token=${token}&access_token=${appToken}`),
          fetch(`https://graph.facebook.com/me?fields=id,name,email&access_token=${token}`),
        ]);
        if (!inspectRes.ok || !profileRes.ok) throw new Error('Token Facebook invalide');
        const { data: inspect } = await inspectRes.json();
        if (!inspect?.is_valid) throw new Error('Token Facebook rejeté');
        const profile = await profileRes.json();
        data.email = profile.email ?? data.email;
        data.name = profile.name ?? data.name;
        data.id = profile.id ?? data.id;
      } catch (e: any) {
        throw new BadRequestException('Authentification Facebook échouée : ' + e.message);
      }
    }

    let customer = data.email
      ? await this.db
          .select()
          .from(customers)
          .where(eq(customers.email, data.email))
          .limit(1)
          .then((r) => r[0])
      : null;

    if (!customer) {
      const nameParts = (data.name ?? 'User').split(' ');
      const [c] = await this.db
        .insert(customers)
        .values({
          storeId: SYSTEM_STORE_ID,
          firstName: nameParts[0],
          lastName: nameParts.slice(1).join(' ') || '',
          email: data.email ?? '',
        })
        .returning();
      customer = c;
    }

    const tokens = this.signToken(customer);
    return { user: this.toProfile(customer), ...tokens };
  }

  async passwordReset(email: string) {
    // In production: send reset link/email
    console.log(`[PASSWORD RESET] Email: ${email}`);
    return { ok: true };
  }

  async createOrder(customerId: string, dto: CreateOrderDto) {
    const [customer] = await this.db
      .select()
      .from(customers)
      .where(eq(customers.id, customerId))
      .limit(1);
    if (!customer) throw new NotFoundException('Client introuvable');

    const orderItemsData: any[] = [];

    for (const item of dto.items) {
      const [product] = await this.db
        .select()
        .from(products)
        .where(
          and(eq(products.id, item.productId), eq(products.status, 'active')),
        )
        .limit(1);
      if (!product)
        throw new BadRequestException(
          `Produit ${item.productId} introuvable ou inactif`,
        );

      let unitPrice = Number(product.price);
      let sku = product.slug;
      let label = product.name;
      let imageUrl: string | null = null;

      if (item.variantId) {
        const [variant] = await this.db
          .select()
          .from(productVariants)
          .where(
            and(
              eq(productVariants.id, item.variantId),
              eq(productVariants.productId, item.productId),
            ),
          )
          .limit(1);
        if (!variant)
          throw new BadRequestException(
            `Variante ${item.variantId} introuvable`,
          );
        if (variant.stock < item.quantity) {
          throw new BadRequestException(
            `Stock insuffisant pour ${variant.label} (dispo: ${variant.stock})`,
          );
        }
        unitPrice = variant.price ? Number(variant.price) : unitPrice;
        sku = variant.sku;
        label = `${product.name} - ${variant.label}`;
        imageUrl = variant.imageUrl;
      }

      if (!imageUrl) {
        const [img] = await this.db
          .select()
          .from(productImages)
          .where(eq(productImages.productId, item.productId))
          .orderBy(productImages.sortOrder)
          .limit(1);
        imageUrl = img?.url ?? null;
      }

      const totalPrice = unitPrice * item.quantity;

      orderItemsData.push({
        productId: item.productId,
        variantId: item.variantId ?? null,
        storeId: product.storeId,
        sku,
        label,
        imageUrl,
        quantity: item.quantity,
        unitPrice: unitPrice.toFixed(2),
        totalPrice: totalPrice.toFixed(2),
      });
    }

    const [address] = await this.db
      .select()
      .from(addresses)
      .where(
        and(
          eq(addresses.id, dto.shippingAddressId),
          eq(addresses.customerId, customerId),
        ),
      )
      .limit(1);
    if (!address)
      throw new BadRequestException('Adresse de livraison introuvable');

    /*
      Le panier peut mêler plusieurs boutiques, et chacune facture, expédie et
      encaisse pour son compte : on émet UNE commande par boutique.

      Une commande unique estampillait `orders`, `payments` et
      `order_status_log` de la première boutique rencontrée — la seconde ne
      voyait donc jamais la commande de ses propres produits, et son argent
      était comptabilisé chez la première.
    */
    const groups = new Map<string, typeof orderItemsData>();
    for (const line of orderItemsData) {
      const key = line.storeId ?? SYSTEM_STORE_ID;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(line);
    }
    const storeIds = [...groups.keys()];

    /*
      Idempotence : une clé dérivée par boutique, car `orders.idempotency_key`
      est unique. La reprise doit rendre les N commandes déjà créées — sinon une
      double soumission en recréerait une partie.

      Les clés sont énumérées explicitement plutôt que cherchées par préfixe :
      un `LIKE` sur une valeur fournie par le client laisserait passer un `%`,
      qui remonterait les commandes d'autres clients.
    */
    const derivedKeys = dto.idempotencyKey
      ? storeIds.map((id) => `${dto.idempotencyKey}:${id}`)
      : [];

    const storeNames = new Map(
      (
        await this.db
          .select({ id: stores.id, name: stores.name })
          .from(stores)
          .where(inArray(stores.id, storeIds))
      ).map((s) => [s.id, s.name]),
    );

    if (derivedKeys.length) {
      const existing = await this.db
        .select()
        .from(orders)
        .where(inArray(orders.idempotencyKey, derivedKeys));
      if (existing.length) {
        return {
          orders: existing.map((o) => ({
            id: o.id,
            orderNumber: o.orderNumber,
            storeId: o.storeId,
            storeName: storeNames.get(o.storeId) ?? null,
            status: o.status,
            total: o.total,
            currency: o.currency,
          })),
          total: existing
            .reduce((sum, o) => sum + Number(o.total), 0)
            .toFixed(2),
          currency: 'XOF',
          message: 'Commande déjà créée',
        };
      }
    }

    // Un coupon appartient à une boutique (`coupons.store_id` est NOT NULL) :
    // il ne peut donc remiser que la commande de cette boutique, pas le panier.
    let coupon: typeof coupons.$inferSelect | null = null;
    if (dto.couponCode) {
      const [found] = await this.db
        .select()
        .from(coupons)
        .where(
          and(eq(coupons.code, dto.couponCode), eq(coupons.isActive, true)),
        )
        .limit(1);
      if (found && new Date(found.endDate) > new Date()) coupon = found;
    }

    // Résolution ET validation des moyens de paiement avant d'écrire quoi que
    // ce soit : un moyen refusé ne doit laisser aucune commande derrière lui.
    const chosenMethods = new Map<string, string>();
    const payerPhones = new Map<string, string>();
    for (const storeId of storeIds) {
      const choice = dto.payments?.find((p) => p.storeId === storeId);
      const method = choice?.paymentMethod ?? dto.paymentMethod;
      if (!method) {
        throw new BadRequestException(
          `Moyen de paiement manquant pour ${storeNames.get(storeId) ?? 'la boutique'}`,
        );
      }
      // Numéro Mobile Money du payeur : conservé pour que le commerçant sache
      // quel numéro a réglé sa commande (rapprochement des encaissements).
      if (choice?.phoneNumber?.trim()) {
        payerPhones.set(storeId, choice.phoneNumber.trim());
      }

      // Exception délibérée : le paiement à la livraison ne demande aucune
      // configuration technique au commerçant, il reste donc toujours ouvert —
      // c'est le repli proposé au client quand la boutique n'a rien activé.
      if (!this.isCashOnDelivery(method)) {
        const available = await this.storePayments.listPublic(storeId);
        if (!available.some((m) => m.provider === method)) {
          throw new BadRequestException(
            `${storeNames.get(storeId) ?? 'Cette boutique'} n'accepte pas le moyen de paiement « ${method} »`,
          );
        }
      }
      chosenMethods.set(storeId, method);
    }

    // Frais de port par boutique, calculés AVANT la transaction (les SELECT
    // zones/méthodes n'ont rien à faire sous le verrou du stock). Même
    // fonction que l'endpoint de devis : total affiché = total facturé.
    const shippingQuotes = new Map<string, StoreShippingQuote>();
    for (const storeId of storeIds) {
      const lines = groups.get(storeId)!;
      const groupSubtotal = lines.reduce(
        (sum, l) => sum + Number(l.totalPrice),
        0,
      );
      shippingQuotes.set(
        storeId,
        await quoteStoreShipping(this.db, {
          storeId,
          country: address.countryCode ?? undefined,
          subtotal: groupSubtotal,
        }),
      );
    }

    const created = await this.db.transaction(async (tx) => {
      const result: {
        id: string;
        orderNumber: string;
        storeId: string;
        storeName: string | null;
        status: string;
        total: string;
        currency: string;
        paymentMethod: string;
      }[] = [];

      for (const storeId of storeIds) {
        const lines = groups.get(storeId)!;
        const method = chosenMethods.get(storeId)!;
        const isCod = this.isCashOnDelivery(method);

        const groupSubtotal = lines.reduce(
          (sum, l) => sum + Number(l.totalPrice),
          0,
        );
        // Chaque boutique expédie séparément : frais issus du devis calculé
        // hors transaction (zones/méthodes de la boutique, repli global).
        const shippingCost = shippingQuotes.get(storeId)?.shippingCost ?? 0;
        const taxAmount = 0;

        let discountAmount = 0;
        let couponId: string | null = null;
        if (coupon && coupon.storeId === storeId) {
          couponId = coupon.id;
          if (coupon.type === 'percentage') {
            discountAmount = (groupSubtotal * Number(coupon.value)) / 100;
            if (coupon.maxDiscount) {
              discountAmount = Math.min(
                discountAmount,
                Number(coupon.maxDiscount),
              );
            }
          } else if (coupon.type === 'fixed') {
            discountAmount = Number(coupon.value);
          } else if (coupon.type === 'free_shipping') {
            discountAmount = shippingCost;
          }
        }

        const groupTotal =
          groupSubtotal + shippingCost + taxAmount - discountAmount;
        const orderNumber = `EA-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

        const [inserted] = await tx
          .insert(orders)
          .values({
            storeId,
            customerId,
            orderNumber,
            status: isCod ? 'confirmed' : 'pending',
            subtotal: groupSubtotal.toFixed(2),
            shippingCost: shippingCost.toFixed(2),
            taxAmount: taxAmount.toFixed(2),
            discountAmount: discountAmount.toFixed(2),
            total: groupTotal.toFixed(2),
            currency: 'XOF',
            couponId,
            couponCode: couponId ? (dto.couponCode ?? null) : null,
            shippingAddress: JSON.stringify(address),
            notes: dto.notes ?? null,
            idempotencyKey: dto.idempotencyKey
              ? `${dto.idempotencyKey}:${storeId}`
              : null,
          })
          .returning();

        await tx
          .insert(orderItems)
          .values(lines.map((l) => ({ ...l, orderId: inserted.id })));

        for (const line of lines) {
          if (!line.variantId) continue;
          const decremented = await tx
            .update(productVariants)
            .set({
              stock: sql`stock - ${line.quantity}`,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(productVariants.id, line.variantId),
                gte(productVariants.stock, line.quantity),
              ),
            )
            .returning({ id: productVariants.id });
          if (decremented.length === 0) {
            throw new BadRequestException(
              `Stock insuffisant pour ${line.label}`,
            );
          }
        }

        await tx.insert(orderStatusLog).values({
          orderId: inserted.id,
          storeId,
          fromStatus: null,
          toStatus: inserted.status,
          reason: 'Commande créée',
        });

        await tx.insert(payments).values({
          orderId: inserted.id,
          storeId,
          method,
          status: 'pending',
          amount: groupTotal.toFixed(2),
          currency: 'XOF',
          idempotencyKey: dto.idempotencyKey
            ? `${dto.idempotencyKey}:${storeId}:payment`
            : null,
          // Numéro Mobile Money du payeur (jamais de données carte ici)
          metadata: payerPhones.has(storeId)
            ? { payerPhoneNumber: payerPhones.get(storeId) }
            : null,
        });

        result.push({
          id: inserted.id,
          orderNumber: inserted.orderNumber,
          storeId,
          storeName: storeNames.get(storeId) ?? null,
          status: inserted.status,
          total: inserted.total,
          currency: inserted.currency,
          paymentMethod: method,
        });
      }

      const grandTotal = result.reduce((sum, o) => sum + Number(o.total), 0);
      await tx
        .update(customers)
        .set({
          totalOrders: sql`total_orders + ${result.length}`,
          totalSpent: sql`total_spent + ${grandTotal}`,
        })
        .where(eq(customers.id, customerId));

      return result;
    });

    const grandTotal = created.reduce((sum, o) => sum + Number(o.total), 0);
    const allCod = created.every((o) => this.isCashOnDelivery(o.paymentMethod));

    return {
      orders: created,
      total: grandTotal.toFixed(2),
      currency: 'XOF',
      message: allCod
        ? 'Commande confirmée. Paiement à la livraison.'
        : 'Commande créée. Veuillez procéder au paiement.',
    };
  }

  /**
   * Le paiement à la livraison est écrit `cod` par le catalogue historique et
   * `cash_on_delivery` par la configuration des boutiques. Les deux désignent
   * le même mode, et il est le seul à ne demander aucune configuration.
   */
  private isCashOnDelivery(method: string) {
    return method === 'cod' || method === 'cash_on_delivery';
  }

  // ====== PROFILE ======

  async getProfile(customerId: string) {
    const [c] = await this.db
      .select()
      .from(customers)
      .where(eq(customers.id, customerId))
      .limit(1);
    if (!c) throw new NotFoundException('Client introuvable');
    return this.toProfile(c);
  }

  async updateProfile(
    customerId: string,
    data: {
      name?: string;
      firstName?: string;
      lastName?: string;
      phone?: string;
      avatar?: string;
      gender?: string;
      birthYear?: number;
      language?: string;
    },
  ) {
    // Le mobile envoie un "name" complet : le répartir sur firstName/lastName
    let firstName = data.firstName;
    let lastName = data.lastName;
    if (data.name && !firstName && !lastName) {
      const parts = data.name.trim().split(/\s+/);
      firstName = parts[0];
      lastName = parts.slice(1).join(' ');
    }

    // Ne mettre à jour que les champs réellement fournis (undefined = intact)
    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (firstName !== undefined) patch.firstName = firstName;
    if (lastName !== undefined) patch.lastName = lastName;
    if (data.phone !== undefined) patch.phone = data.phone;
    if (data.avatar !== undefined) patch.avatar = data.avatar;
    if (data.gender !== undefined) patch.gender = data.gender;
    if (data.birthYear !== undefined)
      patch.birthYear = Number(data.birthYear) || null;
    if (data.language !== undefined) patch.language = data.language;

    const [c] = await this.db
      .update(customers)
      .set(patch)
      .where(eq(customers.id, customerId))
      .returning();

    if (!c) throw new NotFoundException('Client introuvable');
    return this.toProfile(c);
  }

  // ====== PRODUCTS & CATALOG ======

  async getProducts(query: {
    categoryId?: string;
    storeId?: string;
    search?: string;
    limit?: number;
    offset?: number;
    minPrice?: number;
    maxPrice?: number;
    minRating?: number;
    freeShipping?: boolean;
    onSale?: boolean;
    sort?: string;
  }) {
    const conditions = [
      eq(products.status, 'active'),
      belongsToApprovedStore(products.storeId),
    ];
    if (query.categoryId)
      conditions.push(eq(products.categoryId, query.categoryId));
    if (query.storeId) conditions.push(eq(products.storeId, query.storeId));
    if (query.search) conditions.push(like(products.name, `%${query.search}%`));
    if (query.minPrice != null)
      conditions.push(sql`${products.price} >= ${query.minPrice}`);
    if (query.maxPrice != null)
      conditions.push(sql`${products.price} <= ${query.maxPrice}`);
    if (query.onSale)
      conditions.push(sql`${products.comparePrice} IS NOT NULL AND ${products.comparePrice} > ${products.price}`);
    // freeShipping : produits dont le prix dépasse le seuil de livraison gratuite (10 000 XOF)
    if (query.freeShipping)
      conditions.push(sql`${products.price} >= 10000`);
    if (query.minRating != null)
      conditions.push(sql`coalesce((select avg(r.rating) from product_reviews r where r.product_id = ${products.id} and r.is_active = true), 0) >= ${query.minRating}`);

    let orderBy: any = desc(products.createdAt);
    if (query.sort === 'priceLow') orderBy = products.price;
    else if (query.sort === 'priceHigh') orderBy = desc(products.price as any);

    const rows = await this.db
      .select(PRODUCT_COLUMNS_WITH_STORE)
      .from(products)
      .where(and(...conditions))
      .limit(query.limit ?? 50)
      .offset(query.offset ?? 0)
      .orderBy(orderBy);

    const productIds = rows.map((p) => p.id);
    const allImages = productIds.length
      ? await this.db
          .select()
          .from(productImages)
          .where(inArray(productImages.productId, productIds))
          .orderBy(productImages.sortOrder)
      : [];
    const allVariants = productIds.length
      ? await this.db
          .select()
          .from(productVariants)
          .where(inArray(productVariants.productId, productIds))
      : [];

    const imagesByProduct = new Map<string, string[]>();
    for (const img of allImages) {
      const list = imagesByProduct.get(img.productId) ?? [];
      list.push(img.url);
      imagesByProduct.set(img.productId, list);
    }

    const variantsByProduct = new Map<string, any[]>();
    for (const v of allVariants) {
      const list = variantsByProduct.get(v.productId) ?? [];
      list.push(v);
      variantsByProduct.set(v.productId, list);
    }

    return rows.map((p) =>
      this.toMobileProduct(
        p,
        imagesByProduct.get(p.id) ?? [],
        variantsByProduct.get(p.id) ?? [],
      ),
    );
  }

  async getProductById(id: string) {
    const [p] = await this.db
      .select(PRODUCT_COLUMNS_WITH_STORE)
      .from(products)
      .where(
        and(
          eq(products.id, id),
          eq(products.status, 'active'),
          belongsToApprovedStore(products.storeId),
        ),
      )
      .limit(1);
    if (!p) throw new NotFoundException('Produit introuvable');

    const imgs = await this.db
      .select()
      .from(productImages)
      .where(eq(productImages.productId, id))
      .orderBy(productImages.sortOrder);
    const variants = await this.db
      .select()
      .from(productVariants)
      .where(
        and(
          eq(productVariants.productId, id),
          eq(productVariants.isActive, true),
        ),
      )
      .orderBy(productVariants.sortOrder);

    // Agrégats d'avis réels (note moyenne + nombre) sur les avis actifs
    const [agg] = await this.db
      .select({
        avg: sql<number>`coalesce(avg(${productReviews.rating}), 0)`,
        count: sql<number>`count(*)`,
      })
      .from(productReviews)
      .where(
        and(
          eq(productReviews.productId, id),
          eq(productReviews.isActive, true),
        ),
      );

    const product = this.toMobileProduct(
      p,
      imgs.map((i) => i.url),
      variants,
    );
    product.rating = Math.round(Number(agg.avg) * 10) / 10;
    product.reviewCount = Number(agg.count);
    return product;
  }

  // ====== REVIEWS (avis produits) ======

  async getProductReviews(productId: string) {
    const rows = await this.db
      .select({
        id: productReviews.id,
        rating: productReviews.rating,
        title: productReviews.title,
        content: productReviews.content,
        isVerified: productReviews.isVerified,
        createdAt: productReviews.createdAt,
        firstName: customers.firstName,
        lastName: customers.lastName,
        avatar: customers.avatar,
      })
      .from(productReviews)
      .leftJoin(customers, eq(productReviews.customerId, customers.id))
      .where(
        and(
          eq(productReviews.productId, productId),
          eq(productReviews.isActive, true),
        ),
      )
      .orderBy(desc(productReviews.createdAt))
      .limit(50);

    return rows.map((r) => ({
      id: r.id,
      rating: r.rating,
      title: r.title,
      content: r.content,
      isVerified: r.isVerified,
      createdAt: r.createdAt?.toISOString(),
      authorName:
        `${r.firstName ?? ''} ${(r.lastName ?? '').charAt(0)}${r.lastName ? '.' : ''}`.trim() ||
        'Client',
      authorAvatar: r.avatar ?? '',
    }));
  }

  async createProductReview(
    customerId: string,
    productId: string,
    data: { rating: number; title?: string; content?: string },
  ) {
    const rating = Math.min(
      5,
      Math.max(1, Math.round(Number(data.rating) || 0)),
    );
    if (!rating) throw new ConflictException('Note invalide (1 à 5)');

    const [product] = await this.db
      .select({ id: products.id, storeId: products.storeId })
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);
    if (!product) throw new NotFoundException('Produit introuvable');

    // Un seul avis par client et par produit : mise à jour si déjà existant
    const [existing] = await this.db
      .select({ id: productReviews.id })
      .from(productReviews)
      .where(
        and(
          eq(productReviews.productId, productId),
          eq(productReviews.customerId, customerId),
        ),
      )
      .limit(1);
    if (existing) {
      const [updated] = await this.db
        .update(productReviews)
        .set({
          rating,
          title: data.title ?? null,
          content: data.content ?? null,
          updatedAt: new Date(),
        })
        .where(eq(productReviews.id, existing.id))
        .returning();
      return { id: updated.id, updated: true };
    }

    // Avis vérifié si le client a réellement commandé ce produit
    const [purchase] = await this.db
      .select({ id: orderItems.id })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(
        and(
          eq(orderItems.productId, productId),
          eq(orders.customerId, customerId),
        ),
      )
      .limit(1);

    const [created] = await this.db
      .insert(productReviews)
      .values({
        storeId: product.storeId,
        productId,
        customerId,
        rating,
        title: data.title ?? null,
        content: data.content ?? null,
        isVerified: !!purchase,
      })
      .returning();

    return { id: created.id, updated: false };
  }

  async getCategories() {
    const rows = await this.db
      .select()
      .from(categories)
      .where(
        and(
          eq(categories.isActive, true),
          belongsToApprovedStore(categories.storeId),
        ),
      )
      .orderBy(categories.name);
    return rows.map((c) => ({
      id: c.id,
      name: c.name,
      icon: this.categoryIcon(c.name),
      image: c.imageUrl ?? undefined,
      children: [],
    }));
  }

  async getProductsByCategory(categoryId: string) {
    return this.getProducts({ categoryId });
  }

  async getCategoryChildren(parentId: string) {
    const rows = await this.db
      .select()
      .from(categories)
      .where(
        and(
          eq(categories.isActive, true),
          eq(categories.parentId as any, parentId),
          belongsToApprovedStore(categories.storeId),
        ),
      )
      .orderBy(categories.name);
    return rows.map((c) => ({
      id: c.id,
      name: c.name,
      icon: this.categoryIcon(c.name),
      image: c.imageUrl ?? undefined,
    }));
  }

  private toMobileProduct(p: any, images: string[], variants: any[] = []) {
    const price = Number(p.price);
    const origPrice = p.comparePrice ? Number(p.comparePrice) : undefined;
    const discount =
      origPrice && origPrice > price
        ? Math.round((1 - price / origPrice) * 100)
        : undefined;
    const variantGroups = this.toVariantGroups(variants);

    return {
      id: p.id,
      title: p.name,
      images: images.length ? images : [''],
      priceUsd: price,
      originalPriceUsd: origPrice,
      rating: 0,
      reviewCount: 0,
      soldCount: 0,
      categoryId: p.categoryId,
      // Boutique d'origine : alimente l'insigne de provenance côté client.
      storeId: p.storeId ?? null,
      storeName: p.storeName ?? null,
      discountPercent: discount,
      freeShipping: false,
      isNewBuyerDeal: false,
      isChoice: false,
      badges: [],
      variants: variantGroups,
      // Section « Spécifications » de la fiche produit : résumé des options
      // disponibles (ex: Taille → "S, M, L" ; Couleur → "Rouge, Bleu").
      specs: variantGroups.map((g) => ({
        label: g.key,
        value: g.options.map((o) => o.label).join(', '),
      })),
      description: p.description ?? '',
    };
  }

  /**
   * Regroupe les attributs des variantes en groupes d'options pour le mobile :
   * [{sku, attributes:[{name:'Taille',value:'S'},{name:'Couleur',value:'Rouge'}]}, ...]
   *   → [{key:'Taille', labelKey:'product.size', options:[{id:'S',label:'S'}]}, ...]
   * Les anciennes variantes sans attributes retombent sur leur label.
   * Pour les attributs de type couleur, `swatch` porte la pastille hex affichée
   * sur la fiche produit (nom FR/EN reconnu, ou code hex saisi directement).
   */
  private toVariantGroups(variants: any[]) {
    const I18N_KEYS: Record<string, string> = {
      couleur: 'product.color',
      color: 'product.color',
      taille: 'product.size',
      size: 'product.size',
    };
    const COLOR_ATTR = new Set(['couleur', 'color', 'colour']);
    // Une unique variante SANS attributs = variante par défaut d'un produit
    // simple (elle ne porte que le SKU/stock, pas un choix client) → aucun
    // sélecteur ne doit s'afficher. On ne retombe sur le label que pour les
    // anciennes données comptant plusieurs variantes libellées.
    const hasAttributed = variants.some(
      (v) => Array.isArray(v.attributes) && v.attributes.length,
    );
    const isSingleDefault = variants.length <= 1 && !hasAttributed;

    const groups = new Map<
      string,
      {
        key: string;
        labelKey: string;
        options: Map<
          string,
          {
            id: string;
            label: string;
            swatch?: string;
            image?: string;
            stock: number;
          }
        >;
      }
    >();
    for (const v of variants) {
      if (isSingleDefault) continue;
      const attrs: any[] =
        Array.isArray(v.attributes) && v.attributes.length
          ? v.attributes
          : v.label
            ? [{ name: 'Variante', value: v.label }]
            : [];
      for (const a of attrs) {
        if (!a?.name || !a?.value) continue;
        const key = String(a.name);
        let group = groups.get(key);
        if (!group) {
          group = {
            key,
            labelKey: I18N_KEYS[key.toLowerCase()] ?? key,
            options: new Map(),
          };
          groups.set(key, group);
        }
        const value = String(a.value);
        if (!group.options.has(value)) {
          const swatch = COLOR_ATTR.has(key.toLowerCase())
            ? colorToHex(value)
            : undefined;
          group.options.set(value, {
            id: value,
            label: value,
            swatch,
            image: v.imageUrl ?? undefined,
            stock: v.stock ?? 0,
          });
        } else {
          const opt = group.options.get(value)!;
          opt.stock = (opt.stock ?? 0) + (v.stock ?? 0);
        }
      }
    }
    return [...groups.values()].map((g) => ({
      key: g.key,
      labelKey: g.labelKey,
      options: [...g.options.values()],
    }));
  }

  private categoryIcon(name: string): string {
    const map: Record<string, string> = {
      phones: 'cellphone',
      smartphones: 'cellphone',
      appliances: 'laptop',
      beauty: 'lipstick',
      fashion: 'tshirtCrew',
      clothing: 'tshirtCrew',
      shoes: 'shoeSneaker',
      automotive: 'car',
      automobile: 'car',
      furniture: 'home',
      home: 'home',
      toys: 'toyBrick',
      sports: 'basketball',
    };
    for (const [key, icon] of Object.entries(map)) {
      if (name.toLowerCase().includes(key)) return icon;
    }
    return 'store';
  }

  // ====== CONTENT (bridged from admin CMS tables) ======

  /**
   * Bannières publiques.
   * `storeId` absent = bannières globales de l'Admin uniquement : sans le filtre
   * `IS NULL`, les campagnes des boutiquiers remonteraient sur l'accueil.
   */
  async getBanners(screen?: string, storeId?: string) {
    const now = new Date();
    const conditions: any[] = [
      eq(banners.isActive, true),
      // Fenêtre de programmation : dates nullables = pas de contrainte
      sql`(${banners.startDate} IS NULL OR ${banners.startDate} <= ${now})`,
      sql`(${banners.endDate} IS NULL OR ${banners.endDate} >= ${now})`,
      storeId ? eq(banners.storeId, storeId) : isNull(banners.storeId),
    ];
    const validScreens = ['home', 'store', 'feed', 'account', 'tabbar'] as const;
    if (screen) {
      // Valeur d'écran inconnue → aucune bannière (évite de tout renvoyer par erreur)
      if (!(validScreens as readonly string[]).includes(screen)) return [];
      conditions.push(
        eq(banners.screen, screen as (typeof validScreens)[number]),
      );
    }
    const rows = await this.db
      .select()
      .from(banners)
      .where(and(...conditions))
      .orderBy(banners.position, banners.createdAt);
    return rows.map((b) => ({
      id: b.id,
      title: b.title,
      subtitle: b.subtitle,
      description: b.description,
      imageUrl: b.imageUrl,
      linkUrl: b.linkUrl,
      ctaText: b.ctaText,
      discountLabel: b.discountLabel,
      backgroundColor: b.backgroundColor,
    }));
  }

  async getFeedPosts(customerId?: string) {
    const rows = await this.db
      .select({
        post: feedPosts,
        likes: sql<number>`(select count(*) from feed_post_likes fpl where fpl.post_id = feed_posts.id)`,
        likedByMe: customerId
          ? sql<boolean>`exists(select 1 from feed_post_likes fpl where fpl.post_id = feed_posts.id and fpl.customer_id = ${customerId})`
          : sql<boolean>`false`,
      })
      .from(feedPosts)
      .where(eq(feedPosts.isActive, true))
      .orderBy(feedPosts.position, desc(feedPosts.createdAt));

    return rows.map(({ post, likes, likedByMe }) => ({
      id: post.id,
      title: post.title,
      mediaType: post.mediaType,
      image:
        post.mediaType === 'video'
          ? (post.thumbnailUrl ?? post.mediaUrl)
          : post.mediaUrl,
      videoUrl: post.mediaType === 'video' ? post.mediaUrl : null,
      aspectRatio: post.aspectRatio || 1,
      duration: post.duration,
      author: post.authorName,
      authorAvatar: post.authorAvatar ?? '',
      linkUrl: post.linkUrl,
      likes: Number(likes),
      likedByMe: !!likedByMe,
    }));
  }

  /** Like togglable : un client aime ou retire son like (idempotent). */
  async toggleFeedPostLike(postId: string, customerId: string) {
    const [post] = await this.db
      .select({ id: feedPosts.id })
      .from(feedPosts)
      .where(eq(feedPosts.id, postId))
      .limit(1);
    if (!post) throw new NotFoundException('Publication introuvable');

    const [existing] = await this.db
      .select({ id: feedPostLikes.id })
      .from(feedPostLikes)
      .where(
        and(
          eq(feedPostLikes.postId, postId),
          eq(feedPostLikes.customerId, customerId),
        ),
      )
      .limit(1);

    if (existing) {
      await this.db
        .delete(feedPostLikes)
        .where(eq(feedPostLikes.id, existing.id));
    } else {
      await this.db
        .insert(feedPostLikes)
        .values({ postId, customerId })
        .onConflictDoNothing();
    }

    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(feedPostLikes)
      .where(eq(feedPostLikes.postId, postId));
    return { liked: !existing, likes: Number(count) };
  }

  async getSearchTrending(): Promise<string[]> {
    const [block] = await this.db
      .select()
      .from(contentBlocks)
      .where(
        and(
          eq(contentBlocks.groupName, 'search'),
          eq(contentBlocks.key, 'trending'),
        ),
      )
      .limit(1);
    if (block?.value) {
      try {
        return JSON.parse(block.value);
      } catch {}
    }
    return [];
  }

  /** Détail d'une section : titre + TOUS ses produits (écran « Voir tout »). */
  async getFeedSectionProducts(sectionId: string) {
    const [section] = await this.db
      .select()
      .from(feedSections)
      .where(
        and(eq(feedSections.id, sectionId), eq(feedSections.isActive, true)),
      )
      .limit(1);
    if (!section) throw new NotFoundException('Section introuvable');

    const tagValue = `section:${section.id}`;
    let productList = await this.db
      .select(PRODUCT_COLUMNS_WITH_STORE)
      .from(products)
      .where(
        and(
          eq(products.status, 'active'),
          belongsToApprovedStore(products.storeId),
          sql`${products.tags} @> ARRAY[${tagValue}]::text[]`,
        ),
      )
      .orderBy(desc(products.createdAt))
      .limit(100);

    // Sans produits tagués : mêmes produits de secours que la section d'accueil
    if (productList.length === 0) {
      productList = await this.db
        .select(PRODUCT_COLUMNS_WITH_STORE)
        .from(products)
        .where(
          and(
            eq(products.status, 'active'),
            belongsToApprovedStore(products.storeId),
          ),
        )
        .orderBy(desc(products.createdAt))
        .limit(30);
    }

    const productIds = productList.map((p) => p.id);
    const allImages = productIds.length
      ? await this.db
          .select()
          .from(productImages)
          .where(inArray(productImages.productId, productIds))
          .orderBy(productImages.sortOrder)
      : [];
    const imagesByProduct = new Map<string, string[]>();
    for (const img of allImages) {
      const list = imagesByProduct.get(img.productId) ?? [];
      list.push(img.url);
      imagesByProduct.set(img.productId, list);
    }

    return {
      id: section.id,
      title: section.title,
      displayStyle: section.displayStyle,
      items: productList.map((p) =>
        this.toMobileProduct(p, imagesByProduct.get(p.id) ?? []),
      ),
    };
  }

  async getFeedSections() {
    const rows = await this.db
      .select()
      .from(feedSections)
      .where(eq(feedSections.isActive, true))
      .orderBy(feedSections.position);

    // Les sections 'banners' partagent toutes les bannières actives ciblées "feed" (une seule requête)
    const hasBannerSections = rows.some((s) => s.type === 'banners');
    const feedBanners = hasBannerSections ? await this.getBanners('feed') : [];

    // Pour chaque section de type 'products', charger les produits qui ont le tag section:<id>
    const enriched = await Promise.all(
      rows.map(async (section) => {
        if (section.type === 'banners') {
          return { ...section, items: feedBanners };
        }
        if (section.type !== 'products') return section;

        // Chercher les produits dont le tag contient "section:<id>"
        // Utiliser sql paramétré pour éviter toute injection
        const tagValue = `section:${section.id}`;
        const sectionProducts = await this.db
          .select(PRODUCT_COLUMNS_WITH_STORE)
          .from(products)
          .where(
            and(
              eq(products.status, 'active'),
              belongsToApprovedStore(products.storeId),
              sql`${products.tags} @> ARRAY[${tagValue}]::text[]`,
            ),
          )
          .limit(12);

        // Si aucun produit tagué, retourner les produits actifs les plus récents (fallback)
        const productList =
          sectionProducts.length > 0
            ? sectionProducts
            : await this.db
                .select(PRODUCT_COLUMNS_WITH_STORE)
                .from(products)
                .where(
                  and(
                    eq(products.status, 'active'),
                    belongsToApprovedStore(products.storeId),
                  ),
                )
                .orderBy(desc(products.createdAt))
                .limit(6);

        const productIds = productList.map((p) => p.id);
        const allImages = productIds.length
          ? await this.db
              .select()
              .from(productImages)
              .where(inArray(productImages.productId, productIds))
              .orderBy(productImages.sortOrder)
          : [];
        const imagesByProduct = new Map<string, string[]>();
        for (const img of allImages) {
          const list = imagesByProduct.get(img.productId) ?? [];
          list.push(img.url);
          imagesByProduct.set(img.productId, list);
        }

        return {
          ...section,
          items: productList.map((p) =>
            this.toMobileProduct(p, imagesByProduct.get(p.id) ?? []),
          ),
        };
      }),
    );

    return enriched;
  }

  /**
   * Pays couverts par les zones de livraison ACTIVES configurées par l'admin.
   * L'app mobile s'en sert pour ordonner/filtrer la liste « Expédier vers » :
   * les pays réellement livrables passent en tête. Liste vide = aucune
   * restriction (l'app propose alors tous les pays).
   */
  async getShippingCountries(): Promise<string[]> {
    const zones = await this.db
      .select({ countries: shippingZones.countries })
      .from(shippingZones)
      .where(eq(shippingZones.isActive, true));
    const set = new Set<string>();
    for (const z of zones) {
      const list = Array.isArray(z.countries) ? z.countries : [];
      for (const code of list) {
        if (typeof code === 'string' && code.length === 2)
          set.add(code.toUpperCase());
      }
    }
    return [...set];
  }

  /**
   * Devis de livraison pour le checkout mobile — « Zone + repli global ».
   *
   * 1. On cherche une zone ACTIVE dont la liste de pays contient le pays de
   *    livraison (ordonnée par priorité décroissante → la plus spécifique gagne).
   *    Trouvée : on prend sa méthode active la moins chère. Le seuil de gratuité
   *    éventuel de la méthode s'applique au sous-total.
   * 2. Aucune zone ne couvre le pays (ou pas de méthode) : repli sur les
   *    réglages globaux (commerce.baseShippingFee + commerce.freeShippingThreshold).
   *
   * Toutes les valeurs sont dans l'unité de référence brute (mêmes nombres que
   * les prix produits en base), cohérente avec le sous-total du panier.
   */
  async getShippingQuote(input: { country?: string; subtotal?: number }) {
    const subtotal = Number.isFinite(input.subtotal)
      ? Number(input.subtotal)
      : 0;
    const country = (input.country ?? '').trim().toUpperCase();

    if (country) {
      const zones = await this.db
        .select()
        .from(shippingZones)
        .where(
          and(eq(shippingZones.isActive, true), isNull(shippingZones.storeId)),
        )
        .orderBy(desc(shippingZones.priority));
      const zone = zones.find((z) => {
        const list = Array.isArray(z.countries) ? z.countries : [];
        return list.some(
          (c) => typeof c === 'string' && c.toUpperCase() === country,
        );
      });

      if (zone) {
        const methods = await this.db
          .select()
          .from(shippingMethods)
          .where(
            and(
              eq(shippingMethods.zoneId, zone.id),
              eq(shippingMethods.isActive, true),
              // Devis global du panier : seules les méthodes de la plateforme
              // entrent en jeu. Retenir celle d'une boutique laisserait
              // n'importe quel vendeur fixer les frais de port de tous.
              isNull(shippingMethods.storeId),
            ),
          );
        // Méthode la moins chère de la zone (baseRate est un decimal → string)
        const method = methods
          .slice()
          .sort((a, b) => Number(a.baseRate) - Number(b.baseRate))[0];
        if (method) {
          const baseRate = Number(method.baseRate) || 0;
          const freeThreshold =
            method.freeThreshold != null ? Number(method.freeThreshold) : null;
          const isFree = freeThreshold != null && subtotal >= freeThreshold;
          return {
            shippingCost: isFree ? 0 : baseRate,
            freeThreshold,
            isFree,
            estimatedDaysMin: method.estimatedDaysMin ?? 1,
            estimatedDaysMax: method.estimatedDaysMax ?? 7,
            source: 'zone' as const,
            zoneName: zone.name,
          };
        }
      }
    }

    // Repli global : réglages CMS commerce.*
    const rows = await this.db
      .select()
      .from(appSettings)
      .where(
        inArray(appSettings.key, [
          'commerce.baseShippingFee',
          'commerce.freeShippingThreshold',
        ]),
      );
    const getNum = (key: string, fallback: number) => {
      const row = rows.find((r) => r.key === key);
      const n = row ? Number(row.value) : NaN;
      return Number.isFinite(n) ? n : fallback;
    };
    const baseRate = getNum('commerce.baseShippingFee', 1000);
    const freeThreshold = getNum('commerce.freeShippingThreshold', 10000);
    const isFree = subtotal >= freeThreshold;
    return {
      shippingCost: isFree ? 0 : baseRate,
      freeThreshold,
      isFree,
      estimatedDaysMin: 1,
      estimatedDaysMax: 7,
      source: 'global' as const,
      zoneName: null,
    };
  }

  /**
   * Devis de livraison PAR BOUTIQUE pour le récapitulatif multi-vendeurs.
   * Passe par quoteStoreShipping — exactement la même fonction que
   * createOrder : ce que l'écran affiche est ce que le serveur facturera.
   */
  async getStoreShippingQuotes(input: {
    country: string;
    stores: { storeId: string; subtotal: number }[];
  }) {
    const country = (input.country ?? '').trim().toUpperCase();
    const quotes = await Promise.all(
      input.stores.map(async (s) => ({
        storeId: s.storeId,
        subtotal: s.subtotal,
        ...(await quoteStoreShipping(this.db, {
          storeId: s.storeId,
          country,
          subtotal: s.subtotal,
        })),
      })),
    );
    return {
      quotes,
      totalShipping: quotes.reduce((sum, q) => sum + q.shippingCost, 0),
      currency: 'XOF',
    };
  }

  /**
   * « Vous aimerez aussi » (panier).
   * L'admin peut marquer UNE section produits comme source des recommandations
   * (case « panier » dans CMS → Sections, stockée dans data.cartRecommendations).
   * Sans section marquée, ou si elle est vide : les produits actifs les plus récents.
   */
  async getCartRecommendations() {
    const sections = await this.db
      .select()
      .from(feedSections)
      .where(
        and(eq(feedSections.isActive, true), eq(feedSections.type, 'products')),
      );
    const target = sections.find(
      (s) => (s.data as any)?.cartRecommendations === true,
    );

    let productList: (typeof products.$inferSelect & {
      storeName: string | null;
    })[] = [];
    if (target) {
      const tagValue = `section:${target.id}`;
      productList = await this.db
        .select(PRODUCT_COLUMNS_WITH_STORE)
        .from(products)
        .where(
          and(
            eq(products.status, 'active'),
            belongsToApprovedStore(products.storeId),
            sql`${products.tags} @> ARRAY[${tagValue}]::text[]`,
          ),
        )
        .orderBy(desc(products.createdAt))
        .limit(12);
    }
    if (productList.length === 0) {
      productList = await this.db
        .select(PRODUCT_COLUMNS_WITH_STORE)
        .from(products)
        .where(
          and(
            eq(products.status, 'active'),
            belongsToApprovedStore(products.storeId),
          ),
        )
        .orderBy(desc(products.createdAt))
        .limit(12);
    }

    const productIds = productList.map((p) => p.id);
    const allImages = productIds.length
      ? await this.db
          .select()
          .from(productImages)
          .where(inArray(productImages.productId, productIds))
          .orderBy(productImages.sortOrder)
      : [];
    const imagesByProduct = new Map<string, string[]>();
    for (const img of allImages) {
      const list = imagesByProduct.get(img.productId) ?? [];
      list.push(img.url);
      imagesByProduct.set(img.productId, list);
    }

    return productList.map((p) =>
      this.toMobileProduct(p, imagesByProduct.get(p.id) ?? []),
    );
  }

  async getSuggestedPeople() {
    const rows = await this.db
      .select()
      .from(contentBlocks)
      .where(eq(contentBlocks.groupName, 'suggested_people'))
      .orderBy(contentBlocks.key);

    if (rows.length) {
      return rows
        .map((r) => {
          try {
            return JSON.parse(r.value);
          } catch {
            return null;
          }
        })
        .filter(Boolean);
    }

    return [];
  }

  async getHomeShortcuts() {
    const rows = await this.db
      .select()
      .from(contentBlocks)
      .where(
        and(
          eq(contentBlocks.groupName, 'shortcuts'),
          eq(contentBlocks.isActive, true),
        ),
      )
      .orderBy(contentBlocks.key);

    // value = {id, labelKey, icon, target:{type,value}|null} — transmis tel quel au mobile
    return rows
      .map((r) => {
        try {
          return JSON.parse(r.value);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  }

  // ====== BRANDING / SETTINGS (bridged from admin CMS) ======

  async getAppSettings() {
    return this.db
      .select()
      .from(appSettings)
      .orderBy(appSettings.group, appSettings.key);
  }

  async getLogos() {
    return this.db.select().from(logos).orderBy(logos.context);
  }

  async getSocialLinks() {
    return this.db.select().from(socialLinks).orderBy(socialLinks.platform);
  }

  async getSEOMetadata() {
    return this.db.select().from(seoMetadata).orderBy(seoMetadata.page);
  }

  async getFeatureFlags() {
    return this.db
      .select()
      .from(featureFlags)
      .orderBy(featureFlags.group, featureFlags.key);
  }

  /**
   * Page statique par slug (CGU, mentions légales, politique de confidentialité…)
   * Appelé par le mobile sur /mobile/static-pages/:slug
   * L'admin gère ces pages via /content/pages/:id (par UUID).
   */
  /** Toutes les pages d'information publiées (écran « Informations légales »). */
  async listStaticPages() {
    return this.db
      .select({
        slug: staticPages.slug,
        title: staticPages.title,
        updatedAt: staticPages.updatedAt,
      })
      .from(staticPages)
      .where(eq(staticPages.isActive, true))
      .orderBy(staticPages.title);
  }

  async getStaticPageBySlug(slug: string) {
    const [page] = await this.db
      .select()
      .from(staticPages)
      .where(and(eq(staticPages.slug, slug), eq(staticPages.isActive, true)))
      .limit(1);
    if (!page) throw new NotFoundException(`Page introuvable : ${slug}`);
    return page;
  }

  /**
   * Recherche par image — analyse visuelle réelle des pixels.
   *
   * Stratégie :
   * 1. Google Cloud Vision API analyse les pixels de l'image uploadée et
   *    retourne des labels sémantiques (ex: "dress", "red", "woman", "cotton").
   *    C'est la même approche qu'AliExpress/Taobao.
   * 2. Ces labels sont traduits en termes de recherche FR/EN et matchés
   *    contre name + description + categoryName des produits actifs.
   * 3. Les résultats sont triés par score de pertinence (nombre de labels
   *    matchés × confiance Vision API).
   * 4. Si aucun label reconnu (image noire, floue, hors catalogue) → [] vide.
   *
   * Fallback sans clé API : heuristique sur le nom de fichier (développement).
   */
  async searchByImage(imagePath: string) {
    const filename = imagePath.split(/[\/\\]/).pop() ?? '';

    // Étape 1 : extraire les labels depuis les pixels (ou le nom de fichier en fallback)
    const visionLabels = await this.vision.extractLabels(imagePath, filename);
    if (visionLabels.length === 0) return [];

    // Étape 2 : traduire les labels anglais en termes français pour matcher
    // les produits saisis en français par l'admin
    const EN_TO_FR: Record<string, string[]> = {
      dress: ['robe'], skirt: ['jupe'], shirt: ['chemise'], blouse: ['chemisier'],
      'top': ['haut', 'top'], pants: ['pantalon'], trousers: ['pantalon'],
      jeans: ['jean'], jacket: ['veste', 'blouson'], coat: ['manteau'],
      suit: ['costume'], shoes: ['chaussure'], sneakers: ['sneaker', 'basket'],
      boots: ['botte'], bag: ['sac'], handbag: ['sac'], purse: ['sac'],
      watch: ['montre'], hat: ['chapeau', 'casquette'], scarf: ['écharpe'],
      gloves: ['gants'], belt: ['ceinture'], sunglasses: ['lunettes'],
      jewelry: ['bijou'], necklace: ['collier'], bracelet: ['bracelet'],
      ring: ['bague'], earrings: ['boucles d\'oreilles'],
      // Couleurs
      red: ['rouge'], blue: ['bleu'], green: ['vert'], black: ['noir'],
      white: ['blanc'], yellow: ['jaune'], pink: ['rose'], orange: ['orange'],
      purple: ['violet'], brown: ['marron'], grey: ['gris'], gray: ['gris'],
      gold: ['or', 'doré'], silver: ['argent', 'argenté'],
      // Genre
      woman: ['femme'], women: ['femme'], female: ['femme'], ladies: ['femme'],
      man: ['homme'], men: ['homme'], male: ['homme'],
      child: ['enfant'], children: ['enfant'], kids: ['enfant'],
      // Électronique
      phone: ['téléphone', 'smartphone'], smartphone: ['smartphone'],
      laptop: ['ordinateur', 'laptop'], computer: ['ordinateur'],
      tablet: ['tablette'], headphones: ['casque', 'écouteur'],
      earphones: ['écouteur'], speaker: ['enceinte'],
      // Beauté
      lipstick: ['rouge à lèvres'], perfume: ['parfum'],
      cream: ['crème'], makeup: ['maquillage'], cosmetics: ['cosmétique'],
      // Maison
      chair: ['chaise'], table: ['table'], lamp: ['lampe'],
      sofa: ['canapé'], furniture: ['meuble'],
      // Sport
      sport: ['sport'], football: ['football'], gym: ['gym', 'fitness'],
      // Matières
      leather: ['cuir'], cotton: ['coton'], silk: ['soie'], wool: ['laine'],
      denim: ['jean', 'denim'],
      // Catégories générales
      clothing: ['vêtement', 'habit'], fashion: ['mode'],
      accessory: ['accessoire'], electronics: ['électronique'],
      beauty: ['beauté'], home: ['maison'],
    };

    // Construire la liste finale de termes de recherche (labels + traductions)
    const searchTerms = new Map<string, number>(); // terme → score max
    for (const label of visionLabels) {
      const term = label.description.toLowerCase();
      // Ajouter le label original
      const existing = searchTerms.get(term) ?? 0;
      if (label.score > existing) searchTerms.set(term, label.score);
      // Ajouter les traductions françaises
      const translations = EN_TO_FR[term] ?? [];
      for (const fr of translations) {
        const existingFr = searchTerms.get(fr) ?? 0;
        if (label.score > existingFr) searchTerms.set(fr, label.score);
      }
    }

    if (searchTerms.size === 0) return [];

    const terms = [...searchTerms.keys()];

    // Étape 3 : requête SQL — chaque terme matche sur name OU description
    const tokenConditions = terms.map((term) =>
      sql`(lower(${products.name}) LIKE ${'%' + term + '%'} OR lower(coalesce(${products.description}, '')) LIKE ${'%' + term + '%'})`,
    );

    // Score pondéré : chaque match vaut le score de confiance Vision du label
    // Le score est converti en entier (x100) pour éviter l'erreur PostgreSQL
    // "syntaxe invalide pour le type integer" avec les flottants dans CASE WHEN
    const scoreExpr = sql<number>`(
      ${terms
        .map((t) => {
          const weight = Math.round((searchTerms.get(t) ?? 0.5) * 100);
          return sql`(CASE WHEN lower(${products.name}) LIKE ${'%' + t + '%'} OR lower(coalesce(${products.description}, '')) LIKE ${'%' + t + '%'} THEN ${sql.raw(String(weight))} ELSE 0 END)`;
        })
        .reduce((a, b) => sql`${a} + ${b}`)}
    )`;

    const rows = await this.db
      .select(PRODUCT_COLUMNS_WITH_STORE)
      .from(products)
      .where(
        and(
          eq(products.status, 'active'),
          belongsToApprovedStore(products.storeId),
          sql`(${tokenConditions.reduce((a, b) => sql`${a} OR ${b}`)})`,
        ),
      )
      .orderBy(desc(scoreExpr), desc(products.createdAt))
      .limit(24);

    if (rows.length === 0) return [];

    const productIds = rows.map((p) => p.id);
    const allImages = await this.db
      .select()
      .from(productImages)
      .where(inArray(productImages.productId, productIds))
      .orderBy(productImages.sortOrder);

    const imagesByProduct = new Map<string, string[]>();
    for (const img of allImages) {
      const list = imagesByProduct.get(img.productId) ?? [];
      list.push(img.url);
      imagesByProduct.set(img.productId, list);
    }

    return rows.map((p) =>
      this.toMobileProduct(p, imagesByProduct.get(p.id) ?? []),
    );
  }

  /**
   * @deprecated Remplacé par ImageVisionService.extractFromFilename()
   * Conservé uniquement pour compatibilité — ne plus appeler directement.
   */
  private extractImageTokens(filename: string): string[] {
    return this.vision
      .extractFromFilename(filename)
      .map((l) => l.description);
  }

  async getCustomerOrders(customerId: string) {
    const rows = await this.db
      .select()
      .from(orders)
      .where(eq(orders.customerId, customerId))
      .orderBy(desc(orders.createdAt))
      .limit(50);

    const orderIds = rows.map((o) => o.id);
    const allItems = orderIds.length
      ? await this.db
          .select()
          .from(orderItems)
          .where(inArray(orderItems.orderId, orderIds))
      : [];

    const itemsByOrder = new Map<string, typeof allItems>();
    for (const item of allItems) {
      const list = itemsByOrder.get(item.orderId) ?? [];
      list.push(item);
      itemsByOrder.set(item.orderId, list);
    }

    return rows.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      total: o.total,
      currency: o.currency,
      createdAt: o.createdAt,
      items: (itemsByOrder.get(o.id) ?? []).map((i) => ({
        productId: i.productId,
        label: i.label,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        imageUrl: i.imageUrl,
      })),
    }));
  }

  async getCustomerOrderById(customerId: string, orderId: string) {
    const [order] = await this.db
      .select()
      .from(orders)
      .where(and(eq(orders.id, orderId), eq(orders.customerId, customerId)))
      .limit(1);
    if (!order) throw new NotFoundException('Commande introuvable');

    const items = await this.db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId));

    const statusLog = await this.db
      .select()
      .from(orderStatusLog)
      .where(eq(orderStatusLog.orderId, orderId))
      .orderBy(desc(orderStatusLog.createdAt));

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      subtotal: order.subtotal,
      shippingCost: order.shippingCost,
      discountAmount: order.discountAmount,
      total: order.total,
      currency: order.currency,
      shippingAddress: order.shippingAddress,
      notes: order.notes,
      createdAt: order.createdAt,
      items: items.map((i) => ({
        productId: i.productId,
        label: i.label,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        totalPrice: i.totalPrice,
        imageUrl: i.imageUrl,
      })),
      statusLog: statusLog.map((s) => ({
        toStatus: s.toStatus,
        reason: s.reason,
        createdAt: s.createdAt,
      })),
    };
  }

  async submitSuggestion(customerId: string | null, content: string) {
    await this.db.insert(contentBlocks).values({
      storeId: SYSTEM_STORE_ID,
      groupName: 'suggestions',
      key: `suggestion_${Date.now()}`,
      value: JSON.stringify({ content, customerId, submittedAt: new Date().toISOString() }),
      isActive: true,
    });
    return { ok: true };
  }

  // ====== PAYMENT ======

  async getPaymentMethods() {
    const rows = await this.db
      .select()
      .from(paymentMethods)
      .where(eq(paymentMethods.isActive, true))
      .orderBy(paymentMethods.position);

    return rows.map((m) => ({
      id: m.code,
      icon: this.paymentIcon(m.type),
      labelKey: m.name,
      hintKey: m.description ?? '',
      logoUrl: m.logoUrl,
      type: m.type,
      supportedCountries: m.supportedCountries,
    }));
  }

  private paymentIcon(type: string): string {
    const map: Record<string, string> = {
      'mobile-money': 'cellphone',
      card: 'creditCard',
      cod: 'cash',
      wallet: 'wallet',
    };
    return map[type] ?? 'creditCard';
  }

  async getCardBrands() {
    return ['VISA', 'Mastercard', 'UnionPay', 'Amex', 'JCB'];
  }

  // ====== COUPONS ======

  async getActiveCoupons() {
    const now = new Date();
    const data = await this.db
      .select({
        id: coupons.id,
        code: coupons.code,
        name: coupons.name,
        description: coupons.description,
        type: coupons.type,
        value: coupons.value,
        minPurchase: coupons.minPurchase,
        maxDiscount: coupons.maxDiscount,
        applicableTo: coupons.applicableTo,
        applicableId: coupons.applicableId,
        applicableName: coupons.applicableName,
        firstTimeOnly: coupons.firstTimeOnly,
        usedCount: coupons.usedCount,
        usageLimitTotal: coupons.usageLimitTotal,
        endDate: coupons.endDate,
      })
      .from(coupons)
      .where(
        and(
          eq(coupons.isActive, true),
          sql`${coupons.startDate} <= ${now}`,
          sql`${coupons.endDate} >= ${now}`,
        ),
      )
      .orderBy(coupons.endDate);
    return data;
  }

  /** Historique des coupons utilisés par le client (bouton « Historique » de l'écran coupons). */
  async getCouponHistory(customerId: string) {
    const rows = await this.db
      .select({
        id: couponUsage.id,
        code: coupons.code,
        name: coupons.name,
        type: coupons.type,
        value: coupons.value,
        discountAmount: couponUsage.discountAmount,
        usedAt: couponUsage.createdAt,
      })
      .from(couponUsage)
      .innerJoin(coupons, eq(couponUsage.couponId, coupons.id))
      .where(eq(couponUsage.customerId, customerId))
      .orderBy(desc(couponUsage.createdAt))
      .limit(50);
    return rows;
  }

  // ====== STORES (boutiques publiques) ======

  /** Colonnes calculées communes aux cartes et au détail boutique. */
  // Les références à la table externe (stores.id) sont écrites en SQL brut et
  // non interpolées : Drizzle rendrait `stores.id` en `"id"` non qualifié, qui
  // résoudrait alors vers la colonne `id` de la sous-requête au lieu de celle
  // de la requête englobante — les compteurs remontaient 0 en silence.
  private storeCardColumns(customerId?: string) {
    return {
      id: stores.id,
      name: stores.name,
      description: stores.description,
      country: stores.country,
      city: stores.city,
      logoUrl: sql<
        string | null
      >`(select sm.url from store_media sm where sm.store_id = stores.id and sm.type = 'logo' and sm.is_active = true limit 1)`,
      coverUrl: sql<
        string | null
      >`(select sm.url from store_media sm where sm.store_id = stores.id and sm.type = 'cover' and sm.is_active = true limit 1)`,
      followersCount: sql<number>`(select count(*)::int from store_follows sf where sf.store_id = stores.id)`,
      productCount: sql<number>`(select count(*)::int from products p where p.store_id = stores.id and p.status = 'active')`,
      // Note boutique = agrégat des avis produits (product_reviews.store_id).
      // La moyenne brute est lissée dans toStoreCard (bayésien) avant affichage.
      ratingAvg: sql<
        number | null
      >`(select avg(pr.rating)::float from product_reviews pr where pr.store_id = stores.id and pr.is_active = true)`,
      ratingCount: sql<number>`(select count(*)::int from product_reviews pr where pr.store_id = stores.id and pr.is_active = true)`,
      salesCount: sql<number>`(select count(*)::int from orders o where o.store_id = stores.id and o.status not in ('cancelled','refunded'))`,
      likedByMe: customerId
        ? sql<boolean>`exists (select 1 from store_follows sf where sf.store_id = stores.id and sf.customer_id = ${customerId})`
        : sql<boolean>`false`,
    };
  }

  private async storeGalleryPhotos(storeId: string): Promise<string[]> {
    const rows = await this.db
      .select({ url: storeMedia.url })
      .from(storeMedia)
      .where(
        and(
          eq(storeMedia.storeId, storeId),
          eq(storeMedia.type, 'gallery'),
          eq(storeMedia.isActive, true),
        ),
      )
      .orderBy(storeMedia.sortOrder);
    return rows.map((r) => r.url);
  }

  private toStoreCard(row: any, photos: string[] = []) {
    // Note bayésienne : la moyenne brute est tirée vers RATING_PRIOR tant que
    // la boutique a peu d'avis (RATING_PRIOR_WEIGHT avis « virtuels »). Une
    // boutique à 2 avis 5★ affiche ~4.2, pas 5.0 — et jamais de note quand il
    // n'y a aucun avis (null, pas un faux 0).
    const RATING_PRIOR = 4.0;
    const RATING_PRIOR_WEIGHT = 10;
    const ratingCount = Number(row.ratingCount ?? 0);
    const ratingAvg = row.ratingAvg != null ? Number(row.ratingAvg) : null;
    const rating =
      ratingCount > 0 && ratingAvg != null
        ? Math.round(
            ((ratingAvg * ratingCount + RATING_PRIOR * RATING_PRIOR_WEIGHT) /
              (ratingCount + RATING_PRIOR_WEIGHT)) *
              10,
          ) / 10
        : null;

    return {
      id: row.id,
      name: row.name,
      description: row.description ?? null,
      country: row.country,
      city: row.city ?? null,
      logoUrl: row.logoUrl ?? null,
      coverUrl: row.coverUrl ?? null,
      photos,
      followersCount: Number(row.followersCount ?? 0),
      productCount: Number(row.productCount ?? 0),
      rating,
      ratingCount,
      salesCount: Number(row.salesCount ?? 0),
      likedByMe: Boolean(row.likedByMe),
      // Compatibilité avec les écrans mobile historiques (useHomeStores/useFollows)
      followers: String(row.followersCount ?? 0),
      avatar: row.logoUrl ?? '',
    };
  }

  async getStores(
    params: {
      limit?: number;
      offset?: number;
      search?: string;
      customerId?: string;
    } = {},
  ) {
    const limit = Math.min(params.limit ?? 20, 50);
    const offset = params.offset ?? 0;

    const conditions = [eq(stores.status, APPROVED_STORE)];
    if (params.search)
      conditions.push(like(stores.name, `%${params.search}%`));

    const rows = await this.db
      .select(this.storeCardColumns(params.customerId))
      .from(stores)
      .where(and(...conditions))
      .orderBy(desc(stores.createdAt))
      .limit(limit)
      .offset(offset);

    return rows.map((row) => this.toStoreCard(row));
  }

  /**
   * Vitrine de la liste des boutiques : sections composées par l'admin central,
   * chacune avec ses boutiques déjà hydratées au format carte.
   * Les sections vides sont écartées — un titre sans boutique n'a rien à dire.
   */
  async getStoreGroups(customerId?: string) {
    const groups = await this.db
      .select({
        id: storeGroups.id,
        title: storeGroups.title,
        subtitle: storeGroups.subtitle,
        icon: storeGroups.icon,
      })
      .from(storeGroups)
      .where(eq(storeGroups.isActive, true))
      .orderBy(storeGroups.sortOrder, storeGroups.createdAt);
    if (!groups.length) return [];

    // Une seule requête pour toutes les sections, puis répartition en mémoire.
    // Le filtre sur le statut garantit qu'une boutique suspendue disparaît de
    // la vitrine sans que l'admin ait à la retirer de la section à la main.
    const rows = await this.db
      .select({
        groupId: storeGroupItems.groupId,
        ...this.storeCardColumns(customerId),
      })
      .from(storeGroupItems)
      .innerJoin(stores, eq(storeGroupItems.storeId, stores.id))
      .where(
        and(
          inArray(
            storeGroupItems.groupId,
            groups.map((g) => g.id),
          ),
          eq(stores.status, APPROVED_STORE),
        ),
      )
      .orderBy(storeGroupItems.sortOrder);

    const byGroup = new Map<string, any[]>();
    for (const row of rows) {
      const list = byGroup.get(row.groupId) ?? [];
      list.push(this.toStoreCard(row));
      byGroup.set(row.groupId, list);
    }

    return groups
      .map((g) => ({ ...g, stores: byGroup.get(g.id) ?? [] }))
      .filter((g) => g.stores.length > 0);
  }

  /** Détail d'une boutique publique. 404 si elle n'est pas approuvée. */
  async getStoreById(storeId: string, customerId?: string) {
    const [row] = await this.db
      .select(this.storeCardColumns(customerId))
      .from(stores)
      .where(and(eq(stores.id, storeId), eq(stores.status, APPROVED_STORE)))
      .limit(1);
    if (!row) throw new NotFoundException('Boutique introuvable');

    return this.toStoreCard(row, await this.storeGalleryPhotos(storeId));
  }

  /** Garde-fou : refuse toute lecture sur une boutique non publiable. */
  private async assertApprovedStore(storeId: string) {
    const [row] = await this.db
      .select({ id: stores.id })
      .from(stores)
      .where(and(eq(stores.id, storeId), eq(stores.status, APPROVED_STORE)))
      .limit(1);
    if (!row) throw new NotFoundException('Boutique introuvable');
  }

  async getStoreProducts(
    storeId: string,
    query: {
      categoryId?: string;
      search?: string;
      minPrice?: number;
      maxPrice?: number;
      sort?: string;
      limit?: number;
      offset?: number;
    } = {},
  ) {
    await this.assertApprovedStore(storeId);
    return this.getProducts({ ...query, storeId });
  }

  async getStoreCategories(storeId: string) {
    await this.assertApprovedStore(storeId);
    const rows = await this.db
      .select()
      .from(categories)
      .where(
        and(eq(categories.storeId, storeId), eq(categories.isActive, true)),
      )
      .orderBy(categories.name);
    return rows.map((c) => ({
      id: c.id,
      name: c.name,
      parentId: c.parentId ?? null,
      icon: this.categoryIcon(c.name),
      image: c.imageUrl ?? undefined,
    }));
  }

  async getStoreBanners(storeId: string) {
    await this.assertApprovedStore(storeId);
    return this.getBanners(undefined, storeId);
  }

  /**
   * Moyens de paiement acceptés par la boutique. Délégué au service qui les
   * possède, pour que la règle de visibilité (`isEnabled`, `isPublic`, pays)
   * n'existe qu'à un seul endroit.
   */
  async getStorePaymentMethods(storeId: string, country?: string) {
    await this.assertApprovedStore(storeId);
    return this.storePayments.listPublic(storeId, country);
  }

  /**
   * Sections de catalogue composées par le boutiquier, avec leurs produits
   * déjà hydratés : le mobile n'a qu'à choisir le rendu selon `layout`.
   * Les sections vides sont écartées — un titre sans produit n'a rien à dire.
   */
  async getStoreSections(storeId: string) {
    await this.assertApprovedStore(storeId);
    const sections = await this.db
      .select({
        id: storeSections.id,
        title: storeSections.title,
        subtitle: storeSections.subtitle,
        layout: storeSections.layout,
      })
      .from(storeSections)
      .where(
        and(
          eq(storeSections.storeId, storeId),
          eq(storeSections.isActive, true),
        ),
      )
      .orderBy(storeSections.sortOrder, storeSections.createdAt);
    if (!sections.length) return [];

    const items = await this.db
      .select({
        sectionId: storeSectionItems.sectionId,
        productId: storeSectionItems.productId,
        sortOrder: storeSectionItems.sortOrder,
      })
      .from(storeSectionItems)
      .innerJoin(products, eq(storeSectionItems.productId, products.id))
      .where(
        and(
          inArray(
            storeSectionItems.sectionId,
            sections.map((s) => s.id),
          ),
          // Un produit retiré de la vente ne doit pas rester en vitrine
          eq(products.status, 'active'),
        ),
      )
      .orderBy(storeSectionItems.sortOrder);
    if (!items.length) return [];

    // Une seule requête produits pour toutes les sections, puis répartition :
    // un produit peut apparaître dans plusieurs sections.
    const hydrated = await this.getProducts({
      storeId,
      limit: items.length,
    });
    const byId = new Map(hydrated.map((p: any) => [p.id, p]));

    return sections
      .map((s) => ({
        ...s,
        products: items
          .filter((i) => i.sectionId === s.id)
          .map((i) => byId.get(i.productId))
          .filter(Boolean),
      }))
      .filter((s) => s.products.length > 0);
  }

  async getStoreFollowStatus(storeId: string, customerId?: string) {
    if (!customerId) return { following: false };
    const [row] = await this.db
      .select({ id: storeFollows.id })
      .from(storeFollows)
      .where(
        and(
          eq(storeFollows.storeId, storeId),
          eq(storeFollows.customerId, customerId),
        ),
      )
      .limit(1);
    return { following: !!row };
  }

  // ====== STORE FOLLOWS (boutiques suivies) ======

  async getFollowedStores(customerId: string) {
    const rows = await this.db
      .select(this.storeCardColumns(customerId))
      .from(storeFollows)
      .innerJoin(stores, eq(storeFollows.storeId, stores.id))
      .where(
        and(
          eq(storeFollows.customerId, customerId),
          eq(stores.status, APPROVED_STORE),
        ),
      )
      .orderBy(desc(storeFollows.createdAt));

    return rows.map((row) => this.toStoreCard(row));
  }

  async followStore(customerId: string, storeId: string) {
    await this.assertApprovedStore(storeId);
    // Idempotent : le doublon est ignoré grâce à la contrainte unique
    await this.db
      .insert(storeFollows)
      .values({ customerId, storeId })
      .onConflictDoNothing();
    return { following: true };
  }

  async unfollowStore(customerId: string, storeId: string) {
    await this.db
      .delete(storeFollows)
      .where(
        and(
          eq(storeFollows.customerId, customerId),
          eq(storeFollows.storeId, storeId),
        ),
      );
    return { following: false };
  }

  // ====== CONVERSATIONS ======

  async getCustomerConversations(customerId: string) {
    const convs = await this.db
      .select({
        id: conversations.id,
        storeId: conversations.storeId,
        orderId: conversations.orderId,
        subject: conversations.subject,
        storeName: stores.name,
        storeLogo: sql<
          string | null
        >`(select sm.url from store_media sm where sm.store_id = ${conversations.storeId} and sm.type = 'logo' and sm.is_active = true limit 1)`,
        // `conversations.order_id` est un `text` sans clé étrangère : on
        // compare donc sur `o.id::text`, jamais l'inverse — un id non-uuid
        // ferait échouer le cast de toute la requête.
        orderNumber: sql<
          string | null
        >`(select o.order_number from orders o where o.id::text = ${conversations.orderId} limit 1)`,
      })
      .from(conversations)
      .leftJoin(stores, eq(stores.id, conversations.storeId))
      .where(eq(conversations.customerId, customerId))
      .orderBy(desc(conversations.updatedAt));

    return Promise.all(
      convs.map(async (conv) => {
        const [lastMsg] = await this.db
          .select()
          .from(messages)
          .where(eq(messages.conversationId, conv.id))
          .orderBy(desc(messages.createdAt))
          .limit(1);

        const [{ count: unreadCount }] = await this.db
          .select({ count: sql<number>`count(*)` })
          .from(messages)
          .where(
            and(
              eq(messages.conversationId, conv.id),
              sql`${messages.readAt} IS NULL`,
              eq(messages.senderRole, 'admin'),
            ),
          );

        return {
          id: conv.id,
          // Titre = la boutique : le client doit savoir avec qui il parle.
          // Le sujet (« Commande N ») descend en sous-titre côté mobile.
          name: conv.storeName ?? conv.subject ?? 'Conversation',
          avatar: conv.storeLogo ?? '',
          online: false,
          storeId: conv.storeId,
          storeName: conv.storeName ?? null,
          storeLogo: conv.storeLogo ?? null,
          orderId: conv.orderId ?? null,
          orderRef: conv.orderNumber ?? null,
          subject: conv.subject ?? null,
          // Aperçu lisible pour les médias (jamais l'URL/nom de fichier brut)
          lastMessage: lastMsg
            ? lastMsg.deletedAt
              ? 'Message supprimé'
              : lastMsg.type === 'image'
                ? lastMsg.content
                  ? `📷 ${lastMsg.content}`
                  : '📷 Photo'
                : lastMsg.type === 'video'
                  ? lastMsg.content
                    ? `🎥 ${lastMsg.content}`
                    : '🎥 Vidéo'
                  : lastMsg.type === 'audio'
                    ? '🎤 Message vocal'
                    : lastMsg.type === 'pdf'
                      ? `📄 ${lastMsg.attachmentName || 'Document'}`
                      : (lastMsg.content ?? '')
            : '',
          lastTime: lastMsg?.createdAt
            ? new Date(lastMsg.createdAt).toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit',
              })
            : '',
          unread: Number(unreadCount),
          messages: [],
        };
      }),
    );
  }

  /**
   * Portefeuille du client : points de fidélité + total économisé (somme des
   * remises appliquées sur ses commandes). Montant en FCFA (même unité que les
   * prix). Un bonus = 1 point (le mapping points→devise viendra plus tard).
   */
  async getWallet(customerId: string) {
    const [points] = await this.db
      .select()
      .from(loyaltyPoints)
      .where(eq(loyaltyPoints.customerId, customerId))
      .limit(1);

    const [savings] = await this.db
      .select({
        total: sql<string>`coalesce(sum(${orders.discountAmount}), 0)`,
      })
      .from(orders)
      .where(eq(orders.customerId, customerId));

    return {
      balance: points?.balance ?? 0,
      lifetime: points?.lifetime ?? 0,
      tier: points?.tier ?? 'bronze',
      totalSavings: Number(savings?.total ?? 0),
    };
  }
}
