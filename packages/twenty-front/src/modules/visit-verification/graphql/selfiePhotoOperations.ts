import { gql } from '@apollo/client';

export const GET_SELFIE_PHOTO_URL = gql`
  query GetSelfiePhotoUrl($visitId: String!) {
    getSelfiePhotoUrl(visitId: $visitId)
  }
`;
