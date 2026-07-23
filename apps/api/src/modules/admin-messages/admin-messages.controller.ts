import { Controller, Get, Post, Patch, Param, Query, Body, UseGuards, UseInterceptors, UploadedFile, HttpCode, HttpStatus, BadRequestException, ForbiddenException } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger'
import { FileInterceptor } from '@nestjs/platform-express'
import { diskStorage } from 'multer'
import { join } from 'path'
import { randomFilename, validateFileContent } from '../../common/upload/upload.helper'
import { AdminMessagesService } from './admin-messages.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'

@ApiTags('Admin Messages')
@Controller('messages')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AdminMessagesController {
  constructor(private service: AdminMessagesService) {}

  // Cloisonnement messagerie :
  // - Admin plateforme (pas de storeId) → voit TOUTES les conversations.
  // - Gérant de boutique (storeId) → uniquement les conversations de SA boutique ;
  //   le storeId vient du jeton, jamais du client.
  // - Tickets support et messages internes : réservés à la plateforme.

  @Get()
  @ApiOperation({ summary: 'Liste des tickets support' })
  async list(@Query() query: any, @CurrentUser() user: any) {
    if (user?.storeId) throw new ForbiddenException('Réservé à l\'équipe AfriExpress')
    return this.service.list(query)
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Nb tickets non lus' })
  async getUnreadCount(@CurrentUser() user: any) {
    // Gérant : pas de tickets support — badge à zéro plutôt qu'une erreur
    if (user?.storeId) return { count: 0 }
    return this.service.getUnreadCount()
  }

  @Get('internal')
  @ApiOperation({ summary: 'Liste des messages internes' })
  async listInternalMessages(@Query() query: any, @CurrentUser() user: any) {
    if (user?.storeId) throw new ForbiddenException('Réservé à l\'équipe AfriExpress')
    return this.service.listInternalMessages(query)
  }

  @Get('internal/unread-count')
  @ApiOperation({ summary: 'Nb messages internes non lus' })
  async getUnreadInternalCount(@CurrentUser() user: any) {
    if (user?.storeId) return { count: 0 }
    return this.service.getUnreadInternalCount()
  }

  @Get('chat')
  @ApiOperation({ summary: 'Conversations chat mobile (toutes pour la plateforme, celles de sa boutique pour un gérant)' })
  async listChatConversations(@Query() query: any, @CurrentUser() user: any) {
    return this.service.listChatConversations({ ...query, storeId: user?.storeId ?? undefined })
  }

  @Get('chat/:id')
  @ApiOperation({ summary: 'Détail conversation chat mobile' })
  async getChatConversation(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.getChatConversation(id, user?.storeId ?? undefined)
  }

  @Post('chat/:id/reply')
  @ApiOperation({ summary: 'Répondre depuis admin (texte et/ou pièce jointe, citation optionnelle)' })
  async replyChatConversation(
    @Param('id') id: string,
    @Body() body: {
      content?: string
      type?: 'text' | 'image' | 'video' | 'pdf' | 'audio'
      attachmentUrl?: string | null
      attachmentName?: string | null
      replyToId?: string | null
    },
    @CurrentUser() user: any,
  ) {
    return this.service.replyChatConversation(id, body, user?.storeId ?? undefined)
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('chat/attachments')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: join(process.cwd(), 'uploads/chat'),
      filename: (_req, file, cb) => {
        cb(null, randomFilename(file.originalname))
      },
    }),
    fileFilter: (_req, file, cb) => {
      if (!file.mimetype.match(/^(image\/(png|jpe?g|webp|gif)|video\/(mp4|quicktime|webm|3gpp)|application\/pdf|audio\/(mpeg|mp4|m4a|x-m4a|aac|wav|webm|3gpp))$/)) {
        cb(new BadRequestException('Format non accepté (image, vidéo, pdf, audio)'), false)
      } else { cb(null, true) }
    },
    limits: { fileSize: 50 * 1024 * 1024 },
  }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Uploader une pièce jointe de chat côté admin (retourne url, name, type)' })
  async uploadChatAttachment(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Fichier requis')
    const prefix = file.mimetype.startsWith('image/') ? 'image/'
      : file.mimetype.startsWith('video/') ? 'video/'
      : file.mimetype === 'application/pdf' ? 'application/'
      : 'audio/'
    validateFileContent(file.path, prefix)
    const url = `/uploads/chat/${file.filename}`
    const type = file.mimetype.startsWith('image/') ? 'image'
      : file.mimetype.startsWith('video/') ? 'video'
      : file.mimetype === 'application/pdf' ? 'pdf'
      : 'audio'
    return { url, name: file.originalname, type }
  }

  @Get('chat/:id/media')
  @ApiOperation({ summary: 'Médias, documents et liens d\'une conversation chat' })
  async getChatConversationMedia(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.getChatConversationMedia(id, user?.storeId ?? undefined)
  }

  @Patch('chat/customers/:customerId/block')
  @ApiOperation({ summary: 'Bloquer/débloquer un client sur le chat' })
  async setCustomerChatBlocked(
    @Param('customerId') customerId: string,
    @Body() body: { blocked: boolean },
    @CurrentUser() user: any,
  ) {
    // Bloquer un client l'empêche d'écrire à TOUTES les boutiques :
    // décision de plateforme, pas de gérant.
    if (user?.storeId) throw new ForbiddenException('Le blocage des clients est réservé à l\'équipe AfriExpress')
    return this.service.setCustomerChatBlocked(customerId, !!body.blocked)
  }

  @Patch('chat/:id/status')
  @ApiOperation({ summary: 'Changer le statut d\'une conversation chat (open/closed)' })
  async updateChatStatus(
    @Param('id') id: string,
    @Body() body: { status: 'open' | 'closed' },
    @CurrentUser() user: any,
  ) {
    return this.service.updateChatStatus(id, body.status, user?.storeId ?? undefined)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail ticket support' })
  async getById(@Param('id') id: string) { return this.service.getById(id) }

  @Post(':id/reply')
  @ApiOperation({ summary: 'Répondre au ticket' })
  async reply(@Param('id') id: string, @Body() body: { content: string }) { return this.service.reply(id, body.content) }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Màj statut ticket' })
  async updateStatus(@Param('id') id: string, @Body() body: { status: string }) { return this.service.updateStatus(id, body.status) }

  @Patch(':id/assign')
  @ApiOperation({ summary: 'Assigner ticket' })
  async assign(@Param('id') id: string, @Body() body: { adminId: string }) { return this.service.assign(id, body.adminId) }

  @Post('internal')
  @ApiOperation({ summary: 'Envoyer message interne' })
  async sendInternalMessage(@Body() body: any) { return this.service.sendInternalMessage(body) }

  @Post('internal/:id/reply')
  @ApiOperation({ summary: 'Répondre message interne' })
  async replyInternalMessage(@Param('id') id: string, @Body() body: { content: string }) { return this.service.replyInternalMessage(id, body.content) }

  @Patch('internal/:id/read')
  @ApiOperation({ summary: 'Marquer lu message interne' })
  async markInternalMessageRead(@Param('id') id: string) { return this.service.markInternalMessageRead(id) }
}
