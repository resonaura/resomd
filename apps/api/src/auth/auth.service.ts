import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { User } from '../users/user.entity.js';
import type { AuthenticatedUser } from './jwt-payload.js';

// Auth is handled by the central auth service (rsnra-auth). This service
// only manages the local user records needed for document ownership —
// the id is the auth service user's UUID.
@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly dataSource: DataSource
  ) {}

  /**
   * Find or create a local user record by the auth user's UUID. Called
   * on every authenticated request (via JwtStrategy) so that document
   * ownership references always resolve.
   */
  async findOrCreateUser(id: string, email: string): Promise<User> {
    // Try by auth user ID first
    const existing = await this.users.findOne({ where: { id } });
    if (existing) {
      if (existing.email !== email) {
        existing.email = email;
        await this.users.save(existing);
      }
      return existing;
    }

    // Fallback: find by email — handles users created before the
    // OAuth integration whose local ID differs from the auth UUID.
    // Migrate their documents/folders to the new auth UUID.
    const legacyUser = await this.users.findOne({
      where: { email: email.toLowerCase() },
    });
    if (legacyUser) {
      // Migrate ownership of all documents and folders to the auth UUID.
      await this.dataSource.query(
        'UPDATE documents SET owner_id = ? WHERE owner_id = ?',
        [id, legacyUser.id]
      );
      await this.dataSource.query(
        'UPDATE folders SET owner_id = ? WHERE owner_id = ?',
        [id, legacyUser.id]
      );
      // Delete the legacy user and create a clean one with the auth UUID.
      await this.users.delete({ id: legacyUser.id });
    }

    const user = this.users.create({
      id,
      email,
      passwordHash: null,
      displayName: null,
      avatarUrl: null,
      role: 'user',
    });
    return this.users.save(user);
  }

  /**
   * Returns the local user record. Profile fields (displayName, avatarUrl)
   * are managed on auth.rsnra.com; the values here may be stale or null.
   */
  async me(user: AuthenticatedUser) {
    const local = await this.findOrCreateUser(user.id, user.email);
    return {
      id: local.id,
      email: user.email,
      displayName: user.displayName ?? null,
      avatarUrl: user.avatarUrl ?? null,
      role: user.role,
    };
  }
}
