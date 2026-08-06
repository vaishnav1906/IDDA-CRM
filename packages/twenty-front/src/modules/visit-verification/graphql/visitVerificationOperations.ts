import { gql } from '@apollo/client';

export const VERIFY_VISIT_MUTATION = gql`
  mutation VerifyVisit($input: VerifyVisitInput!) {
    verifyVisit(input: $input) {
      success
      verificationScore
      verificationStatus
      selfieStatus
      locationStatus
      distanceFromClinic
      imageReused
      selfieUrl
      issues
      scoreBreakdown
    }
  }
`;
