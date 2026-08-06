import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'mobileDeviceToken', schema: 'core' })
@Index(['workspaceId', 'workspaceMemberId'])
export class MobileDeviceTokenEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  workspaceId: string;

  @Column({ type: 'uuid' })
  workspaceMemberId: string;

  @Column({ type: 'text', unique: true })
  fcmToken: string;

  @Column({ type: 'varchar', length: 16, default: 'android' })
  platform: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
