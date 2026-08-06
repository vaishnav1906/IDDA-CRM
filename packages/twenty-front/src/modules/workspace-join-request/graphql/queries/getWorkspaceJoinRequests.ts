import { gql } from '@apollo/client';

export const GET_WORKSPACE_JOIN_REQUESTS = gql`
  query GetWorkspaceJoinRequests {
    workspaceJoinRequests {
      id
      email
      firstName
      lastName
      message
      status
      createdAt
    }
  }
`;
