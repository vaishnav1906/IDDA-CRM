import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Relation,
} from 'typeorm';

import { DecisionRegisterEntity } from 'src/engine/core-modules/decision-register/decision-register.entity';

@Entity({ name: 'decisionRegisterAttachment', schema: 'core' })
@Index(['decisionId'])
export class DecisionRegisterAttachmentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  decisionId: string;

  @Column({ type: 'uuid' })
  workspaceId: string;

  @Column({ type: 'varchar' })
  fileName: string;

  @Column({ type: 'bigint', default: 0 })
  fileSize: number;

  @Column({ type: 'varchar', default: 'application/octet-stream' })
  mimeType: string;

  @Column({ type: 'text' })
  storagePath: string;

  @Column({ type: 'uuid' })
  uploadedById: string;

  @CreateDateColumn({ type: 'timestamptz' })
  uploadedAt: Date;

  @ManyToOne(
    () => DecisionRegisterEntity,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'decisionId' })
  decision: Relation<DecisionRegisterEntity>;
}
