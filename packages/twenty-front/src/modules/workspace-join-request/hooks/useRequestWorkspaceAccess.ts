import { useMutation } from '@apollo/client/react';

import { useSnackBar } from '@/ui/feedback/snack-bar-manager/hooks/useSnackBar';
import { REQUEST_WORKSPACE_ACCESS } from '@/workspace-join-request/graphql/mutations/requestWorkspaceAccess';

type RequestWorkspaceAccessInput = {
  email: string;
  firstName: string;
  lastName?: string | null;
  message?: string | null;
  workspaceId?: string | null;
};

export const useRequestWorkspaceAccess = () => {
  const [requestAccessMutation, { loading }] = useMutation(
    REQUEST_WORKSPACE_ACCESS,
  );
  const { enqueueErrorSnackBar } = useSnackBar();

  const requestAccess = async (input: RequestWorkspaceAccessInput) => {
    return requestAccessMutation({
      variables: { input },
      onError: (error) => {
        enqueueErrorSnackBar({ apolloError: error });
      },
    });
  };

  return { requestAccess, loading };
};
