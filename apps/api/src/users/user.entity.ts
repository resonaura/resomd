import { Column, Entity, Index } from 'typeorm';

import { AppBaseEntity } from '../database/app-base.entity.js';

export type UserRole = 'user' | 'admin';

@Entity({ name: 'users' })
export class User extends AppBaseEntity {
  @Index({ unique: true })
  @Column()
  email!: string;

  @Column({ name: 'password_hash' })
  passwordHash!: string;

  @Column({ name: 'display_name', type: 'text', nullable: true })
  displayName!: string | null;

  @Column({ name: 'avatar_url', type: 'text', nullable: true })
  avatarUrl!: string | null;

  @Column({ type: 'text', default: 'user' })
  role!: UserRole;
}
