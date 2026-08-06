import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Relation,
  UpdateDateColumn,
} from 'typeorm';

import { DecisionRegisterEntity } from 'src/engine/core-modules/decision-register/decision-register.entity';

@Entity({ name: 'decisionRegisterComment', schema: 'core' })
@Index(['workspaceId', 'decisionId', 'deletedAt'])
@Index(['parentId'])
export class DecisionRegisterCommentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  workspaceId: string;

  @Column({ type: 'uuid' })
  decisionId: string;

  @Column({ type: 'uuid', nullable: true })
  parentId: string | null;

  @Column({ type: 'uuid' })
  authorId: string;

  @Column({ type: 'text' })
  body: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  deletedAt: Date | null;

  @ManyToOne(() => DecisionRegisterEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'decisionId' })
  decision: Relation<DecisionRegisterEntity>;
}
