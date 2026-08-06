import { Field, Float, Int, ObjectType } from '@nestjs/graphql';

import { GraphQLJSON } from 'graphql-type-json';

@ObjectType()
export class VerifyVisitOutput {
  @Field(() => Boolean)
  success: boolean;

  @Field(() => Int)
  verificationScore: number;

  @Field(() => String)
  verificationStatus: string;

  @Field(() => String)
  selfieStatus: string;

  @Field(() => String)
  locationStatus: string;

  @Field(() => Float)
  distanceFromClinic: number;

  @Field(() => Boolean)
  imageReused: boolean;

  @Field(() => String, { nullable: true })
  selfieUrl: string | null;

  @Field(() => [String])
  issues: string[];

  @Field(() => GraphQLJSON)
  scoreBreakdown: Record<string, number>;
}
