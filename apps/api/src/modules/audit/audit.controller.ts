import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { AuditService } from './audit.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'

@ApiTags('Audit')
@Controller('audit')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AuditController {
  constructor(private service: AuditService) {}

  @Get()
  @ApiOperation({ summary: "Liste des logs d'audit" })
  async list(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('action') action?: string,
    @Query('resource') resource?: string,
    @Query('actorId') actorId?: string,
    @Query('status') status?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('search') search?: string,
  ) {
    return this.service.list({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      action,
      resource,
      actorId,
      status,
      from,
      to,
      search,
    })
  }

  @Get('export')
  @ApiOperation({ summary: "Export des logs d'audit (retourne JSON — converti en CSV côté admin)" })
  async export(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    // Le front-end (exportCSV.ts) se charge de la conversion JSON → CSV
    return this.service.list({ from, to, limit: 10000 })
  }
}
