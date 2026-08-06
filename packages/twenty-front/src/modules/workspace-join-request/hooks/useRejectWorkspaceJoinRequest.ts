import { useMutation } from '@apollo/client/react';

import { useSnackBar } from '@/ui/feedback/snack-bar-manager/hooks/useSnackBar';
import { REJECT_WORKSPACE_JOIN_REQUEST } from '@/workspace-join-request/graphql/mutations/rejectWorkspaceJoinRequest';
import { GET_WORKSPACE_JOIN_REQUESTS } from '@/workspace-join-request/graphql/queries/getWorkspaceJoinRequests';

export const useRejectWorkspaceJoinRequest = () => {
  const [rejectMutation, { loading }] = useMutation(
    REJECT_WORKSPACE_JOIN_REQUEST,
  );
  const { enqueueErrorSnackBar, enqueueSuccessSnackBar } = useSnackBar();

  const rejectRequest = async (id: string) => {
    return rejectMutation({
      variables: { id },
      refetchQueries: [GET_WORKSPACE_JOIN_REQUESTS],
      onError: (error) => {
        enqueueErrorSnackBar({ apolloError: error });
      },
      onCompleted: () => {
        enqueueSuccessSnackBar({ message: 'Request rejected' });
      },
    });
  };

  return { rejectRequest, loading };
};
