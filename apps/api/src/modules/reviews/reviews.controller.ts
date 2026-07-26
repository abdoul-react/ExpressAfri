import {
  Controller,
  Get,
  Put,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Reviews')
@Controller('reviews')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class ReviewsController {
  constructor(private service: ReviewsService) {}

  @Get()
  @Permissions('content.moderate')
  @ApiOperation({ summary: 'Liste des avis' })
  async list(@Query() query: any) {
    return this.service.list(query);
  }

  @Put(':id/moderate')
  @Permissions('content.moderate')
  @ApiOperation({ summary: 'Modérer un avis' })
  async moderate(@Param('id') id: string, @Body('isActive') isActive: boolean) {
    return this.service.moderate(id, isActive);
  }
}
