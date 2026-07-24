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

@ApiTags('Loyalty')
@Controller('loyalty')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LoyaltyController {
  constructor(private service: LoyaltyService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Résumé du programme fidélité' })
  async getSummary() {
    return this.service.getSummary();
  }

  @Get('rules')
  @ApiOperation({ summary: 'Liste des règles' })
  async listRules(@Query() query: any) {
    return this.service.listRules(query);
  }

  @Post('rules')
  @ApiOperation({ summary: 'Créer une règle' })
  async createRule(@Body() body: any) {
    return this.service.createRule(body);
  }

  @Put('rules/:id')
  @ApiOperation({ summary: 'Modifier une règle' })
  async updateRule(@Param('id') id: string, @Body() body: any) {
    return this.service.updateRule(id, body);
  }

  @Delete('rules/:id')
  @ApiOperation({ summary: 'Supprimer une règle' })
  async deleteRule(@Param('id') id: string) {
    return this.service.deleteRule(id);
  }

  @Get('rewards')
  @ApiOperation({ summary: 'Liste des récompenses' })
  async listRewards(@Query() query: any) {
    return this.service.listRewards(query);
  }

  @Post('rewards')
  @ApiOperation({ summary: 'Créer une récompense' })
  async createReward(@Body() body: any) {
    return this.service.createReward(body);
  }

  @Put('rewards/:id')
  @ApiOperation({ summary: 'Modifier une récompense' })
  async updateReward(@Param('id') id: string, @Body() body: any) {
    return this.service.updateReward(id, body);
  }

  @Delete('rewards/:id')
  @ApiOperation({ summary: 'Supprimer une récompense' })
  async deleteReward(@Param('id') id: string) {
    return this.service.deleteReward(id);
  }

  @Get('customers')
  @ApiOperation({ summary: 'Clients avec points' })
  async listCustomerPoints(@Query() query: any) {
    return this.service.listCustomerPoints(query);
  }

  @Get('customers/:id')
  @ApiOperation({ summary: "Points fidélité d'un client" })
  async getCustomerPoints(@Param('id') id: string) {
    return this.service.getCustomerPoints(id);
  }

  @Get('customers/:id/transactions')
  @ApiOperation({ summary: 'Historique des transactions de points' })
  async getTransactions(@Param('id') id: string) {
    return this.service.getTransactions(id, {});
  }

  @Put('customers/:id/points')
  @ApiOperation({ summary: 'Ajuster les points' })
  async adjustPoints(
    @Param('id') id: string,
    @Body() body: { balance: number; reason?: string },
  ) {
    return this.service.adjustPoints(id, body.balance, body.reason);
  }
}
