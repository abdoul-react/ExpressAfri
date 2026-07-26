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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AffiliatesService } from './affiliates.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Affiliates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('affiliates')
export class AffiliatesController {
  constructor(private service: AffiliatesService) {}

  @Get()
  @Permissions('affiliates.read')
  @ApiOperation({ summary: 'Liste des affiliés' })
  async list(@Query() query: any) {
    return this.service.list(query);
  }

  @Get('summary')
  @Permissions('affiliates.read')
  @ApiOperation({ summary: 'Résumé global des affiliés' })
  async getSummary() {
    return this.service.getSummary();
  }

  @Get(':id')
  @Permissions('affiliates.read')
  @ApiOperation({ summary: 'Détail affilié' })
  async getById(@Param('id') id: string) {
    return this.service.getById(id);
  }

  @Post()
  @Permissions('affiliates.create')
  @ApiOperation({ summary: 'Créer un affilié' })
  async create(@Body() body: any) {
    return this.service.create(body);
  }

  @Put(':id')
  @Permissions('affiliates.update')
  @ApiOperation({ summary: 'Modifier un affilié' })
  async update(@Param('id') id: string, @Body() body: any) {
    return this.service.update(id, body);
  }

  @Put(':id/status')
  @Permissions('affiliates.approve')
  @ApiOperation({ summary: 'Changer le statut' })
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: string },
  ) {
    return this.service.updateStatus(id, body.status);
  }

  @Get(':id/coupons')
  @Permissions('affiliates.read')
  @ApiOperation({ summary: "Coupons liés à l'affilié" })
  async getCoupons(@Param('id') id: string, @Query() query: any) {
    return this.service.getCoupons(id, query);
  }

  @Get('commissions/list')
  @Permissions('affiliates.read')
  @ApiOperation({ summary: 'Liste des commissions' })
  async listCommissions(@Query() query: any) {
    return this.service.listCommissions(query);
  }

  @Put('commissions/:id/approve')
  @Permissions('affiliates.approve')
  @ApiOperation({ summary: 'Approuver une commission' })
  async approveCommission(@Param('id') id: string) {
    return this.service.approveCommission(id);
  }

  @Put('commissions/:id/reject')
  @Permissions('affiliates.approve')
  @ApiOperation({ summary: 'Rejeter une commission' })
  async rejectCommission(@Param('id') id: string) {
    return this.service.rejectCommission(id);
  }

  @Get('codes')
  @Permissions('affiliates.read')
  @ApiOperation({ summary: 'Liste des codes affiliés' })
  async listCodes(@Query() query: any) {
    return this.service.listCodes(query);
  }

  @Post('codes')
  @Permissions('affiliates.create')
  @ApiOperation({ summary: 'Créer un code affilié' })
  async createCode(@Body() body: any) {
    return this.service.createCode(body);
  }

  @Put('codes/:id')
  @Permissions('affiliates.update')
  @ApiOperation({ summary: 'Modifier un code affilié' })
  async updateCode(@Param('id') id: string, @Body() body: any) {
    return this.service.updateCode(id, body);
  }

  @Delete('codes/:id')
  @Permissions('affiliates.delete')
  @ApiOperation({ summary: 'Supprimer un code affilié' })
  async deleteCode(@Param('id') id: string) {
    return this.service.deleteCode(id);
  }
}
