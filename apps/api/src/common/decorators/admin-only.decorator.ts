import { applyDecorators, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

export function AdminOnly() {
  return applyDecorators(UseGuards(JwtAuthGuard));
}
