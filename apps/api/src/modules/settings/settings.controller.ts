import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Paramètres')
@Controller('settings')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SettingsController {
  constructor(private service: SettingsService) {}

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Liste des paramètres' })
  async listSettings() {
    return this.service.listSettings();
  }

  @Get('feature-flags')
  @ApiOperation({
    summary: 'Liste des fonctionnalités (public pour le mobile)',
  })
  @Public()
  async listFeatureFlags() {
    return this.service.listFeatureFlags();
  }

  @Put(':key')
  @Permissions('settings.update')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mettre à jour un paramètre' })
  async updateSetting(
    @Param('key') key: string,
    @Body() body: { value: string },
  ) {
    return this.service.updateSetting(key, body.value);
  }

  @Put(':key/toggle')
  @Permissions('settings.update')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Activer/désactiver une fonctionnalité' })
  async toggleFeatureFlag(
    @Param('key') key: string,
    @Body() body: { enabled: boolean },
  ) {
    return this.service.toggleFeatureFlag(key, body.enabled);
  }
}
