import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

import { AppBaseEntity } from '../database/app-base.entity.js';
import { User } from '../users/user.entity.js';

@Entity({ name: 'documents' })
export class Document extends AppBaseEntity {
  @Column()
  name!: string;

  @Column({ type: 'text', default: '' })
  content!: string;

  @Index()
  @Column({ name: 'folder_id', type: 'uuid', nullable: true })
  folderId!: string | null;

  @Index()
  @Column({ name: 'owner_id', type: 'uuid' })
  ownerId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'owner_id' })
  owner!: User;
}
