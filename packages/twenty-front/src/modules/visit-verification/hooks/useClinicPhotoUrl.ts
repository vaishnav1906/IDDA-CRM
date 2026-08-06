import { useQuery } from '@apollo/client/react';

import { useApolloCoreClient } from '@/object-metadata/hooks/useApolloCoreClient';

import { GET_CLINIC_PHOTO_URL } from '../graphql/clinicPhotoOperations';

type GetClinicPhotoUrlResult = {
  getClinicPhotoUrl: string | null;
};

/**
 * Fetches a short-lived signed URL for the clinic exterior photo of a visit.
 *
 * getClinicPhotoUrl is a @CoreResolver() registered on the /graphql schema.
 * The default ApolloProvider points to /metadata, so we must use the core
 * client explicitly here.
 */
export const useClinicPhotoUrl = (visitId: string) => {
  const coreClient = useApolloCoreClient();

  const { data, loading, error } = useQuery<
    GetClinicPhotoUrlResult,
    { visitId: string }
  >(GET_CLINIC_PHOTO_URL, {
    variables: { visitId },
    fetchPolicy: 'network-only',
    client: coreClient,
  });

  return {
    photoUrl: data?.getClinicPhotoUrl ?? null,
    loading,
    error,
  };
};
