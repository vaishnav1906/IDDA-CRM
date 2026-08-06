import { gql } from '@apollo/client';

export const REJECT_WORKSPACE_JOIN_REQUEST = gql`
  mutation RejectWorkspaceJoinRequest($id: UUID!) {
    rejectWorkspaceJoinRequest(id: $id) {
      id
      email
      status
    }
  }
`;
