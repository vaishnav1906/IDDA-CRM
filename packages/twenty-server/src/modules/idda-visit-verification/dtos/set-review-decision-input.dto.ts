import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class SetReviewDecisionInput {
  @Field(() => String)
  visitId: string;

  @Field(() => String, { description: 'APPROVED | REJECTED | PENDING' })
  decision: string;

  @Field(() => String, { nullable: true })
  reviewComment?: string;
}
