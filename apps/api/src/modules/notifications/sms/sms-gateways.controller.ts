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
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { SmsService } from './sms.service';

/** Configuration des fournisseurs SMS — plateforme uniquement (settings.*). */
@ApiTags('SMS Gateways')
@ApiBearerAuth()
@Controller('sms-gateways')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SmsGatewaysController {
  constructor(private sms: SmsService) {}

  @Get()
  @Permissions('settings.read')
  @ApiOperation({ summary: 'Liste des fournisseurs SMS (secrets masqués)' })
  async list() {
    return this.sms.listForAdmin();
  }

  @Put(':code')
  @Permissions('settings.update')
  @ApiOperation({ summary: 'Configurer un fournisseur SMS (clés chiffrées)' })
  async update(
    @Param('code') code: string,
    @Body()
    body: {
      credentials?: Record<string, string | null>;
      senderId?: string | null;
      apiEndpoint?: string | null;
      isEnabled?: boolean;
    },
  ) {
    return this.sms.update(code, body);
  }

  @Post(':code/test')
  @Permissions('settings.update')
  @ApiOperation({ summary: 'Tester la connexion au fournisseur SMS' })
  async test(@Param('code') code: string) {
    return this.sms.testConnection(code);
  }
}
