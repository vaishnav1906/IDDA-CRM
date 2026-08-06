import { Field, Float, InputType } from '@nestjs/graphql';

@InputType()
export class VerifyVisitInput {
  @Field(() => String)
  visitId: string;

  @Field(() => String)
  clinicId: string;

  @Field(() => String)
  visitNotes: string;

  @Field(() => String, { description: 'Base64-encoded selfie image (JPEG or PNG)' })
  selfieBase64: string;

  @Field(() => Float)
  latitude: number;

  @Field(() => Float)
  longitude: number;

  @Field(() => Float)
  gpsAccuracy: number;

  @Field(() => Boolean, { nullable: true, defaultValue: false })
  isMockLocation?: boolean;

  @Field(() => String, { nullable: true })
  deviceIdentifier?: string;

  @Field(() => String, { nullable: true })
  captureSource?: string;

  @Field(() => String, { nullable: true })
  visitAddress?: string;
}
