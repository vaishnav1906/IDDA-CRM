import { gql } from '@apollo/client';

export const GET_CLINIC_PHOTO_URL = gql`
  query GetClinicPhotoUrl($visitId: String!) {
    getClinicPhotoUrl(visitId: $visitId)
  }
`;
