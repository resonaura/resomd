import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

import { AppBaseEntity } from '../database/app-base.entity.js';
import { User } from '../users/user.entity.js';

@Entity({ name: 'folders' })
export class Folder extends AppBaseEntity {
  @Column()
  name!: string;

  @Index()
  @Column({ name: 'parent_id', type: 'uuid', nullable: true })
  parentId!: string | null;

  @Index()
  @Column({ name: 'owner_id', type: 'uuid' })
  ownerId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'owner_id' })
  owner!: User;
}
