import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  Req,
  Headers,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CustomerAuthGuard } from '../mobile/customer-auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { CustomerRoute } from '../../common/decorators/customer-route.decorator';
import { InitPaymentDto } from './dto/init-payment.dto';
import type { Request } from 'express';

@ApiTags('Payments')
@Controller('payments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PaymentsController {
  constructor(private service: PaymentsService) {}

  @Get()
  @ApiOperation({ summary: 'Liste des paiements' })
  async list(
    @Query()
    query: {
      page?: number;
      limit?: number;
      search?: string;
      status?: string;
      method?: string;
      orderId?: string;
    },
  ) {
    return this.service.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail paiement' })
  async getById(@Param('id') id: string) {
    return this.service.getById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Créer un paiement' })
  async create(
    @Body()
    body: {
      orderId: string;
      storeId: string;
      amount: string;
      method?: string;
      currency?: string;
      transactionId?: string;
    },
  ) {
    return this.service.create(body);
  }

  @Post(':id/refund')
  @ApiOperation({ summary: 'Rembourser un paiement' })
  async refund(
    @Param('id') id: string,
    @Body() body: { amount: number; reason?: string },
  ) {
    return this.service.refund(id, body);
  }

  @CustomerRoute()
  @UseGuards(CustomerAuthGuard)
  @Post(':orderId/initialize')
  @ApiOperation({ summary: 'Initialiser un paiement via le PSP' })
  async initialize(
    @Param('orderId') orderId: string,
    @Body() body: InitPaymentDto,
  ) {
    return this.service.initialize(orderId, body.method, body.returnUrl);
  }

  @Public()
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Post('webhooks/:provider')
  @ApiOperation({ summary: 'Webhook PSP (signature vérifiée, idempotent)' })
  async webhook(
    @Param('provider') provider: string,
    @Req() req: Request,
    @Headers('x-webhook-signature') signature: string,
  ) {
    const rawBody =
      req.body instanceof Buffer
        ? req.body
        : Buffer.from(JSON.stringify(req.body));
    return this.service.handleWebhook(provider, rawBody, signature ?? '');
  }
}
