import { useMutation } from '@apollo/client/react';

import { useSnackBar } from '@/ui/feedback/snack-bar-manager/hooks/useSnackBar';
import { APPROVE_WORKSPACE_JOIN_REQUEST } from '@/workspace-join-request/graphql/mutations/approveWorkspaceJoinRequest';
import { GET_WORKSPACE_JOIN_REQUESTS } from '@/workspace-join-request/graphql/queries/getWorkspaceJoinRequests';

export const useApproveWorkspaceJoinRequest = () => {
  const [approveMutation, { loading }] = useMutation(
    APPROVE_WORKSPACE_JOIN_REQUEST,
  );
  const { enqueueErrorSnackBar, enqueueSuccessSnackBar } = useSnackBar();

  const approveRequest = async (id: string, roleId?: string | null) => {
    return approveMutation({
      variables: { id, roleId: roleId ?? null },
      refetchQueries: [GET_WORKSPACE_JOIN_REQUESTS],
      onError: (error) => {
        enqueueErrorSnackBar({ apolloError: error });
      },
      onCompleted: () => {
        enqueueSuccessSnackBar({ message: 'Invitation sent successfully' });
      },
    });
  };

  return { approveRequest, loading };
};
