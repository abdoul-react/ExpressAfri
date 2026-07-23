import { Controller, Get, Post, Put, Delete, Param, Query, Body, UseGuards, UseInterceptors, UploadedFile, BadRequestException, HttpCode, HttpStatus, ParseUUIDPipe } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { diskStorage } from 'multer'
import { extname, join } from 'path'
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger'
import { ContentService } from './content.service'
import { CreateBannerDto, UpdateBannerDto, CreateFeedSectionDto, UpdateFeedSectionDto, ReorderDto } from './content.dto'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { Public } from '../../common/decorators/public.decorator'

@ApiTags('Content')
@Controller('content')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ContentController {
  constructor(private service: ContentService) {}

  // ── Summary ──
  @Get('summary')
  @ApiOperation({ summary: 'Résumé du contenu' })
  async getSummary() { return this.service.getSummary() }

  // ── Banners ──
  @Get('banners')
  @ApiOperation({ summary: 'Liste des bannières' })
  async listBanners() { return this.service.listBanners() }

  @Get('banners/:id')
  @ApiOperation({ summary: 'Détail bannière' })
  async getBannerById(@Param('id', ParseUUIDPipe) id: string) { return this.service.getBannerById(id) }

  @Post('banners')
  @ApiOperation({ summary: 'Créer une bannière' })
  async createBanner(@Body() body: CreateBannerDto) { return this.service.createBanner(body) }

  @Put('banners/:id')
  @ApiOperation({ summary: 'Modifier une bannière' })
  async updateBanner(@Param('id', ParseUUIDPipe) id: string, @Body() body: UpdateBannerDto) { return this.service.updateBanner(id, body) }

  @Delete('banners/:id')
  @ApiOperation({ summary: 'Supprimer une bannière' })
  async deleteBanner(@Param('id', ParseUUIDPipe) id: string) { return this.service.deleteBanner(id) }

  @Post('banners/upload')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: join(process.cwd(), 'uploads/banners'),
      filename: (_req, file, cb) => {
        const name = file.originalname.replace(extname(file.originalname), '').replace(/[^a-z0-9]/gi, '_').toLowerCase()
        cb(null, `${name}_${Date.now()}${extname(file.originalname)}`)
      },
    }),
    fileFilter: (_req, file, cb) => {
      if (!file.mimetype.match(/^image\/(png|jpe?g|webp|gif)$/)) {
        // SVG interdit : risque XSS stored (le fichier est servi sur la même origine que le token admin)
        cb(new BadRequestException('Format non accepté (png, jpg, webp, gif) — SVG interdit pour raison de sécurité'), false)
      } else { cb(null, true) }
    },
    limits: { fileSize: 5 * 1024 * 1024 },
  }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Uploader une image de bannière (retourne l\'URL à utiliser dans imageUrl)' })
  async uploadBannerImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Fichier requis')
    return { url: `/uploads/banners/${file.filename}` }
  }

  // ── Content Blocks ──
  @Get('blocks')
  @ApiOperation({ summary: 'Liste des blocs de contenu' })
  async listContentBlocks(@Query('group') group?: string) { return this.service.listContentBlocks(group) }

  @Get('blocks/:id')
  @ApiOperation({ summary: 'Détail bloc' })
  async getContentBlock(@Param('id') id: string) { return this.service.getContentBlock(id) }

  @Put('blocks/:id')
  @ApiOperation({ summary: 'Modifier un bloc' })
  async updateContentBlock(@Param('id') id: string, @Body() body: { value: string }) { return this.service.updateContentBlock(id, body.value) }

  @Get('groups')
  @ApiOperation({ summary: 'Groupes de blocs' })
  async getContentGroups() { return this.service.getContentGroups() }

  // ── Static Pages ──
  @Get('pages')
  @ApiOperation({ summary: 'Liste des pages statiques' })
  async listStaticPages() { return this.service.listStaticPages() }

  @Get('pages/:id')
  @ApiOperation({ summary: 'Détail page' })
  async getStaticPage(@Param('id') id: string) { return this.service.getStaticPage(id) }

  @Put('pages/:id')
  @ApiOperation({ summary: 'Modifier page' })
  async updateStaticPage(@Param('id') id: string, @Body() body: any) { return this.service.updateStaticPage(id, body) }

  @Post('pages')
  @ApiOperation({ summary: 'Créer une page (informations légales, conditions…)' })
  async createStaticPage(@Body() body: any) { return this.service.createStaticPage(body) }

  @Delete('pages/:id')
  @ApiOperation({ summary: 'Supprimer une page' })
  async deleteStaticPage(@Param('id') id: string) { return this.service.deleteStaticPage(id) }

  // ── App Settings ──
  @Get('settings')
  @ApiOperation({ summary: 'Paramètres application' })
  async getAppSettings() { return this.service.getAppSettings() }

  @Put('settings/:key')
  @ApiOperation({ summary: 'Mettre à jour un paramètre' })
  async updateAppSetting(@Param('key') key: string, @Body() body: { value: string }) { return this.service.updateAppSetting(key, body.value) }

  // ── Logos ──
  @Get('logos')
  @ApiOperation({ summary: 'Liste des logos' })
  async listLogos() { return this.service.listLogos() }

  @Put('logos/:id')
  @ApiOperation({ summary: 'Modifier un logo (URL)' })
  async updateLogo(@Param('id') id: string, @Body() body: { url: string }) { return this.service.updateLogo(id, body.url) }

  @Post('logos/:id/upload')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: join(process.cwd(), 'uploads/logos'),
      filename: (_req, file, cb) => {
        const name = file.originalname.replace(extname(file.originalname), '').replace(/[^a-z0-9]/gi, '_').toLowerCase()
        cb(null, `${name}_${Date.now()}${extname(file.originalname)}`)
      },
    }),
    fileFilter: (_req, file, cb) => {
      if (!file.mimetype.match(/^image\/(png|jpe?g|webp|gif|ico)$/)) {
        // SVG interdit : risque XSS stored (le fichier est servi sur la même origine que le token admin)
        cb(new BadRequestException('Format non accepté (png, jpg, webp, gif, ico) — SVG interdit pour raison de sécurité'), false)
      } else { cb(null, true) }
    },
    limits: { fileSize: 5 * 1024 * 1024 },
  }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Uploader un logo (fichier)' })
  async uploadLogo(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Fichier requis')
    const url = `/uploads/logos/${file.filename}`
    return this.service.updateLogo(id, url)
  }

  // ── Feed Posts (publications Inspiration) ──
  @Get('feed-posts')
  @ApiOperation({ summary: 'Publications du fil Inspiration' })
  async listFeedPosts() { return this.service.listFeedPosts() }

  @Post('feed-posts')
  @ApiOperation({ summary: 'Créer une publication' })
  async createFeedPost(@Body() body: any) { return this.service.createFeedPost(body) }

  @Put('feed-posts/:id')
  @ApiOperation({ summary: 'Modifier une publication' })
  async updateFeedPost(@Param('id', ParseUUIDPipe) id: string, @Body() body: any) { return this.service.updateFeedPost(id, body) }

  @Delete('feed-posts/:id')
  @ApiOperation({ summary: 'Supprimer une publication' })
  async deleteFeedPost(@Param('id', ParseUUIDPipe) id: string) { return this.service.deleteFeedPost(id) }

  @Post('feed-posts/upload')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: join(process.cwd(), 'uploads/feed'),
      filename: (_req, file, cb) => {
        const name = file.originalname.replace(extname(file.originalname), '').replace(/[^a-z0-9]/gi, '_').toLowerCase()
        cb(null, `${name}_${Date.now()}${extname(file.originalname)}`)
      },
    }),
    fileFilter: (_req, file, cb) => {
      if (!file.mimetype.match(/^(image\/(png|jpe?g|webp|gif)|video\/(mp4|webm|quicktime))$/)) {
        cb(new BadRequestException('Format non accepté (image png/jpg/webp/gif ou vidéo mp4/webm/mov)'), false)
      } else { cb(null, true) }
    },
    limits: { fileSize: 100 * 1024 * 1024 },
  }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Uploader le média d\'une publication (image ou vidéo)' })
  async uploadFeedMedia(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Fichier requis')
    const url = `/uploads/feed/${file.filename}`
    const mediaType = file.mimetype.startsWith('video/') ? 'video' : 'image'
    return { url, mediaType }
  }

  // ── Feed Sections ──
  @Get('feed-sections')
  @ApiOperation({ summary: 'Sections du feed' })
  async listFeedSections() { return this.service.listFeedSections() }

  @Post('feed-sections')
  @ApiOperation({ summary: 'Créer une section' })
  async createFeedSection(@Body() body: CreateFeedSectionDto) { return this.service.createFeedSection(body) }

  // Route statique déclarée AVANT feed-sections/:id, sinon "reorder" est capturé comme un id
  @Put('feed-sections/reorder')
  @ApiOperation({ summary: 'Réordonner les sections' })
  async reorderFeedSections(@Body() body: ReorderDto) { return this.service.reorderFeedSections(body.ids) }

  @Put('feed-sections/:id')
  @ApiOperation({ summary: 'Modifier section' })
  async updateFeedSection(@Param('id', ParseUUIDPipe) id: string, @Body() body: UpdateFeedSectionDto) { return this.service.updateFeedSection(id, body) }

  @Delete('feed-sections/:id')
  @ApiOperation({ summary: 'Supprimer section' })
  async deleteFeedSection(@Param('id', ParseUUIDPipe) id: string) { return this.service.deleteFeedSection(id) }

  // ── Feature Flags ──
  @Get('feature-flags')
  @ApiOperation({ summary: 'Feature flags' })
  async listFeatureFlags() { return this.service.listFeatureFlags() }

  @Put('feature-flags/:key')
  @ApiOperation({ summary: 'Activer/désactiver' })
  async toggleFeatureFlag(@Param('key') key: string, @Body() body: { enabled: boolean }) { return this.service.toggleFeatureFlag(key, body.enabled) }

  // ── Social Links ──
  @Get('social-links')
  @ApiOperation({ summary: 'Réseaux sociaux' })
  async listSocialLinks() { return this.service.listSocialLinks() }

  @Put('social-links/:platform')
  @ApiOperation({ summary: 'Modifier lien social' })
  async updateSocialLink(@Param('platform') platform: string, @Body() body: any) { return this.service.updateSocialLink(platform, body) }

  // ── SEO ──
  @Get('seo')
  @ApiOperation({ summary: 'Méta SEO' })
  async listSEOMetadata() { return this.service.listSEOMetadata() }

  @Put('seo/:page')
  @ApiOperation({ summary: 'Modifier SEO' })
  async updateSEOMetadata(@Param('page') page: string, @Body() body: any) { return this.service.updateSEOMetadata(page, body) }

  // ── Payment Methods ──
  @Get('payment-methods')
  @ApiOperation({ summary: 'Moyens de paiement' })
  async listPaymentMethods() { return this.service.listPaymentMethods() }

  @Get('payment-methods/:id')
  @ApiOperation({ summary: 'Détail moyen paiement' })
  async getPaymentMethod(@Param('id') id: string) { return this.service.getPaymentMethod(id) }

  @Post('payment-methods')
  @ApiOperation({ summary: 'Créer moyen paiement' })
  async createPaymentMethod(@Body() body: any) { return this.service.createPaymentMethod(body) }

  @Put('payment-methods/:id')
  @ApiOperation({ summary: 'Modifier moyen paiement' })
  async updatePaymentMethod(@Param('id') id: string, @Body() body: any) { return this.service.updatePaymentMethod(id, body) }

  @Delete('payment-methods/:id')
  @ApiOperation({ summary: 'Supprimer moyen paiement' })
  async deletePaymentMethod(@Param('id') id: string) { return this.service.deletePaymentMethod(id) }

  @Post('payment-methods/:id/logo')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: join(process.cwd(), 'uploads/payment-logos'),
      filename: (_req, file, cb) => {
        const name = file.originalname.replace(extname(file.originalname), '').replace(/[^a-z0-9]/gi, '_').toLowerCase()
        cb(null, `${name}_${Date.now()}${extname(file.originalname)}`)
      },
    }),
    fileFilter: (_req, file, cb) => {
      if (!file.mimetype.match(/^image\/(png|jpe?g|webp|gif|ico)$/)) {
        cb(new BadRequestException('Format non accepté (png, jpg, webp, gif, ico)'), false)
      } else { cb(null, true) }
    },
    limits: { fileSize: 5 * 1024 * 1024 },
  }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Uploader le logo d\'un moyen de paiement' })
  async uploadPaymentMethodLogo(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Fichier requis')
    const url = `/uploads/payment-logos/${file.filename}`
    return this.service.updatePaymentMethod(id, { logoUrl: url })
  }

  // ── Shortcuts (Raccourcis accueil) ──
  @Get('shortcuts')
  @ApiOperation({ summary: 'Liste des raccourcis' })
  async listShortcuts() { return this.service.listShortcuts() }

  @Post('shortcuts')
  @ApiOperation({ summary: 'Créer un raccourci (avec destination optionnelle)' })
  async createShortcut(@Body() body: { label: string; icon: string; target?: { type: string; value: string } | null }) { return this.service.createShortcut(body) }

  @Put('shortcuts/reorder')
  @ApiOperation({ summary: 'Réordonner les raccourcis' })
  async reorderShortcuts(@Body() body: { ids: string[] }) { return this.service.reorderShortcuts(body.ids) }

  @Put('shortcuts/:id')
  @ApiOperation({ summary: 'Modifier un raccourci' })
  async updateShortcut(@Param('id') id: string, @Body() body: { label?: string; icon?: string; isActive?: boolean; target?: { type: string; value: string } | null }) { return this.service.updateShortcut(id, body) }

  @Delete('shortcuts/:id')
  @ApiOperation({ summary: 'Supprimer un raccourci' })
  async deleteShortcut(@Param('id') id: string) { return this.service.deleteShortcut(id) }

  // ── Legacy (old /content used only for blocks — keep for backward compat) ──
  @Get()
  @ApiOperation({ summary: '[DEPRECATED] Liste des blocs (legacy)' })
  async legacyListBlocks(@Query() query: any) { return this.service.listContentBlocks(query.group) }

  @Get(':id')
  @ApiOperation({ summary: '[DEPRECATED] Détail bloc (legacy)' })
  async legacyGetBlock(@Param('id') id: string) { return this.service.getContentBlock(id) }

  @Post()
  @ApiOperation({ summary: '[DEPRECATED] Créer bloc (legacy)' })
  async legacyCreateBlock(@Body() body: any) { return this.service.createContentBlock(body) }

  @Put(':id')
  @ApiOperation({ summary: '[DEPRECATED] Modifier bloc (legacy)' })
  async legacyUpdateBlock(@Param('id') id: string, @Body() body: any) { return this.service.updateContentBlock(id, body.value) }

  @Delete(':id')
  @ApiOperation({ summary: '[DEPRECATED] Supprimer bloc (legacy)' })
  async legacyDeleteBlock(@Param('id') id: string) { return this.service.deleteContentBlock(id) }
}
