import { useState } from 'react';

import { styled } from '@linaria/react';
import { Trans, useLingui } from '@lingui/react/macro';
import { Link } from 'react-router-dom';
import { AppPath } from 'twenty-shared/types';
import { ModalContent } from 'twenty-ui/surfaces';
import { MainButton } from 'twenty-ui/input';
import { AnimatedEaseIn } from 'twenty-ui/layout';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { workspacePublicDataState } from '@/auth/states/workspacePublicDataState';
import { Logo } from '@/auth/components/Logo';
import { Title } from '@/auth/components/Title';
import { StyledOnboardingContentContainer } from '@/auth/components/StyledOnboardingContentContainer';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { TextInput } from '@/ui/input/components/TextInput';
import { useRequestWorkspaceAccess } from '@/workspace-join-request/hooks/useRequestWorkspaceAccess';

const StyledForm = styled.form`
  align-items: center;
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[3]};
  max-width: 100%;
  width: 100%;
`;

const StyledTextarea = styled.textarea`
  background: ${themeCssVariables.background.secondary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.md};
  color: ${themeCssVariables.font.color.primary};
  font-family: inherit;
  font-size: ${themeCssVariables.font.size.md};
  line-height: 1.5;
  min-height: 80px;
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};
  resize: vertical;
  width: 100%;

  &::placeholder {
    color: ${themeCssVariables.font.color.light};
  }

  &:focus {
    border-color: ${themeCssVariables.border.color.strong};
    outline: none;
  }
`;

const StyledLinkContainer = styled.div`
  align-items: center;
  color: ${themeCssVariables.font.color.tertiary};
  display: flex;
  font-size: ${themeCssVariables.font.size.sm};
  gap: ${themeCssVariables.spacing[1]};
  justify-content: center;
  margin-top: ${themeCssVariables.spacing[2]};

  a {
    color: ${themeCssVariables.font.color.tertiary};
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }
`;

const StyledSuccessContainer = styled.div`
  align-items: center;
  color: ${themeCssVariables.font.color.secondary};
  display: flex;
  flex-direction: column;
  font-size: ${themeCssVariables.font.size.md};
  gap: ${themeCssVariables.spacing[4]};
  text-align: center;
`;

const StyledSuccessIcon = styled.div`
  color: ${themeCssVariables.color.green};
  font-size: 48px;
`;

export const RequestAccess = () => {
  const { t } = useLingui();
  const workspacePublicData = useAtomStateValue(workspacePublicDataState);
  const { requestAccess, loading } = useRequestWorkspaceAccess();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!firstName.trim() || !email.trim()) {
      setError(t`First name and email are required.`);
      return;
    }

    const workspaceId = workspacePublicData?.id;
    if (!workspaceId) {
      setError(t`Unable to determine workspace. Please try again.`);
      return;
    }

    const result = await requestAccess({
      firstName: firstName.trim(),
      lastName: lastName.trim() || null,
      email: email.trim(),
      message: message.trim() || null,
      workspaceId,
    });

    if (result.data) {
      setSubmitted(true);
    }
  };

  if (submitted) {
    return (
      <ModalContent isVerticallyCentered isHorizontallyCentered>
        <AnimatedEaseIn>
          <Logo
            secondaryLogo={workspacePublicData?.logo}
            placeholder={workspacePublicData?.displayName}
          />
        </AnimatedEaseIn>
        <Title>
          <Trans>Request Submitted</Trans>
        </Title>
        <StyledSuccessContainer>
          <p>
            <Trans>
              Your request has been submitted. An admin will review it and you
              will receive an email if approved.
            </Trans>
          </p>
          <StyledLinkContainer>
            <Link to={AppPath.SignInUp}>
              <Trans>Back to Sign In</Trans>
            </Link>
          </StyledLinkContainer>
        </StyledSuccessContainer>
      </ModalContent>
    );
  }

  return (
    <ModalContent isVerticallyCentered isHorizontallyCentered>
      <AnimatedEaseIn>
        <Logo
          secondaryLogo={workspacePublicData?.logo}
          placeholder={workspacePublicData?.displayName}
        />
      </AnimatedEaseIn>
      <Title animate>
        <Trans>Request Access</Trans>
      </Title>
      <StyledOnboardingContentContainer>
        <StyledForm onSubmit={handleSubmit}>
          <TextInput
            label={t`First name`}
            value={firstName}
            onChange={setFirstName}
            placeholder={t`Your first name`}
            required
            fullWidth
          />
          <TextInput
            label={t`Last name (optional)`}
            value={lastName}
            onChange={setLastName}
            placeholder={t`Your last name`}
            fullWidth
          />
          <TextInput
            label={t`Work email`}
            type="email"
            value={email}
            onChange={setEmail}
            placeholder={t`you@example.com`}
            required
            fullWidth
          />
          <StyledTextarea
            placeholder={t`Why do you need access? (optional)`}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={1000}
          />
          {error !== null && (
            <span style={{ color: themeCssVariables.color.red, fontSize: themeCssVariables.font.size.sm }}>
              {error}
            </span>
          )}
          <MainButton
            title={t`Request Access`}
            type="submit"
            disabled={loading}
            fullWidth
          />
        </StyledForm>
      </StyledOnboardingContentContainer>
      <StyledLinkContainer>
        <Trans>Already have an account?</Trans>
        <Link to={AppPath.SignInUp}>
          <Trans>Sign in</Trans>
        </Link>
      </StyledLinkContainer>
    </ModalContent>
  );
};
