import { gql } from '@apollo/client';

export const APPROVE_WORKSPACE_JOIN_REQUEST = gql`
  mutation ApproveWorkspaceJoinRequest($id: UUID!, $roleId: UUID) {
    approveWorkspaceJoinRequest(id: $id, roleId: $roleId) {
      id
      email
      status
    }
  }
`;
