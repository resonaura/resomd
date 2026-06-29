import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import type { FastifyRequest } from 'fastify';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { config } from '../config.js';
import { AuthService } from './auth.service.js';
import type { AuthenticatedUser, JwtPayload } from './jwt-payload.js';

// Extracts the JWT from the shared `rsnra_session` cookie (set by the
// central auth service) or, as a fallback, from an Authorization: Bearer
// header. On localhost the cookie is shared across ports; in production
// it is scoped to the `.rsnra.com` domain.
function extractFromCookie(request: FastifyRequest): string | null {
  const cookie = request.headers.cookie;
  const token = cookie
    ?.split(';')
    .map(part => part.trim())
    .find(part => part.startsWith('rsnra_session='))
    ?.slice('rsnra_session='.length);
  return token ? decodeURIComponent(token) : null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        extractFromCookie,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: config.JWT_SECRET,
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    await this.authService.findOrCreateUser(payload.sub, payload.email);
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      displayName: payload.displayName ?? null,
      avatarUrl: payload.avatarUrl ?? null,
    };
  }
}
