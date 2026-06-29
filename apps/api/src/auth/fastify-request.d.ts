import type { AuthenticatedUser } from './jwt-payload.js';

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthenticatedUser;
  }
}
