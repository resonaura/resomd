import {
  ForbiddenException,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

// Must run after JwtAuthGuard so request.user is already populated.
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    if (request.user?.role !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }
    return true;
  }
}
