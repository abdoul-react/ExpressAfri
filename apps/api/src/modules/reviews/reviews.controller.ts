import { Controller, Get, Put, Param, Query, Body, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { ReviewsService } from './reviews.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'

@ApiTags('Reviews')
@Controller('reviews')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ReviewsController {
  constructor(private service: ReviewsService) {}

  @Get()
  @ApiOperation({ summary: 'Liste des avis' })
  async list(@Query() query: any) { return this.service.list(query) }

  @Put(':id/moderate')
  @ApiOperation({ summary: 'Modérer un avis' })
  async moderate(@Param('id') id: string, @Body('isActive') isActive: boolean) { return this.service.moderate(id, isActive) }
}
