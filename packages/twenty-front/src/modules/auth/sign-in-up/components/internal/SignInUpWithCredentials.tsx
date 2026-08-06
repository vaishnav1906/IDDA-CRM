import { useHasMultipleAuthMethods } from '@/auth/sign-in-up/hooks/useHasMultipleAuthMethods';
import { useSignInUp } from '@/auth/sign-in-up/hooks/useSignInUp';
import { type Form } from '@/auth/sign-in-up/hooks/useSignInUpForm';
import { lastAuthenticatedMethodState } from '@/auth/states/lastAuthenticatedMethodState';
import {
  SignInUpStep,
  signInUpStepState,
} from '@/auth/states/signInUpStepState';

import { LastUsedPill } from '@/auth/sign-in-up/components/internal/LastUsedPill';
import { SignInUpEmailField } from '@/auth/sign-in-up/components/internal/SignInUpEmailField';
import { SignInUpPasswordField } from '@/auth/sign-in-up/components/internal/SignInUpPasswordField';
import { StyledSSOButtonContainer } from '@/auth/sign-in-up/components/internal/SignInUpSSOButtonStyles';
import { AuthenticatedMethod } from '@/auth/types/AuthenticatedMethod.enum';
import { SignInUpMode } from '@/auth/types/signInUpMode';
import { isRequestingCaptchaTokenState } from '@/captcha/states/isRequestingCaptchaTokenState';
import { captchaState } from '@/client-config/states/captchaState';
import { isDDLLockedState } from '@/client-config/states/isDDLLockedState';
import { REMEMBER_ME_LOCAL_STORAGE_KEY } from '@/auth/constants/RememberMeLocalStorageKey';
import { styled } from '@linaria/react';
import { Trans, useLingui } from '@lingui/react/macro';
import { useMemo, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { isDefined } from 'twenty-shared/utils';
import { Loader } from 'twenty-ui/feedback';
import { Checkbox, CheckboxVariant } from 'twenty-ui/input';
import { MainButton } from 'twenty-ui/input';
import { InputHint } from '@/ui/input/components/InputHint';
import { useAtomState } from '@/ui/utilities/state/jotai/hooks/useAtomState';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledForm = styled.form`
  align-items: center;
  display: flex;
  flex-direction: column;
  max-width: 100%;
  width: 100%;
`;

const StyledRememberMeRow = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: flex-start;
  margin-bottom: ${themeCssVariables.spacing[3]};
  width: 100%;
`;

const StyledRememberMeLabel = styled.label`
  color: ${themeCssVariables.font.color.secondary};
  cursor: pointer;
  font-size: ${themeCssVariables.font.size.sm};
  user-select: none;
`;

export const SignInUpWithCredentials = ({
  isGlobalScope,
}: {
  isGlobalScope?: boolean;
}) => {
  const { t } = useLingui();
  const form = useFormContext<Form>();

  const [signInUpStep, setSignInUpStep] = useAtomState(signInUpStepState);
  const [showErrors, setShowErrors] = useState(false);
  const captcha = useAtomStateValue(captchaState);
  const isDDLLocked = useAtomStateValue(isDDLLockedState);
  const isRequestingCaptchaToken = useAtomStateValue(
    isRequestingCaptchaTokenState,
  );
  const lastAuthenticatedMethod = useAtomStateValue(
    lastAuthenticatedMethodState,
  );
  const hasMultipleAuthMethods = useHasMultipleAuthMethods();

  const [rememberMe, setRememberMe] = useState<boolean>(() => {
    const stored = localStorage.getItem(REMEMBER_ME_LOCAL_STORAGE_KEY);
    return stored !== 'false';
  });

  const handleRememberMeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const checked = event.target.checked;
    setRememberMe(checked);
    localStorage.setItem(REMEMBER_ME_LOCAL_STORAGE_KEY, String(checked));
  };

  const toggleRememberMe = () => {
    const next = !rememberMe;
    setRememberMe(next);
    localStorage.setItem(REMEMBER_ME_LOCAL_STORAGE_KEY, String(next));
  };

  const {
    signInUpMode,
    continueWithEmail,
    continueWithCredentials,
    submitCredentials,
  } = useSignInUp(form);

  const isLastUsed =
    signInUpStep === SignInUpStep.Init &&
    lastAuthenticatedMethod === AuthenticatedMethod.EMAIL &&
    (isGlobalScope || hasMultipleAuthMethods);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitButtonDisabled) return;

    if (signInUpStep === SignInUpStep.Init) {
      continueWithEmail();
    } else if (signInUpStep === SignInUpStep.Email) {
      if (isDefined(form?.formState?.errors?.email)) {
        setShowErrors(true);
        return;
      }
      continueWithCredentials();
    } else if (signInUpStep === SignInUpStep.Password) {
      if (!form.formState.isSubmitting) {
        setShowErrors(true);
        form.handleSubmit(submitCredentials)();
      }
    }
  };

  const onEmailChange = (email: string) => {
    if (email !== form.getValues('email')) {
      setSignInUpStep(SignInUpStep.Email);
    }
  };

  const buttonTitle = useMemo(() => {
    if (signInUpStep === SignInUpStep.Init) {
      return t`Continue with Email`;
    }

    if (
      signInUpMode === SignInUpMode.SignIn &&
      signInUpStep === SignInUpStep.Password
    ) {
      return t`Sign in`;
    }

    if (
      signInUpMode === SignInUpMode.SignUp &&
      signInUpStep === SignInUpStep.Password
    ) {
      return t`Sign up`;
    }

    return t`Continue`;
  }, [signInUpMode, signInUpStep, t]);

  const shouldWaitForCaptchaToken =
    signInUpStep !== SignInUpStep.Init &&
    isDefined(captcha?.provider) &&
    isRequestingCaptchaToken;

  const isEmailStepSubmitButtonDisabledCondition =
    signInUpStep === SignInUpStep.Email &&
    (isDefined(form.formState.errors['email']) || shouldWaitForCaptchaToken);

  const isPasswordStepSubmitButtonDisabledCondition =
    signInUpStep === SignInUpStep.Password &&
    (!form.formState.isValid ||
      form.formState.isSubmitting ||
      shouldWaitForCaptchaToken);

  const isSignUpBlockedByDDLLock =
    isDDLLocked &&
    signInUpMode === SignInUpMode.SignUp &&
    signInUpStep === SignInUpStep.Password;

  const isSubmitButtonDisabled =
    isEmailStepSubmitButtonDisabledCondition ||
    isPasswordStepSubmitButtonDisabledCondition ||
    isSignUpBlockedByDDLLock;

  const showRememberMe =
    signInUpStep === SignInUpStep.Password &&
    signInUpMode === SignInUpMode.SignIn;

  return (
    <>
      {(signInUpStep === SignInUpStep.Password ||
        signInUpStep === SignInUpStep.Email ||
        signInUpStep === SignInUpStep.Init) && (
        <StyledForm onSubmit={handleSubmit}>
          {signInUpStep !== SignInUpStep.Init && (
            <SignInUpEmailField
              showErrors={showErrors}
              onInputChange={onEmailChange}
            />
          )}
          {signInUpStep === SignInUpStep.Password && (
            <SignInUpPasswordField
              showErrors={showErrors}
              signInUpMode={signInUpMode}
            />
          )}
          {showRememberMe && (
            <StyledRememberMeRow>
              <Checkbox
                checked={rememberMe}
                onChange={handleRememberMeChange}
                variant={CheckboxVariant.Primary}
              />
              <StyledRememberMeLabel onClick={toggleRememberMe}>
                <Trans>Remember me</Trans>
              </StyledRememberMeLabel>
            </StyledRememberMeRow>
          )}
          <StyledSSOButtonContainer>
            <MainButton
              title={buttonTitle}
              type="submit"
              variant={
                signInUpStep === SignInUpStep.Init ? 'secondary' : 'primary'
              }
              Icon={() => (form.formState.isSubmitting ? <Loader /> : null)}
              disabled={isSubmitButtonDisabled}
              fullWidth
            />
            {isLastUsed && <LastUsedPill />}
            {isSignUpBlockedByDDLLock && (
              <InputHint>{t`Sign-up is temporarily unavailable during maintenance.`}</InputHint>
            )}
          </StyledSSOButtonContainer>
        </StyledForm>
      )}
    </>
  );
};
