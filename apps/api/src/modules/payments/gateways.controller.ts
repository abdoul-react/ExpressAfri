import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { GatewaysService } from './gateways.service';

/**
 * Configuration des passerelles de paiement — réservée à la plateforme
 * (settings.*). Les gérants de boutique n'ont rien à faire ici : eux
 * choisissent leurs MÉTHODES affichées, la plateforme choisit le TUYAU.
 */
@ApiTags('Payment Gateways')
@ApiBearerAuth()
@Controller('payment-gateways')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class GatewaysController {
  constructor(private service: GatewaysService) {}

  @Get()
  @Permissions('settings.read')
  @ApiOperation({ summary: 'Liste des passerelles (secrets masqués)' })
  async list() {
    return this.service.list();
  }

  @Put(':code')
  @Permissions('settings.update')
  @ApiOperation({ summary: 'Configurer une passerelle (clés chiffrées)' })
  async update(
    @Param('code') code: string,
    @Body()
    body: {
      credentials?: Record<string, string | null>;
      webhookSecret?: string | null;
      isEnabled?: boolean;
      isSandbox?: boolean;
      apiEndpoint?: string | null;
    },
  ) {
    return this.service.update(code, body);
  }

  @Post(':code/test')
  @Permissions('settings.update')
  @ApiOperation({ summary: 'Tester la connexion au PSP' })
  async test(@Param('code') code: string) {
    return this.service.testConnection(code);
  }

  @Put('route/:methodCode')
  @Permissions('settings.update')
  @ApiOperation({
    summary: 'Router une méthode du catalogue vers une passerelle',
  })
  async route(
    @Param('methodCode') methodCode: string,
    @Body() body: { gatewayCode: string | null },
  ) {
    return this.service.routeMethod(methodCode, body.gatewayCode ?? null);
  }
}
