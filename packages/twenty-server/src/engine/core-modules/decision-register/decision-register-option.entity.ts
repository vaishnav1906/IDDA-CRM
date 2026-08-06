import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Relation,
} from 'typeorm';

import { DecisionRegisterEntity } from 'src/engine/core-modules/decision-register/decision-register.entity';

@Entity({ name: 'decisionRegisterOption', schema: 'core' })
@Index(['decisionId'])
export class DecisionRegisterOptionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  decisionId: string;

  @Column({ type: 'text' })
  optionText: string;

  @ManyToOne(
    () => DecisionRegisterEntity,
    (decision) => decision.options,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'decisionId' })
  decision: Relation<DecisionRegisterEntity>;
}
