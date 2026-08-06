import { Field, Int, ObjectType } from '@nestjs/graphql';

import GraphQLJSON from 'graphql-type-json';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type BusinessDayHours = {
  open: string;
  close: string;
};

export type BusinessWeekSchedule = {
  monday: BusinessDayHours | null;
  tuesday: BusinessDayHours | null;
  wednesday: BusinessDayHours | null;
  thursday: BusinessDayHours | null;
  friday: BusinessDayHours | null;
  saturday: BusinessDayHours | null;
  sunday: BusinessDayHours | null;
};

export type BusinessHoliday = {
  date: string;
  name: string;
};

@Entity({ name: 'businessCalendar', schema: 'core' })
@ObjectType('BusinessCalendar')
@Index('UQ_BUSINESS_CALENDAR_WORKSPACE', ['workspaceId'], { unique: true })
export class BusinessCalendarEntity {
  @PrimaryGeneratedColumn('uuid')
  @Field()
  id: string;

  @Column({ type: 'uuid' })
  @Index('IDX_BUSINESS_CALENDAR_WORKSPACE_ID')
  @Field()
  workspaceId: string;

  @Column({ type: 'varchar', default: 'UTC' })
  @Field()
  timezone: string;

  @Column({ type: 'jsonb' })
  @Field(() => GraphQLJSON)
  weekSchedule: BusinessWeekSchedule;

  @Column({ type: 'jsonb', default: '[]' })
  @Field(() => GraphQLJSON)
  holidays: BusinessHoliday[];

  @Column({ type: 'int', default: 60 })
  @Field(() => Int)
  slaSlaTargetMinutes: number;

  @CreateDateColumn()
  @Field()
  createdAt: Date;

  @UpdateDateColumn()
  @Field()
  updatedAt: Date;
}
