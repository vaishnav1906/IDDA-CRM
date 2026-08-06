import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class UploadClinicPhotoInput {
  @Field(() => String)
  visitId: string;

  @Field(() => String, { description: 'Base64-encoded clinic photo (JPEG or PNG)' })
  photoBase64: string;
}
