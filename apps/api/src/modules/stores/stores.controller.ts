import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  ForbiddenException,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import {
  randomFilename,
  validateFileContent,
} from '../../common/upload/upload.helper';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiQuery,
} from '@nestjs/swagger';
import { StoresService } from './stores.service';
import { StorePaymentMethodsService } from './store-payment-methods.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard, userHasPermission } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Stores')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('stores')
export class StoresController {
  constructor(
    private service: StoresService,
    private payments: StorePaymentMethodsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Liste des boutiques' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'status', required: false })
  async list(@Query() query: any, @CurrentUser() user: any) {
    // Gérant de boutique : la liste ne contient que SA boutique
    if (user?.storeId) {
      const store = await this.service.getById(user.storeId);
      return { data: store ? [store] : [], total: store ? 1 : 0, page: 1 };
    }
    if (!userHasPermission(user, 'stores.read')) {
      throw new ForbiddenException('Permission insuffisante');
    }
    return this.service.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail boutique' })
  async getById(@Param('id') id: string, @CurrentUser() user: any) {
    this.assertStoreAccess(user, id, 'stores.read');
    return this.service.getById(id);
  }

  @Post()
  @UseGuards(PermissionsGuard)
  @Permissions('stores.create')
  @ApiOperation({ summary: 'Créer boutique' })
  async create(@Body() body: any, @CurrentUser() user: any) {
    if (user?.storeId)
      throw new ForbiddenException('Un gérant ne peut pas créer de boutique');
    return this.service.create(body);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Modifier boutique' })
  async update(
    @Param('id') id: string,
    @Body() body: any,
    @CurrentUser() user: any,
  ) {
    this.assertStoreAccess(user, id, 'stores.update');
    if (user?.storeId) {
      // Un gérant ne change ni le statut ni la commission de sa boutique
      const { status: _s, commissionRate: _c, ...allowed } = body ?? {};
      return this.service.update(id, allowed);
    }
    return this.service.update(id, body);
  }

  @Delete(':id')
  @UseGuards(PermissionsGuard)
  @Permissions('stores.delete')
  @ApiOperation({ summary: 'Supprimer une boutique' })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    if (user?.storeId)
      throw new ForbiddenException('Un gérant ne peut pas supprimer une boutique');
    return this.service.delete(id);
  }

  @Patch(':id/status')
  @UseGuards(PermissionsGuard)
  @Permissions('stores.manage')
  @ApiOperation({ summary: 'Changer le statut d\'une boutique' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { status: string },
    @CurrentUser() user: any,
  ) {
    if (user?.storeId)
      throw new ForbiddenException("Réservé à l'équipe AfriExpress");
    return this.service.update(id, { status: body.status });
  }

  // ====== GÉRANTS ======
  // Réservé à la plateforme : un gérant ne gère pas les comptes gérants.

  @Get(':id/managers')
  @ApiOperation({ summary: 'Gérants de la boutique' })
  async listManagers(@Param('id') id: string, @CurrentUser() user: any) {
    if (user?.storeId)
      throw new ForbiddenException("Réservé à l'équipe AfriExpress");
    return this.service.listManagers(id);
  }

  @Post(':id/managers')
  @ApiOperation({ summary: 'Créer un compte gérant pour la boutique' })
  async createManager(
    @Param('id') id: string,
    @Body() body: { email: string; name: string; password: string },
    @CurrentUser() user: any,
  ) {
    if (user?.storeId)
      throw new ForbiddenException("Réservé à l'équipe AfriExpress");
    return this.service.createManager(id, body);
  }

  @Put(':id/managers/:managerId/active')
  @ApiOperation({ summary: 'Activer/désactiver un gérant' })
  async setManagerActive(
    @Param('id') id: string,
    @Param('managerId') managerId: string,
    @Body() body: { isActive: boolean },
    @CurrentUser() user: any,
  ) {
    if (user?.storeId)
      throw new ForbiddenException("Réservé à l'équipe AfriExpress");
    return this.service.setManagerActive(id, managerId, body.isActive);
  }

  @Put(':id/managers/:managerId/password')
  @ApiOperation({ summary: "Réinitialiser le mot de passe d'un gérant" })
  async resetManagerPassword(
    @Param('id') id: string,
    @Param('managerId') managerId: string,
    @Body() body: { password: string },
    @CurrentUser() user: any,
  ) {
    if (user?.storeId)
      throw new ForbiddenException("Réservé à l'équipe AfriExpress");
    return this.service.resetManagerPassword(id, managerId, body.password);
  }

  // ====== MÉDIAS (logo, cover, galerie) ======
  // Le gérant gère les médias de SA boutique uniquement.

  /**
   * Autorise une écriture sur les ressources d'une boutique (médias, sections,
   * moyens de paiement).
   *
   * Deux profils légitimes, et deux seulement :
   *  - le gérant rattaché à CETTE boutique ;
   *  - un admin plateforme (sans storeId) disposant de la permission demandée.
   *
   * Le rôle « Gérant de boutique » ne porte aucune permission `stores.*` : on
   * ne peut donc pas se reposer sur `@Permissions` seul sans lui fermer l'accès
   * à sa propre vitrine.
   */
  private assertStoreAccess(
    user: any,
    storeId: string,
    permission: 'stores.read' | 'stores.update',
  ) {
    if (user?.storeId) {
      if (user.storeId !== storeId) {
        throw new ForbiddenException('Vous ne gérez pas cette boutique');
      }
      return;
    }
    if (!userHasPermission(user, permission)) {
      throw new ForbiddenException('Permission insuffisante');
    }
  }

  @Get(':id/media')
  @ApiOperation({ summary: 'Médias de la boutique' })
  async listMedia(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    this.assertStoreAccess(user, id, 'stores.read');
    return this.service.listMedia(id);
  }

  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Post(':id/media')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const dir = join(process.cwd(), 'uploads/stores');
          if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
          cb(null, dir);
        },
        filename: (_req, file, cb) => {
          cb(null, randomFilename(file.originalname));
        },
      }),
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.match(/^image\/(png|jpe?g|webp|gif)$/)) {
          cb(
            new BadRequestException(
              'Format non accepté (png, jpg, webp, gif) — SVG interdit pour raison de sécurité',
            ),
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
  @ApiOperation({ summary: 'Uploader un média (logo | cover | gallery)' })
  async uploadMedia(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { type?: string; alt?: string },
    @CurrentUser() user: any,
  ) {
    this.assertStoreAccess(user, id, 'stores.update');
    if (!file) throw new BadRequestException('Fichier requis');
    validateFileContent(file.path, 'image/');
    const url = `/uploads/stores/${file.filename}`;
    return this.service.addMedia(id, {
      type: body?.type ?? 'gallery',
      url,
      alt: body?.alt,
    });
  }

  @Put(':id/media/reorder')
  @ApiOperation({ summary: 'Réordonner la galerie' })
  async reorderMedia(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { ids: string[] },
    @CurrentUser() user: any,
  ) {
    this.assertStoreAccess(user, id, 'stores.update');
    return this.service.reorderMedia(id, body?.ids ?? []);
  }

  @Delete(':id/media/:mediaId')
  @ApiOperation({ summary: 'Supprimer un média' })
  async deleteMedia(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('mediaId', ParseUUIDPipe) mediaId: string,
    @CurrentUser() user: any,
  ) {
    this.assertStoreAccess(user, id, 'stores.update');
    return this.service.deleteMedia(id, mediaId);
  }

  // ====== SECTIONS DE CATALOGUE ======
  // Le gérant compose les sections de SA boutique et choisit leur format.

  @Get(':id/sections')
  @ApiOperation({ summary: 'Sections de catalogue de la boutique' })
  async listSections(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    this.assertStoreAccess(user, id, 'stores.read');
    return this.service.listSections(id);
  }

  @Post(':id/sections')
  @ApiOperation({ summary: 'Créer une section' })
  async createSection(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { title?: string; subtitle?: string; layout?: string },
    @CurrentUser() user: any,
  ) {
    this.assertStoreAccess(user, id, 'stores.update');
    return this.service.createSection(id, body ?? {});
  }

  // Déclarée AVANT ':id/sections/:sectionId' : sinon Nest capterait
  // « reorder » comme un sectionId.
  @Put(':id/sections/reorder')
  @ApiOperation({ summary: 'Réordonner les sections' })
  async reorderSections(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { ids: string[] },
    @CurrentUser() user: any,
  ) {
    this.assertStoreAccess(user, id, 'stores.update');
    return this.service.reorderSections(id, body?.ids ?? []);
  }

  @Put(':id/sections/:sectionId')
  @ApiOperation({ summary: 'Modifier une section' })
  async updateSection(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
    @Body() body: any,
    @CurrentUser() user: any,
  ) {
    this.assertStoreAccess(user, id, 'stores.update');
    return this.service.updateSection(id, sectionId, body ?? {});
  }

  @Delete(':id/sections/:sectionId')
  @ApiOperation({ summary: 'Supprimer une section' })
  async deleteSection(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
    @CurrentUser() user: any,
  ) {
    this.assertStoreAccess(user, id, 'stores.update');
    return this.service.deleteSection(id, sectionId);
  }

  @Get(':id/sections/:sectionId/items')
  @ApiOperation({ summary: 'Produits affectés à la section' })
  async listSectionItems(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
    @CurrentUser() user: any,
  ) {
    this.assertStoreAccess(user, id, 'stores.read');
    return this.service.listSectionItems(id, sectionId);
  }

  @Post(':id/sections/:sectionId/items')
  @ApiOperation({ summary: 'Affecter des produits à la section' })
  async addSectionItems(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
    @Body() body: { productIds?: string[] },
    @CurrentUser() user: any,
  ) {
    this.assertStoreAccess(user, id, 'stores.update');
    return this.service.addSectionItems(id, sectionId, body?.productIds ?? []);
  }

  @Put(':id/sections/:sectionId/items/reorder')
  @ApiOperation({ summary: 'Réordonner les produits de la section' })
  async reorderSectionItems(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
    @Body() body: { ids: string[] },
    @CurrentUser() user: any,
  ) {
    this.assertStoreAccess(user, id, 'stores.update');
    return this.service.reorderSectionItems(id, sectionId, body?.ids ?? []);
  }

  @Delete(':id/sections/:sectionId/items/:itemId')
  @ApiOperation({ summary: 'Retirer un produit de la section' })
  async removeSectionItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @CurrentUser() user: any,
  ) {
    this.assertStoreAccess(user, id, 'stores.update');
    return this.service.removeSectionItem(id, sectionId, itemId);
  }

  // ====== MOYENS DE PAIEMENT ======
  // Cloisonnés au boutiquier : lui seul décide de ce qu'il accepte, et il ne
  // voit jamais la configuration d'une autre boutique. L'admin central se
  // borne à alimenter le catalogue de providers (`payment_methods`), qui
  // délimite ce qui peut être activé ici.

  @Get(':id/payment-methods/catalog')
  @ApiOperation({ summary: 'Providers de paiement proposés par la plateforme' })
  async paymentCatalog(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    this.assertStoreAccess(user, id, 'stores.read');
    return this.payments.catalog();
  }

  @Get(':id/payment-methods')
  @ApiOperation({ summary: 'Moyens de paiement de la boutique' })
  async listPaymentMethods(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    this.assertStoreAccess(user, id, 'stores.read');
    return this.payments.list(id);
  }

  @Post(':id/payment-methods')
  @ApiOperation({ summary: 'Activer un moyen de paiement' })
  async createPaymentMethod(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: any,
    @CurrentUser() user: any,
  ) {
    this.assertStoreAccess(user, id, 'stores.update');
    return this.payments.create(id, body ?? {}, user);
  }

  // Déclarée AVANT ':id/payment-methods/:methodId' : sinon Nest capterait
  // « reorder » comme un methodId.
  @Put(':id/payment-methods/reorder')
  @ApiOperation({ summary: "Réordonner les moyens de paiement" })
  async reorderPaymentMethods(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { ids?: string[] },
    @CurrentUser() user: any,
  ) {
    this.assertStoreAccess(user, id, 'stores.update');
    return this.payments.reorder(id, body?.ids ?? []);
  }

  @Put(':id/payment-methods/:methodId')
  @ApiOperation({ summary: 'Modifier un moyen de paiement' })
  async updatePaymentMethod(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('methodId', ParseUUIDPipe) methodId: string,
    @Body() body: any,
    @CurrentUser() user: any,
  ) {
    this.assertStoreAccess(user, id, 'stores.update');
    return this.payments.update(id, methodId, body ?? {}, user);
  }

  @Delete(':id/payment-methods/:methodId')
  @ApiOperation({ summary: 'Supprimer un moyen de paiement' })
  async deletePaymentMethod(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('methodId', ParseUUIDPipe) methodId: string,
    @CurrentUser() user: any,
  ) {
    this.assertStoreAccess(user, id, 'stores.update');
    return this.payments.remove(id, methodId, user);
  }

  @Post(':id/payment-methods/:methodId/validate')
  @ApiOperation({ summary: 'Vérifier la configuration du moyen de paiement' })
  async validatePaymentMethod(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('methodId', ParseUUIDPipe) methodId: string,
    @CurrentUser() user: any,
  ) {
    this.assertStoreAccess(user, id, 'stores.update');
    return this.payments.validate(id, methodId, user);
  }

  @Get(':id/kyc')
  @ApiOperation({ summary: 'Documents KYC de la boutique' })
  async getKyc(@Param('id') id: string, @CurrentUser() user: any) {
    this.assertStoreAccess(user, id, 'stores.read');
    return this.service.getKyc(id);
  }

  // Le gérant dépose ses justificatifs ; il ne prononce jamais la décision.
  @Put(':id/kyc')
  @ApiOperation({ summary: 'Mettre à jour les documents KYC' })
  async upsertKyc(
    @Param('id') id: string,
    @Body() body: any,
    @CurrentUser() user: any,
  ) {
    this.assertStoreAccess(user, id, 'stores.update');
    return this.service.upsertKyc(id, body);
  }

  @Put(':id/kyc/approve')
  @UseGuards(PermissionsGuard)
  @Permissions('stores.approve')
  @ApiOperation({ summary: 'Approuver KYC' })
  async approveKyc(@Param('id') id: string, @CurrentUser() user: any) {
    if (user?.storeId)
      throw new ForbiddenException("Réservé à l'équipe AfriExpress");
    return this.service.approveKyc(id, user.id);
  }

  @Put(':id/kyc/reject')
  @UseGuards(PermissionsGuard)
  @Permissions('stores.reject')
  @ApiOperation({ summary: 'Rejeter KYC' })
  async rejectKyc(@Param('id') id: string, @Body() body: { reason?: string }, @CurrentUser() user: any) {
    if (user?.storeId)
      throw new ForbiddenException("Réservé à l'équipe AfriExpress");
    return this.service.rejectKyc(id, user.id, body.reason);
  }
}
