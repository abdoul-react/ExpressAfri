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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private service: NotificationsService) {}

  @Get('templates')
  @Permissions('notifications.read')
  @ApiOperation({ summary: 'Liste des templates' })
  async listTemplates(@Query() query: any) {
    return this.service.listTemplates(query);
  }

  @Get('templates/:id')
  @Permissions('notifications.read')
  @ApiOperation({ summary: 'Détail template' })
  async getTemplate(@Param('id') id: string) {
    return this.service.getTemplateById(id);
  }

  @Post('templates')
  @Permissions('notifications.create')
  @ApiOperation({ summary: 'Créer un template' })
  async createTemplate(@Body() body: any) {
    return this.service.createTemplate(body);
  }

  @Put('templates/:id')
  @Permissions('notifications.update')
  @ApiOperation({ summary: 'Modifier un template' })
  async updateTemplate(@Param('id') id: string, @Body() body: any) {
    return this.service.updateTemplate(id, body);
  }

  @Delete('templates/:id')
  @Permissions('notifications.delete')
  @ApiOperation({ summary: 'Supprimer un template' })
  async deleteTemplate(@Param('id') id: string) {
    return this.service.deleteTemplate(id);
  }

  @Get('logs')
  @Permissions('notifications.read')
  @ApiOperation({ summary: "Liste des logs d'envoi" })
  async listLogs(@Query() query: any) {
    return this.service.listLogs(query);
  }

  @Get('logs/:id')
  @Permissions('notifications.read')
  @ApiOperation({ summary: "Détail log d'envoi" })
  async getLog(@Param('id') id: string) {
    return this.service.getLogById(id);
  }

  @Post('send-test')
  @Permissions('notifications.create')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Envoyer une notification de test' })
  async sendTest(@Body() body: { templateId: string; recipient: string }) {
    return this.service.sendTest(body.templateId, body.recipient);
  }

  @Post('send-batch')
  @Permissions('notifications.create')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Envoyer une notification en masse' })
  async sendBatch(@Body() body: { templateId: string; recipients: string[] }) {
    return this.service.sendBatch(body.templateId, body.recipients);
  }
}
