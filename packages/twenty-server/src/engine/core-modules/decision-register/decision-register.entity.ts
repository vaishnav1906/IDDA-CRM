import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  Relation,
  UpdateDateColumn,
} from 'typeorm';

import { DecisionRegisterOptionEntity } from 'src/engine/core-modules/decision-register/decision-register-option.entity';
import { WorkspaceRelatedEntity } from 'src/engine/workspace-manager/types/workspace-related-entity';

@Entity({ name: 'decisionRegister', schema: 'core' })
@Index(['workspaceId', 'deletedAt'])
@Index(['workspaceId', 'category'])
export class DecisionRegisterEntity extends WorkspaceRelatedEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text' })
  context: string;

  @Column({ type: 'text' })
  decisionSummary: string;

  @Column({ type: 'text', nullable: true })
  outcome: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  category: string | null;

  @Column({ type: 'simple-array', nullable: true })
  tags: string[] | null;

  @Column({ type: 'uuid' })
  createdById: string;

  @Column({ type: 'uuid' })
  updatedById: string;

  @Column({ type: 'varchar', nullable: true })
  entityType: string | null;

  @Column({ type: 'uuid', nullable: true })
  entityId: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  deletedAt: Date | null;

  @Column({
    type: 'enum',
    enum: ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED'],
    default: 'DRAFT',
  })
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';

  @Column({ type: 'text', array: true, nullable: true })
  requestedApproverIds: string[] | null;

  @Column({ type: 'uuid', nullable: true })
  approvedById: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  approvedAt: Date | null;

  @OneToMany(
    () => DecisionRegisterOptionEntity,
    (option) => option.decision,
    { cascade: true, eager: false },
  )
  options: Relation<DecisionRegisterOptionEntity[]>;
}
