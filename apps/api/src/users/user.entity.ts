import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

import { AppBaseEntity } from '../database/app-base.entity.js';

export type UserRole = 'user' | 'admin';

@Entity({ name: 'users' })
export class User extends AppBaseEntity {
  // The id is the auth service user's UUID — set manually instead of
  // auto-generated, so local records match the central auth identity.
  @PrimaryColumn('uuid')
  declare id: string;

  @Index({ unique: true })
  @Column()
  email!: string;

  @Column({ name: 'password_hash', type: 'text', nullable: true })
  passwordHash!: string | null;

  @Column({ name: 'display_name', type: 'text', nullable: true })
  displayName!: string | null;

  @Column({ name: 'avatar_url', type: 'text', nullable: true })
  avatarUrl!: string | null;

  @Column({ type: 'text', default: 'user' })
  role!: UserRole;
}
