import {
  Controller,
  Get,
  HttpCode,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';

import { AuthService } from './auth.service.js';
import { CurrentUser } from './current-user.decorator.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import type { AuthenticatedUser } from './jwt-payload.js';

// Authentication (login, register, profile, password) is handled by the
// central auth service at auth.rsnra.com. This controller exposes a
// lightweight /me endpoint so the resomd web app can confirm the shared
// session cookie is valid, and a /logout endpoint to clear it.
@Controller({ path: 'auth' })
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.me(user);
  }

  @Post('logout')
  @HttpCode(204)
  logout(@Res({ passthrough: true }) reply: FastifyReply) {
    // Clear the shared session cookie. The cookie domain matches what
    // the auth service uses (localhost in dev, .rsnra.com in prod).
    const isProduction = process.env.NODE_ENV === 'production';
    const domain =
      process.env.COOKIE_DOMAIN ?? (isProduction ? '.rsnra.com' : 'localhost');
    const sameSite = isProduction ? 'Lax' : 'None';
    const attributes = [
      'rsnra_session=',
      'Path=/',
      'HttpOnly',
      `SameSite=${sameSite}`,
      'Max-Age=0',
      `Domain=${domain}`,
      'Secure',
    ];
    reply.header('Set-Cookie', attributes.join('; '));
  }
}
