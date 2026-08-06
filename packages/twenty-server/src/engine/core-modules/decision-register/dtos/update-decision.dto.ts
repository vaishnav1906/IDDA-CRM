import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

import { DECISION_CATEGORIES } from 'src/engine/core-modules/decision-register/dtos/create-decision.dto';

export class UpdateDecisionDto {
  @IsOptional()
  @IsString()
  context?: string;

  @IsOptional()
  @IsString()
  decisionSummary?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  outcome?: string;

  @IsOptional()
  @IsString()
  @IsIn(DECISION_CATEGORIES)
  @MaxLength(50)
  category?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  requestedApproverIds?: string[];

  @IsOptional()
  submitForApproval?: boolean;
}
