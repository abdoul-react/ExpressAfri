import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Query,
  Body,
  UseGuards,
  Req,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReceiptsService } from './receipts.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CustomerRoute } from '../../common/decorators/customer-route.decorator';
import { CustomerAuthGuard } from '../mobile/customer-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Inject } from '@nestjs/common';
import type { StorageService } from '../storage/storage.service';
import type { Request } from 'express';

const SYSTEM_STORE_ID = '00000000-0000-0000-0000-000000000001';

@ApiTags('Reçus')
@UseGuards(JwtAuthGuard)
@Controller('receipts')
export class ReceiptsController {
  constructor(
    private service: ReceiptsService,
    @Inject('STORAGE_SERVICE') private storage: StorageService,
  ) {}

  private resolveStoreId(storeId: string | undefined, req: Request): string {
    return storeId || (req.user as any)?.storeId || SYSTEM_STORE_ID;
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Liste des reçus (paginated)' })
  async list(@Query() query: any) {
    return this.service.list(query);
  }

  @Get('settings')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Paramètres des reçus' })
  async getSettings(
    @Query('storeId') storeId: string | undefined,
    @Req() req: Request,
  ) {
    return this.service.getSettings(this.resolveStoreId(storeId, req));
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Détail d'un reçu" })
  async getById(@Param('id') id: string) {
    return this.service.getById(id);
  }

  @Get(':id/download')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Télécharger le PDF du reçu (admin)' })
  async download(@Param('id') id: string) {
    const receipt = await this.service.getById(id);
    if (!receipt.downloadUrl) throw new NotFoundException('PDF non disponible');
    const url = await this.storage.getUrl(
      receipt.downloadUrl.replace('/uploads/', '').replace(/\\/g, '/'),
    );
    return { url };
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Générer un reçu depuis une commande' })
  async create(
    @Body() body: { orderId: string; storeId?: string },
    @Req() req: Request,
  ) {
    return this.service.create({
      orderId: body.orderId,
      storeId: this.resolveStoreId(body.storeId, req),
    });
  }

  @Post(':id/send')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Envoyer un reçu' })
  async send(@Param('id') id: string) {
    return this.service.send(id);
  }

  @Post('bulk-send')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Envoi groupé de reçus' })
  async sendBulk(@Body() body: { ids: string[] }) {
    return this.service.sendBulk(body.ids);
  }

  @Put('settings')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mettre à jour les paramètres des reçus' })
  async updateSettings(
    @Body() body: { storeId?: string } & any,
    @Req() req: Request,
  ) {
    const storeId = this.resolveStoreId(body.storeId, req);
    const { storeId: _, ...data } = body;
    return this.service.updateSettings(storeId, data);
  }
}

@ApiTags('Reçus (client)')
@Controller('mobile/receipts')
export class MobileReceiptsController {
  constructor(
    private service: ReceiptsService,
    @Inject('STORAGE_SERVICE') private storage: StorageService,
  ) {}

  @Get(':id/download')
  @CustomerRoute()
  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Télécharger le PDF d'un reçu (client propriétaire)",
  })
  async download(@Param('id') id: string, @CurrentUser() user: any) {
    const receipt = await this.service.getById(id);
    if (!receipt.downloadUrl) throw new NotFoundException('PDF non disponible');
    if (user?.id) {
      const order = await this.service.getOrderCustomerId(receipt.orderId);
      if (order && order !== user.id)
        throw new UnauthorizedException('Ce reçu ne vous appartient pas');
    }
    const url = await this.storage.getUrl(
      receipt.downloadUrl.replace('/uploads/', '').replace(/\\/g, '/'),
    );
    return { url };
  }
}
