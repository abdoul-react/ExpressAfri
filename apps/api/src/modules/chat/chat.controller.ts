import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, UseInterceptors, UploadedFile, HttpCode, HttpStatus, UnauthorizedException, BadRequestException } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger'
import { FileInterceptor } from '@nestjs/platform-express'
import { diskStorage } from 'multer'
import { extname, join } from 'path'
import { ChatService } from './chat.service'
import { CustomerAuthGuard } from '../mobile/customer-auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { CustomerRoute } from '../../common/decorators/customer-route.decorator'

@ApiTags('Chat')
@Controller('chat')
// CustomerRoute : sans lui, le JwtAuthGuard global (admin) rejette les jetons clients → 401
@CustomerRoute()
@UseGuards(CustomerAuthGuard)
@ApiBearerAuth()
export class ChatController {
  constructor(private service: ChatService) {}

  @Get('conversations')
  @ApiOperation({ summary: 'Liste des conversations' })
  async listConversations(@CurrentUser() user: any) {
    if (!user?.id) return []
    return this.service.listConversations(user.id)
  }

  @Get('conversations/:id')
  @ApiOperation({ summary: 'Détail d\'une conversation avec ses messages' })
  async getConversation(@CurrentUser() user: any, @Param('id') id: string) {
    if (!user?.id) throw new UnauthorizedException('Connexion requise')
    return this.service.getConversation(id, user.id)
  }

  @Post('conversations')
  @ApiOperation({ summary: 'Créer une conversation (storeId ou orderId — dédupliquée par commande)' })
  async createConversation(@CurrentUser() user: any, @Body() body: { storeId?: string; orderId?: string; subject?: string }) {
    if (!user?.id) throw new UnauthorizedException('Connexion requise')
    return this.service.createConversation({ ...body, customerId: user.id })
  }

  @Put('conversations/:id/close')
  @ApiOperation({ summary: 'Fermer une conversation' })
  async closeConversation(@CurrentUser() user: any, @Param('id') id: string) {
    if (!user?.id) throw new UnauthorizedException('Connexion requise')
    return this.service.closeConversation(id, user.id)
  }

  @Post('conversations/:id/messages')
  @ApiOperation({ summary: 'Envoyer un message (texte et/ou pièce jointe, réponse à un message)' })
  async sendMessage(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() body: {
      content?: string
      type?: 'text' | 'image' | 'video' | 'pdf' | 'audio'
      attachmentUrl?: string | null
      attachmentName?: string | null
      replyToId?: string | null
    },
  ) {
    if (!user?.id) throw new UnauthorizedException('Connexion requise')
    return this.service.sendMessage(id, { id: user.id, role: 'customer' }, body)
  }

  @Post('attachments')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: join(process.cwd(), 'uploads/chat'),
      filename: (_req, file, cb) => {
        const name = file.originalname.replace(extname(file.originalname), '').replace(/[^a-z0-9]/gi, '_').toLowerCase()
        cb(null, `${name}_${Date.now()}${extname(file.originalname)}`)
      },
    }),
    fileFilter: (_req, file, cb) => {
      // Images, vidéos, PDF et audio
      if (!file.mimetype.match(/^(image\/(png|jpe?g|webp|gif)|video\/(mp4|quicktime|webm|3gpp)|application\/pdf|audio\/(mpeg|mp4|m4a|x-m4a|aac|wav|webm|3gpp))$/)) {
        cb(new BadRequestException('Format non accepté (image, vidéo, pdf, audio)'), false)
      } else { cb(null, true) }
    },
    limits: { fileSize: 50 * 1024 * 1024 },
  }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Uploader une pièce jointe de chat (retourne url, name, type)' })
  async uploadAttachment(@CurrentUser() user: any, @UploadedFile() file: Express.Multer.File) {
    if (!user?.id) throw new UnauthorizedException('Connexion requise')
    if (!file) throw new BadRequestException('Fichier requis')
    const url = `/uploads/chat/${file.filename}`
    const type = file.mimetype.startsWith('image/') ? 'image'
      : file.mimetype.startsWith('video/') ? 'video'
      : file.mimetype === 'application/pdf' ? 'pdf'
      : 'audio'
    return { url, name: file.originalname, type }
  }

  @Delete('conversations/:id/messages/:messageId')
  @ApiOperation({ summary: 'Supprimer un de ses messages (pour tous)' })
  async deleteMessage(@CurrentUser() user: any, @Param('id') id: string, @Param('messageId') messageId: string) {
    if (!user?.id) throw new UnauthorizedException('Connexion requise')
    return this.service.deleteMessage(id, messageId, user.id)
  }

  @Put('conversations/:id/archive')
  @ApiOperation({ summary: 'Archiver une conversation' })
  async archiveConversation(@CurrentUser() user: any, @Param('id') id: string) {
    if (!user?.id) throw new UnauthorizedException('Connexion requise')
    return this.service.archiveConversation(id, user.id)
  }

  @Get('conversations/:id/media')
  @ApiOperation({ summary: 'Médias, documents et liens échangés dans une conversation' })
  async getConversationMedia(@CurrentUser() user: any, @Param('id') id: string) {
    if (!user?.id) throw new UnauthorizedException('Connexion requise')
    return this.service.getConversationMedia(id, user.id)
  }

  @Put('conversations/:id/read')
  @ApiOperation({ summary: 'Marquer les messages comme lus' })
  async markAsRead(@CurrentUser() user: any, @Param('id') id: string) {
    if (!user?.id) throw new UnauthorizedException('Connexion requise')
    return this.service.markAsRead(id, user.id)
  }
}
