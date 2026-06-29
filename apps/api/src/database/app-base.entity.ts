import {
  BaseEntity,
  CreateDateColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

// Extends TypeORM's own ActiveRecord BaseEntity (not just a plain class) so
// AdminJS's TypeORM adapter — which calls ActiveRecord statics like
// `find`/`save` on the entity class itself — can manage every resource.
export abstract class AppBaseEntity extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
