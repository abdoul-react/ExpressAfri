import { Controller, Post, Get, Put, Delete, Param, Query, Body, UseGuards, HttpCode, HttpStatus, ForbiddenException } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { AuthService } from './auth.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { PermissionsGuard } from '../../common/guards/permissions.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { Public } from '../../common/decorators/public.decorator'
import { Permissions } from '../../common/decorators/permissions.decorator'

@ApiTags('Auth')
@Controller('auth')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class AuthController {
  constructor(private auth: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Connexion administrateur' })
  async login(@Body() dto: { email: string; password: string }) {
    return this.auth.login(dto.email, dto.password)
  }

  @Get('me')
  @ApiOperation({ summary: 'Profil de l\'admin connecté' })
  async getProfile(@CurrentUser() user: any) {
    return this.auth.getProfile(user.id)
  }

  // ====== Admin management ======
  @Get('admins')
  @Permissions('admins.read')
  @ApiOperation({ summary: 'Liste des administrateurs' })
  async listAdmins(@Query() query: any) { return this.auth.listAdmins(query) }

  @Get('admins/:id')
  @Permissions('admins.read')
  @ApiOperation({ summary: 'Détail administrateur' })
  async getAdminById(@Param('id') id: string) { return this.auth.getAdminById(id) }

  @Post('admins')
  @Permissions('admins.create')
  @ApiOperation({ summary: 'Créer un administrateur' })
  async createAdmin(@CurrentUser() actor: any, @Body() body: any) {
    // Seul un superAdmin peut créer un autre superAdmin
    if (!actor?.isSuperAdmin) throw new ForbiddenException('Seul un superAdmin peut créer un administrateur')
    const { isSuperAdmin: _ignored, ...safeData } = body
    return this.auth.createAdmin(safeData)
  }

  @Put('admins/:id')
  @Permissions('admins.update')
  @ApiOperation({ summary: 'Modifier un administrateur' })
  async updateAdmin(@Param('id') id: string, @Body() body: any) {
    // Interdire la modification de passwordHash, isSuperAdmin par mass-assignment
    const { isSuperAdmin: _i, passwordHash: _p, ...safeData } = body
    return this.auth.updateAdmin(id, safeData)
  }

  @Delete('admins/:id')
  @Permissions('admins.delete')
  @ApiOperation({ summary: 'Supprimer un administrateur' })
  async deleteAdmin(@Param('id') id: string) { return this.auth.deleteAdmin(id) }

  @Put('admins/:id/password')
  @Permissions('admins.update')
  @ApiOperation({ summary: 'Changer le mot de passe d\'un administrateur' })
  async changeAdminPassword(
    @Param('id') id: string,
    @Body() body: { password: string },
    @CurrentUser() actor: any,
  ) {
    // Seul un superAdmin peut changer le mot de passe d'un autre admin
    if (!actor.isSuperAdmin && actor.id !== id) {
      throw new ForbiddenException('Permission insuffisante pour changer ce mot de passe')
    }
    return this.auth.changeAdminPassword(id, body.password)
  }

  // ====== Permissions management ======
  @Get('permissions')
  @ApiOperation({ summary: 'Liste des permissions disponibles' })
  async listPermissions() { return this.auth.listPermissions() }

  // ====== Role management ======
  @Get('roles')
  @Permissions('roles.read')
  @ApiOperation({ summary: 'Liste des rôles' })
  async listRoles() { return this.auth.listRoles() }

  @Get('roles/:id')
  @Permissions('roles.read')
  @ApiOperation({ summary: 'Détail rôle' })
  async getRoleById(@Param('id') id: string) { return this.auth.getRoleById(id) }

  @Post('roles')
  @Permissions('roles.create')
  @ApiOperation({ summary: 'Créer un rôle' })
  async createRole(@Body() body: any) { return this.auth.createRole(body) }

  @Put('roles/:id')
  @Permissions('roles.update')
  @ApiOperation({ summary: 'Modifier un rôle' })
  async updateRole(@Param('id') id: string, @Body() body: any) { return this.auth.updateRole(id, body) }

  @Delete('roles/:id')
  @Permissions('roles.delete')
  @ApiOperation({ summary: 'Supprimer un rôle' })
  async deleteRole(@Param('id') id: string) { return this.auth.deleteRole(id) }
}
