import { useMutation } from '@apollo/client/react';

import { useApolloCoreClient } from '@/object-metadata/hooks/useApolloCoreClient';

import { VERIFY_VISIT_MUTATION } from '../graphql/visitVerificationOperations';
import {
  type VerifyVisitInput,
  type VerifyVisitOutput,
} from '../types/visitVerification.types';

type VerifyVisitMutationResult = {
  verifyVisit: VerifyVisitOutput;
};

export const useVerifyVisit = () => {
  const coreClient = useApolloCoreClient();

  const [mutate, { loading, error }] = useMutation<
    VerifyVisitMutationResult,
    { input: VerifyVisitInput }
  >(VERIFY_VISIT_MUTATION, { client: coreClient });

  const verifyVisit = async (
    input: VerifyVisitInput,
  ): Promise<VerifyVisitOutput> => {
    const result = await mutate({ variables: { input } });

    if (!result.data) {
      throw new Error('No data returned from verifyVisit mutation');
    }

    return result.data.verifyVisit;
  };

  return { verifyVisit, loading, error };
};
