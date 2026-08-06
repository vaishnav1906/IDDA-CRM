import { Field, InputType, Int } from '@nestjs/graphql';

import {
  IsInt,
  IsOptional,
  IsString,
  IsTimeZone,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

@InputType()
export class BusinessDayHoursInput {
  @Field()
  @IsString()
  open: string;

  @Field()
  @IsString()
  close: string;
}

@InputType()
export class BusinessWeekScheduleInput {
  @Field(() => BusinessDayHoursInput, { nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => BusinessDayHoursInput)
  monday: BusinessDayHoursInput | null;

  @Field(() => BusinessDayHoursInput, { nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => BusinessDayHoursInput)
  tuesday: BusinessDayHoursInput | null;

  @Field(() => BusinessDayHoursInput, { nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => BusinessDayHoursInput)
  wednesday: BusinessDayHoursInput | null;

  @Field(() => BusinessDayHoursInput, { nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => BusinessDayHoursInput)
  thursday: BusinessDayHoursInput | null;

  @Field(() => BusinessDayHoursInput, { nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => BusinessDayHoursInput)
  friday: BusinessDayHoursInput | null;

  @Field(() => BusinessDayHoursInput, { nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => BusinessDayHoursInput)
  saturday: BusinessDayHoursInput | null;

  @Field(() => BusinessDayHoursInput, { nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => BusinessDayHoursInput)
  sunday: BusinessDayHoursInput | null;
}

@InputType()
export class BusinessHolidayInput {
  @Field()
  @IsString()
  date: string;

  @Field()
  @IsString()
  name: string;
}

@InputType()
export class UpsertBusinessCalendarInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsTimeZone()
  timezone?: string;

  @Field(() => BusinessWeekScheduleInput, { nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => BusinessWeekScheduleInput)
  weekSchedule?: BusinessWeekScheduleInput;

  @Field(() => [BusinessHolidayInput], { nullable: true })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => BusinessHolidayInput)
  holidays?: BusinessHolidayInput[];

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  slaSlaTargetMinutes?: number;
}
