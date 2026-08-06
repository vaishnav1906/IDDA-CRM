import { gql } from '@apollo/client';

export const REQUEST_WORKSPACE_ACCESS = gql`
  mutation RequestWorkspaceAccess($input: RequestWorkspaceAccessInput!) {
    requestWorkspaceAccess(input: $input) {
      id
      email
      status
    }
  }
`;
