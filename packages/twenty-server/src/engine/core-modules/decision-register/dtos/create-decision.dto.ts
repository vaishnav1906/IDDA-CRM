import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export const DECISION_CATEGORIES = [
  'Architecture',
  'Technology',
  'Product',
  'Business',
  'Process',
  'Operations',
  'Security',
  'Other',
] as const;

export class CreateDecisionDto {
  @IsString()
  @MaxLength(200)
  title: string;

  @IsString()
  context: string;

  @IsString()
  decisionSummary: string;

  @IsOptional()
  @IsString()
  @IsIn(DECISION_CATEGORIES)
  @MaxLength(50)
  category?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];

  @IsOptional()
  @IsString()
  outcome?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  requestedApproverIds?: string[];

  @IsOptional()
  submitForApproval?: boolean;
}
