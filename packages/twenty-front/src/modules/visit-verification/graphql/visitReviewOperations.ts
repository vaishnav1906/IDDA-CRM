import { gql } from '@apollo/client';

export const SET_VISIT_REVIEW_DECISION = gql`
  mutation SetVisitReviewDecision($input: SetReviewDecisionInput!) {
    setVisitReviewDecision(input: $input) {
      visitId
      reviewDecision
      reviewComment
    }
  }
`;

export const GET_VISIT_REVIEW_STATE = gql`
  query GetVisitReviewState($filter: VisitFilterInput!) {
    visits(filter: $filter) {
      edges {
        node {
          id
          reviewDecision
          reviewComment
          verificationScore
          verificationStatus
          distanceFromClinic
          selfieStatus
          locationStatus
        }
      }
    }
  }
`;
