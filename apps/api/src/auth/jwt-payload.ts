import type { UserRole } from '../users/user.entity.js';

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  displayName?: string | null;
  avatarUrl?: string | null;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  displayName?: string | null;
  avatarUrl?: string | null;
}
