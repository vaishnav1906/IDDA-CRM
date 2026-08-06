import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class SetReviewDecisionOutput {
  @Field(() => String)
  visitId: string;

  @Field(() => String)
  reviewDecision: string;

  @Field(() => String, { nullable: true })
  reviewComment: string | null;
}
