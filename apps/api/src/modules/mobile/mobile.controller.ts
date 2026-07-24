import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  Query,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  UploadedFile,
  UseInterceptors,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import {
  randomFilename,
  validateFileContent,
} from '../../common/upload/upload.helper';
import { MobileService } from './mobile.service';
import { CustomersService } from '../customers/customers.service';
import { CustomerAuthGuard } from './customer-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CustomerRoute } from '../../common/decorators/customer-route.decorator';
import { PushService } from '../push/push.service';
import { CreateOrderDto } from './dto/create-order.dto';

@ApiTags('Mobile')
@Controller('mobile')
// CustomerRoute : sans lui, le JwtAuthGuard global (admin) rejette les jetons clients
// sur les routes non-@Public (ex. /mobile/conversations) → 401 en boucle côté app
@CustomerRoute()
@UseGuards(CustomerAuthGuard)
export class MobileController {
  constructor(
    private service: MobileService,
    private customersService: CustomersService,
    private push: PushService,
  ) {}

  // ====== AUTH ======

  @Public()
  @Post('auth/register')
  @ApiOperation({ summary: 'Inscription client mobile' })
  async register(
    @Body()
    body: {
      firstName: string;
      lastName: string;
      email: string;
      phone?: string;
      password: string;
    },
  ) {
    return this.service.register(body);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('auth/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Connexion client mobile' })
  async login(@Body() body: { email: string; password: string }) {
    return this.service.login(body.email, body.password);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('auth/otp-request')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Demander un code OTP' })
  async requestOtp(
    @Body() body: { contact: string; mode?: 'phone' | 'email' },
    @Req() req: any,
  ) {
    const ip = req?.ip ?? req?.connection?.remoteAddress ?? '';
    return this.service.requestOtp(body.contact, body.mode, ip);
  }

  @Public()
  @Post('auth/otp-verify')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Vérifier un code OTP' })
  async verifyOtp(
    @Body() body: { contact: string; code: string },
    @Req() req: any,
  ) {
    const ip = req?.ip ?? req?.connection?.remoteAddress ?? '';
    return this.service.verifyOtp(body.contact, body.code, ip);
  }

  @Public()
  @Post('auth/refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rafraîchir le token' })
  async refresh(@Body() body: { refreshToken: string }) {
    return this.service.refreshToken(body.refreshToken);
  }

  @Public()
  @Post('auth/social')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Connexion sociale' })
  async socialLogin(
    @Body()
    body: {
      provider: string;
      email?: string;
      name?: string;
      id?: string;
    },
  ) {
    return this.service.socialLogin(body.provider, body);
  }

  @Public()
  @Post('auth/password-reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Demande de réinitialisation mot de passe' })
  async passwordReset(@Body() body: { email: string }) {
    return this.service.passwordReset(body.email);
  }

  // ====== PROFILE ======

  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Profil client connecté' })
  async getProfile(@CurrentUser() user: any) {
    if (!user?.id) throw new UnauthorizedException('Connexion requise');
    return this.service.getProfile(user.id);
  }

  @Put('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Modifier profil client' })
  async updateProfile(@CurrentUser() user: any, @Body() body: any) {
    if (!user?.id) throw new UnauthorizedException('Connexion requise');
    return this.service.updateProfile(user.id, body);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('profile/avatar')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: join(process.cwd(), 'uploads/avatars'),
        filename: (_req, file, cb) => {
          cb(null, randomFilename(file.originalname));
        },
      }),
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.match(/^image\/(png|jpe?g|webp)$/)) {
          cb(
            new BadRequestException('Format non accepté (png, jpg, webp)'),
            false,
          );
        } else {
          cb(null, true);
        }
      },
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: "Uploader la photo de profil (enregistre et retourne l'URL)",
  })
  async uploadAvatar(
    @CurrentUser() user: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!user?.id) throw new UnauthorizedException('Connexion requise');
    if (!file) throw new BadRequestException('Fichier requis');
    validateFileContent(file.path, 'image/');
    const url = `/uploads/avatars/${file.filename}`;
    await this.service.updateProfile(user.id, { avatar: url });
    return { url };
  }

  // ====== ORDERS ======

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('orders')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Créer une commande depuis le panier' })
  async createOrder(@CurrentUser() user: any, @Body() body: CreateOrderDto) {
    if (!user?.id) throw new UnauthorizedException('Connexion requise');
    return this.service.createOrder(user.id, body);
  }

  // ====== PRODUCTS & CATALOG (format mobile) ======

  @Public()
  @Get('products')
  @ApiOperation({ summary: 'Produits (format mobile)' })
  async products(@Query() query: any) {
    return this.service.getProducts(query);
  }

  @Public()
  @Get('products/:id')
  @ApiOperation({ summary: 'Détail produit (format mobile)' })
  async productById(@Param('id') id: string) {
    return this.service.getProductById(id);
  }

  @Public()
  @Get('products/:id/reviews')
  @ApiOperation({ summary: "Avis clients actifs d'un produit" })
  async productReviews(@Param('id') id: string) {
    return this.service.getProductReviews(id);
  }

  @Post('products/:id/reviews')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Créer/mettre à jour son avis sur un produit' })
  async createProductReview(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() body: { rating: number; title?: string; content?: string },
  ) {
    if (!user?.id) throw new UnauthorizedException('Connexion requise');
    return this.service.createProductReview(user.id, id, body);
  }

  @Public()
  @Get('categories')
  @ApiOperation({ summary: 'Catégories (format mobile)' })
  async categories() {
    return this.service.getCategories();
  }

  @Public()
  @Get('categories/:id/products')
  @ApiOperation({ summary: 'Produits par catégorie (format mobile)' })
  async productsByCategory(@Param('id') id: string) {
    return this.service.getProductsByCategory(id);
  }

  @Public()
  @Get('categories/:id/children')
  @ApiOperation({ summary: "Sous-catégories d'une catégorie (format mobile)" })
  async categoryChildren(@Param('id') id: string) {
    return this.service.getCategoryChildren(id);
  }

  // ====== CONTENT ======

  @Public()
  @Get('banners')
  @ApiOperation({ summary: 'Bannières promotionnelles (filtrées par screen)' })
  async banners(@Query('screen') screen?: string) {
    return this.service.getBanners(screen);
  }

  // PAS @Public : le garde résout le client si un jeton est fourni (likedByMe),
  // et laisse passer sans jeton (handleRequest → null) — feed public + likes corrects.
  @Get('feed')
  @ApiOperation({
    summary:
      'Posts du feed (avec liked par le client connecté si jeton fourni)',
  })
  async feed(@CurrentUser() user: any) {
    return this.service.getFeedPosts(user?.id);
  }

  @Post('feed/:id/like')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Aimer / ne plus aimer une publication du feed' })
  async toggleFeedLike(@CurrentUser() user: any, @Param('id') id: string) {
    if (!user?.id) throw new UnauthorizedException('Connexion requise');
    return this.service.toggleFeedPostLike(id, user.id);
  }

  @Public()
  @Get('suggested-people')
  @ApiOperation({ summary: 'Personnes suggérées' })
  async suggestedPeople() {
    return this.service.getSuggestedPeople();
  }

  @Public()
  @Get('shortcuts')
  @ApiOperation({ summary: 'Raccourcis accueil' })
  async shortcuts() {
    return this.service.getHomeShortcuts();
  }

  @Public()
  @Get('search/trending')
  @ApiOperation({ summary: 'Termes de recherche tendance' })
  async searchTrending() {
    return this.service.getSearchTrending();
  }

  @Public()
  @Get('feed-sections')
  @ApiOperation({
    summary: "Sections de la page d'accueil (configurées par l'admin)",
  })
  async feedSections() {
    return this.service.getFeedSections();
  }

  @Public()
  @Get('shipping-countries')
  @ApiOperation({
    summary:
      'Codes ISO des pays couverts par les zones de livraison actives (admin)',
  })
  async shippingCountries() {
    return this.service.getShippingCountries();
  }

  @Public()
  @Get('shipping-quote')
  @ApiOperation({
    summary: 'Devis de livraison pour le checkout (zone + repli global)',
  })
  async shippingQuote(
    @Query('country') country?: string,
    @Query('subtotal') subtotal?: string,
  ) {
    return this.service.getShippingQuote({
      country,
      subtotal: subtotal ? Number(subtotal) : 0,
    });
  }

  @Public()
  @Get('cart/recommendations')
  @ApiOperation({
    summary:
      "Produits « Vous aimerez aussi » du panier (source choisie par l'admin)",
  })
  async cartRecommendations() {
    return this.service.getCartRecommendations();
  }

  @Public()
  @Get('feed-sections/:id/products')
  @ApiOperation({
    summary: "Tous les produits d'une section (écran « Voir tout »)",
  })
  async feedSectionProducts(@Param('id') id: string) {
    return this.service.getFeedSectionProducts(id);
  }

  @Public()
  @Get('settings')
  @ApiOperation({ summary: 'Paramètres application (branding)' })
  async settings() {
    return this.service.getAppSettings();
  }

  @Public()
  @Get('logos')
  @ApiOperation({ summary: 'Logos application' })
  async logos() {
    return this.service.getLogos();
  }

  @Public()
  @Get('social-links')
  @ApiOperation({ summary: 'Liens réseaux sociaux' })
  async socialLinks() {
    return this.service.getSocialLinks();
  }

  @Public()
  @Get('seo')
  @ApiOperation({ summary: 'Méta-données SEO' })
  async seo() {
    return this.service.getSEOMetadata();
  }

  @Public()
  @Get('static-pages')
  @ApiOperation({
    summary: "Liste des pages d'information publiées (gérées par l'admin)",
  })
  async staticPagesList() {
    return this.service.listStaticPages();
  }

  @Public()
  @Get('static-pages/:slug')
  @ApiOperation({
    summary: 'Page statique par slug (CGU, mentions légales, etc.)',
  })
  async staticPageBySlug(@Param('slug') slug: string) {
    return this.service.getStaticPageBySlug(slug);
  }

  // ====== SEARCH ======

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('search/by-image')
  @ApiOperation({ summary: 'Recherche par image (MVP heuristique)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: join(process.cwd(), 'uploads', 'search'),
        filename: (_req, file, cb) => {
          cb(null, randomFilename(file.originalname));
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const allowed = /jpeg|jpg|png|webp|gif/;
        const ok =
          allowed.test(extname(file.originalname).toLowerCase()) &&
          allowed.test(file.mimetype);
        cb(
          ok
            ? null
            : new Error('Seules les images JPEG/PNG/WebP sont acceptées'),
          ok,
        );
      },
    }),
  )
  async searchByImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Fichier requis');
    validateFileContent(file.path, 'image/');
    return this.service.searchByImage(file.path);
  }

  // ====== PAYMENT ======

  @Public()
  @Get('payment/methods')
  @ApiOperation({ summary: 'Méthodes de paiement' })
  async paymentMethods() {
    return this.service.getPaymentMethods();
  }

  @Public()
  @Get('payment/card-brands')
  @ApiOperation({ summary: 'Marques de cartes acceptées' })
  async cardBrands() {
    return this.service.getCardBrands();
  }

  // ====== STORES ======

  @Public()
  @Get('stores')
  @ApiOperation({ summary: 'Boutiques actives (format mobile)' })
  async stores(@Query('limit') limit?: string) {
    return this.service.getStores({
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('stores/followed')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Boutiques suivies par le client connecté' })
  async followedStores(@CurrentUser() user: any) {
    if (!user?.id) return [];
    return this.service.getFollowedStores(user.id);
  }

  @Post('stores/:id/follow')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Suivre une boutique' })
  async followStore(@CurrentUser() user: any, @Param('id') id: string) {
    if (!user?.id) throw new UnauthorizedException('Connexion requise');
    return this.service.followStore(user.id, id);
  }

  @Post('stores/:id/unfollow')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Ne plus suivre une boutique' })
  async unfollowStore(@CurrentUser() user: any, @Param('id') id: string) {
    if (!user?.id) throw new UnauthorizedException('Connexion requise');
    return this.service.unfollowStore(user.id, id);
  }

  // ====== COUPONS ======

  @Public()
  @Get('coupons')
  @ApiOperation({ summary: 'Coupons actifs' })
  async activeCoupons() {
    return this.service.getActiveCoupons();
  }

  @Get('coupons/history')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Coupons déjà utilisés par le client connecté' })
  async couponHistory(@CurrentUser() user: any) {
    if (!user) throw new UnauthorizedException();
    return this.service.getCouponHistory(user.id);
  }

  @Public()
  @Get('feature-flags')
  @ApiOperation({ summary: 'Feature flags' })
  async featureFlags() {
    return this.service.getFeatureFlags();
  }

  @Get('conversations')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Conversations du client connecté' })
  async getConversations(@CurrentUser() user: any) {
    // Sans session cliente valide : aucune conversation (évite user.id sur null → 500)
    if (!user?.id) return [];
    return this.service.getCustomerConversations(user.id);
  }

  // ====== ADRESSES DE LIVRAISON ======
  // Le client connecté ne manipule que SES adresses (user.id du jeton, jamais un id du chemin).

  @Get('addresses')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Adresses du client connecté' })
  async listMyAddresses(@CurrentUser() user: any) {
    if (!user?.id) throw new UnauthorizedException('Connexion requise');
    return this.customersService.listAddresses(user.id);
  }

  @Post('addresses')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Ajouter une adresse' })
  async createMyAddress(@CurrentUser() user: any, @Body() body: any) {
    if (!user?.id) throw new UnauthorizedException('Connexion requise');
    return this.customersService.createAddress(user.id, body);
  }

  @Put('addresses/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Modifier une adresse' })
  async updateMyAddress(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    if (!user?.id) throw new UnauthorizedException('Connexion requise');
    return this.customersService.updateAddress(id, user.id, body);
  }

  @Put('addresses/:id/default')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Définir une adresse par défaut' })
  async setMyDefaultAddress(@CurrentUser() user: any, @Param('id') id: string) {
    if (!user?.id) throw new UnauthorizedException('Connexion requise');
    return this.customersService.setDefaultAddress(id, user.id);
  }

  @Delete('addresses/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Supprimer une adresse' })
  async deleteMyAddress(@CurrentUser() user: any, @Param('id') id: string) {
    if (!user?.id) throw new UnauthorizedException('Connexion requise');
    return this.customersService.deleteAddress(id, user.id);
  }

  // ====== PORTEFEUILLE ======

  @Get('wallet')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Portefeuille du client (points de fidélité)' })
  async getWallet(@CurrentUser() user: any) {
    if (!user?.id)
      return { balance: 0, lifetime: 0, tier: 'bronze', totalSavings: 0 };
    return this.service.getWallet(user.id);
  }

  // ====== NOTIFICATIONS PUSH ======
  // Enregistrement/retrait du jeton Expo Push de l'appareil du client connecté.

  @Post('push-token')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Enregistrer le jeton push de l'appareil" })
  async registerPushToken(
    @CurrentUser() user: any,
    @Body() body: { token: string; platform?: string },
  ) {
    if (!user?.id) throw new UnauthorizedException('Connexion requise');
    if (!body?.token) throw new BadRequestException('token requis');
    await this.push.registerToken(user.id, body.token, body.platform);
    return { ok: true };
  }

  @Delete('push-token')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Retirer le jeton push (déconnexion)' })
  async removePushToken(
    @CurrentUser() user: any,
    @Query('token') token?: string,
  ) {
    if (!user?.id) throw new UnauthorizedException('Connexion requise');
    if (token) await this.push.removeToken(token);
    return { ok: true };
  }

  @Post('suggestions')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Envoyer une suggestion client' })
  async submitSuggestion(
    @CurrentUser() user: any,
    @Body() body: { content: string },
  ) {
    if (!body?.content?.trim()) throw new BadRequestException('content requis');
    return this.service.submitSuggestion(user?.id ?? null, body.content.trim());
  }
}
