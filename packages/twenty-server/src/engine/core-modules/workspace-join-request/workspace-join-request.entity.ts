import { Field, ObjectType, registerEnumType } from '@nestjs/graphql';

import { IDField } from '@ptc-org/nestjs-query-graphql';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { UUIDScalarType } from 'src/engine/api/graphql/workspace-schema-builder/graphql-types/scalars';
import { WorkspaceRelatedEntity } from 'src/engine/workspace-manager/types/workspace-related-entity';

export enum WorkspaceJoinRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

registerEnumType(WorkspaceJoinRequestStatus, {
  name: 'WorkspaceJoinRequestStatus',
});

@Entity({ name: 'workspaceJoinRequest', schema: 'core' })
@ObjectType('WorkspaceJoinRequest')
export class WorkspaceJoinRequestEntity extends WorkspaceRelatedEntity {
  @IDField(() => UUIDScalarType)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field(() => String, { nullable: false })
  @Column({ type: 'varchar', nullable: false })
  email: string;

  @Field(() => String, { nullable: false })
  @Column({ type: 'varchar', nullable: false })
  firstName: string;

  @Field(() => String, { nullable: true })
  @Column({ type: 'varchar', nullable: true })
  lastName?: string | null;

  @Field(() => String, { nullable: true })
  @Column({ type: 'text', nullable: true })
  message?: string | null;

  @Field(() => WorkspaceJoinRequestStatus, { nullable: false })
  @Column({
    type: 'enum',
    enum: WorkspaceJoinRequestStatus,
    default: WorkspaceJoinRequestStatus.PENDING,
    nullable: false,
  })
  status: WorkspaceJoinRequestStatus;

  @Field(() => Date)
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @Field(() => Date)
  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
