import { useQuery } from '@apollo/client/react';

import { useApolloCoreClient } from '@/object-metadata/hooks/useApolloCoreClient';

import { GET_SELFIE_PHOTO_URL } from '../graphql/selfiePhotoOperations';

type GetSelfiePhotoUrlResult = {
  getSelfiePhotoUrl: string | null;
};

export const useSelfiePhotoUrl = (visitId: string) => {
  const coreClient = useApolloCoreClient();

  const { data, loading, error } = useQuery<
    GetSelfiePhotoUrlResult,
    { visitId: string }
  >(GET_SELFIE_PHOTO_URL, {
    variables: { visitId },
    fetchPolicy: 'network-only',
    client: coreClient,
  });

  return {
    selfieUrl: data?.getSelfiePhotoUrl ?? null,
    loading,
    error,
  };
};
