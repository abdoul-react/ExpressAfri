import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  ForbiddenException,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { StoreGroupsService } from './store-groups.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

/**
 * Sections de la liste des boutiques — administration centrale uniquement.
 *
 * Le cloisonnement est ici l'inverse de celui du reste du module : au lieu de
 * borner les requêtes sur `user.storeId`, on refuse purement et simplement
 * l'accès dès que ce champ est présent. Un gérant de boutique n'a pas à décider
 * dans quelle vitrine sa boutique apparaît, ni à voir celles des concurrents.
 */
@ApiTags('Store groups')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('store-groups')
export class StoreGroupsController {
  constructor(private service: StoreGroupsService) {}

  private assertCentralAdmin(user: any) {
    if (user?.storeId) {
      throw new ForbiddenException(
        "Les sections de la vitrine relèvent de l'administration centrale",
      );
    }
  }

  @Get()
  @Permissions('stores.read')
  @ApiOperation({ summary: 'Sections de la liste des boutiques' })
  async list(@CurrentUser() user: any) {
    this.assertCentralAdmin(user);
    return this.service.list();
  }

  @Post()
  @Permissions('stores.manage')
  @ApiOperation({ summary: 'Créer une section de vitrine' })
  async create(
    @Body() body: { title?: string; subtitle?: string; icon?: string },
    @CurrentUser() user: any,
  ) {
    this.assertCentralAdmin(user);
    return this.service.create(body ?? {});
  }

  // Déclarée AVANT ':groupId' : sinon Nest capterait « reorder » comme un id.
  @Put('reorder')
  @Permissions('stores.manage')
  @ApiOperation({ summary: 'Réordonner les sections' })
  async reorder(@Body() body: { ids?: string[] }, @CurrentUser() user: any) {
    this.assertCentralAdmin(user);
    return this.service.reorder(body?.ids ?? []);
  }

  @Put(':groupId')
  @Permissions('stores.manage')
  @ApiOperation({ summary: 'Modifier une section' })
  async update(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Body() body: any,
    @CurrentUser() user: any,
  ) {
    this.assertCentralAdmin(user);
    return this.service.update(groupId, body ?? {});
  }

  @Delete(':groupId')
  @Permissions('stores.manage')
  @ApiOperation({ summary: 'Supprimer une section' })
  async remove(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @CurrentUser() user: any,
  ) {
    this.assertCentralAdmin(user);
    return this.service.remove(groupId);
  }

  @Get(':groupId/stores')
  @Permissions('stores.read')
  @ApiOperation({ summary: 'Boutiques affectées à la section' })
  async listItems(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @CurrentUser() user: any,
  ) {
    this.assertCentralAdmin(user);
    return this.service.listItems(groupId);
  }

  @Post(':groupId/stores')
  @Permissions('stores.manage')
  @ApiOperation({ summary: 'Affecter des boutiques à la section' })
  async addItems(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Body() body: { storeIds?: string[] },
    @CurrentUser() user: any,
  ) {
    this.assertCentralAdmin(user);
    return this.service.addItems(groupId, body?.storeIds ?? []);
  }

  @Put(':groupId/stores/reorder')
  @Permissions('stores.manage')
  @ApiOperation({ summary: 'Réordonner les boutiques de la section' })
  async reorderItems(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Body() body: { ids?: string[] },
    @CurrentUser() user: any,
  ) {
    this.assertCentralAdmin(user);
    return this.service.reorderItems(groupId, body?.ids ?? []);
  }

  @Delete(':groupId/stores/:itemId')
  @Permissions('stores.manage')
  @ApiOperation({ summary: 'Retirer une boutique de la section' })
  async removeItem(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @CurrentUser() user: any,
  ) {
    this.assertCentralAdmin(user);
    return this.service.removeItem(groupId, itemId);
  }
}
