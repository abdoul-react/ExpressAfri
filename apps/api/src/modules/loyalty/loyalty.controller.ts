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
import { LoyaltyService } from './loyalty.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Loyalty')
@Controller('loyalty')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class LoyaltyController {
  constructor(private service: LoyaltyService) {}

  @Get('summary')
  @Permissions('promotions.read')
  @ApiOperation({ summary: 'Résumé du programme fidélité' })
  async getSummary() {
    return this.service.getSummary();
  }

  @Get('rules')
  @Permissions('promotions.read')
  @ApiOperation({ summary: 'Liste des règles' })
  async listRules(@Query() query: any) {
    return this.service.listRules(query);
  }

  @Post('rules')
  @Permissions('promotions.create')
  @ApiOperation({ summary: 'Créer une règle' })
  async createRule(@Body() body: any) {
    return this.service.createRule(body);
  }

  @Put('rules/:id')
  @Permissions('promotions.update')
  @ApiOperation({ summary: 'Modifier une règle' })
  async updateRule(@Param('id') id: string, @Body() body: any) {
    return this.service.updateRule(id, body);
  }

  @Delete('rules/:id')
  @Permissions('promotions.delete')
  @ApiOperation({ summary: 'Supprimer une règle' })
  async deleteRule(@Param('id') id: string) {
    return this.service.deleteRule(id);
  }

  @Get('rewards')
  @Permissions('promotions.read')
  @ApiOperation({ summary: 'Liste des récompenses' })
  async listRewards(@Query() query: any) {
    return this.service.listRewards(query);
  }

  @Post('rewards')
  @Permissions('promotions.create')
  @ApiOperation({ summary: 'Créer une récompense' })
  async createReward(@Body() body: any) {
    return this.service.createReward(body);
  }

  @Put('rewards/:id')
  @Permissions('promotions.update')
  @ApiOperation({ summary: 'Modifier une récompense' })
  async updateReward(@Param('id') id: string, @Body() body: any) {
    return this.service.updateReward(id, body);
  }

  @Delete('rewards/:id')
  @Permissions('promotions.delete')
  @ApiOperation({ summary: 'Supprimer une récompense' })
  async deleteReward(@Param('id') id: string) {
    return this.service.deleteReward(id);
  }

  @Get('customers')
  @Permissions('promotions.read')
  @ApiOperation({ summary: 'Clients avec points' })
  async listCustomerPoints(@Query() query: any) {
    return this.service.listCustomerPoints(query);
  }

  @Get('customers/:id')
  @Permissions('promotions.read')
  @ApiOperation({ summary: "Points fidélité d'un client" })
  async getCustomerPoints(@Param('id') id: string) {
    return this.service.getCustomerPoints(id);
  }

  @Get('customers/:id/transactions')
  @Permissions('promotions.read')
  @ApiOperation({ summary: 'Historique des transactions de points' })
  async getTransactions(@Param('id') id: string) {
    return this.service.getTransactions(id, {});
  }

  @Put('customers/:id/points')
  @Permissions('promotions.update')
  @ApiOperation({ summary: 'Ajuster les points' })
  async adjustPoints(
    @Param('id') id: string,
    @Body() body: { balance: number; reason?: string },
  ) {
    return this.service.adjustPoints(id, body.balance, body.reason);
  }
}
