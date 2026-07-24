import { Controller, Get, Query, UseGuards, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import type { Response } from 'express';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

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
    });
  }

  @Get('export')
  @ApiOperation({ summary: "Export CSV des logs d'audit" })
  async export(
    @Res() res: Response,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const result = await this.service.list({ from, to, limit: 10000 });
    const rows = result.data;

    const SEP = ';';
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const headers = ['Date', 'Acteur (Email)', 'Action', 'Ressource', 'ID Ressource', 'Statut', 'D\u00E9tails'];
    const lines = rows.map((r: any) =>
      [
        r.createdAt ? new Date(r.createdAt).toLocaleString('fr-FR', { timeZone: 'UTC' }) : '',
        r.actorEmail ?? r.actorId ?? '',
        r.action ?? '',
        r.resource ?? '',
        r.resourceId ?? '',
        r.status ?? '',
        r.details ? JSON.stringify(r.details) : '',
      ].map(esc).join(SEP),
    );

    const csv = '\uFEFF' + [`sep=${SEP}`, headers.map(esc).join(SEP), ...lines].join('\r\n');
    const date = new Date().toISOString().split('T')[0];

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="audit-${date}.csv"`);
    res.send(csv);
  }
}
