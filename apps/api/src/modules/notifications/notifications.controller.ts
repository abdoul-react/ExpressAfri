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

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private service: NotificationsService) {}

  @Get('templates')
  @ApiOperation({ summary: 'Liste des templates' })
  async listTemplates(@Query() query: any) {
    return this.service.listTemplates(query);
  }

  @Get('templates/:id')
  @ApiOperation({ summary: 'Détail template' })
  async getTemplate(@Param('id') id: string) {
    return this.service.getTemplateById(id);
  }

  @Post('templates')
  @ApiOperation({ summary: 'Créer un template' })
  async createTemplate(@Body() body: any) {
    return this.service.createTemplate(body);
  }

  @Put('templates/:id')
  @ApiOperation({ summary: 'Modifier un template' })
  async updateTemplate(@Param('id') id: string, @Body() body: any) {
    return this.service.updateTemplate(id, body);
  }

  @Delete('templates/:id')
  @ApiOperation({ summary: 'Supprimer un template' })
  async deleteTemplate(@Param('id') id: string) {
    return this.service.deleteTemplate(id);
  }

  @Get('logs')
  @ApiOperation({ summary: "Liste des logs d'envoi" })
  async listLogs(@Query() query: any) {
    return this.service.listLogs(query);
  }

  @Get('logs/:id')
  @ApiOperation({ summary: "Détail log d'envoi" })
  async getLog(@Param('id') id: string) {
    return this.service.getLogById(id);
  }

  @Post('send-test')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Envoyer une notification de test' })
  async sendTest(@Body() body: { templateId: string; recipient: string }) {
    return this.service.sendTest(body.templateId, body.recipient);
  }

  @Post('send-batch')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Envoyer une notification en masse' })
  async sendBatch(@Body() body: { templateId: string; recipients: string[] }) {
    return this.service.sendBatch(body.templateId, body.recipients);
  }
}
