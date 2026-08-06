import { isValidAuthTokenPair } from '@/apollo/utils/isValidAuthTokenPair';
import { REMEMBER_ME_LOCAL_STORAGE_KEY } from '@/auth/constants/RememberMeLocalStorageKey';
import { createAtomState } from '@/ui/utilities/state/jotai/utils/createAtomState';
import { type AuthTokenPair } from '~/generated-metadata/graphql';

export const TOKEN_PAIR_LOCAL_STORAGE_KEY = 'tokenPairState';

// When "Remember me" is unchecked after login, the token is written to
// sessionStorage (cleared on tab close) rather than localStorage. On page
// reload we need to read from sessionStorage first so the user stays signed in
// within the same session.
const resolveInitialTokenPair = (): AuthTokenPair | null => {
  const rememberMe = localStorage.getItem(REMEMBER_ME_LOCAL_STORAGE_KEY) !== 'false';

  if (!rememberMe) {
    const sessionValue = sessionStorage.getItem(TOKEN_PAIR_LOCAL_STORAGE_KEY);
    if (sessionValue) {
      try {
        const parsed = JSON.parse(sessionValue);
        if (isValidAuthTokenPair(parsed)) return parsed as AuthTokenPair;
      } catch {
        // fall through to localStorage below
      }
    }
    return null;
  }

  const localValue = localStorage.getItem(TOKEN_PAIR_LOCAL_STORAGE_KEY);
  if (localValue) {
    try {
      const parsed = JSON.parse(localValue);
      if (isValidAuthTokenPair(parsed)) return parsed as AuthTokenPair;
    } catch {
      // fall through
    }
  }
  return null;
};

export const tokenPairState = createAtomState<AuthTokenPair | null>({
  key: TOKEN_PAIR_LOCAL_STORAGE_KEY,
  defaultValue: resolveInitialTokenPair(),
  useLocalStorage: true,
  localStorageOptions: { getOnInit: true },
  validateInitFn: (payload) => isValidAuthTokenPair(payload),
});
