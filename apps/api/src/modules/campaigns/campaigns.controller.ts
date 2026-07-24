import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CampaignsService } from './campaigns.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Campaigns')
@Controller('campaigns')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class CampaignsController {
  constructor(private service: CampaignsService) {}

  @Get('summary')
  @Permissions('campaigns.read')
  @ApiOperation({ summary: 'Résumé des campagnes' })
  async getSummary() {
    return this.service.getSummary();
  }

  @Get()
  @Permissions('campaigns.read')
  @ApiOperation({ summary: 'Liste des campagnes' })
  async list(@Query() query: any) {
    return this.service.list(query);
  }

  @Get(':id')
  @Permissions('campaigns.read')
  @ApiOperation({ summary: 'Détail campagne' })
  async getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getById(id);
  }

  @Post()
  @Permissions('campaigns.manage')
  @ApiOperation({ summary: 'Créer une campagne' })
  async create(@Body() body: any) {
    return this.service.create(body);
  }

  @Put(':id')
  @Permissions('campaigns.manage')
  @ApiOperation({ summary: 'Modifier une campagne' })
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() body: any) {
    return this.service.update(id, body);
  }

  @Put(':id/launch')
  @Permissions('campaigns.manage')
  @ApiOperation({ summary: 'Lancer une campagne' })
  async launch(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.launch(id);
  }

  @Put(':id/pause')
  @Permissions('campaigns.manage')
  @ApiOperation({ summary: 'Mettre en pause une campagne' })
  async pause(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.pause(id);
  }

  @Delete(':id')
  @Permissions('campaigns.manage')
  @ApiOperation({ summary: 'Supprimer une campagne' })
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.delete(id);
  }
}
