import { Logo } from '@/auth/components/Logo';
import { Title } from '@/auth/components/Title';
import { FooterNote } from '@/auth/sign-in-up/components/FooterNote';
import { WorkspaceSelectionFooter } from '@/auth/sign-in-up/components/WorkspaceSelectionFooter';
import { SignInUpStep } from '@/auth/states/signInUpStepState';
import { styled } from '@linaria/react';
import { type JSX } from 'react';
import { AppPath } from 'twenty-shared/types';
import { AnimatedEaseIn } from 'twenty-ui/layout';
import { themeCssVariables } from 'twenty-ui/theme-constants';
import { type PublicWorkspaceData } from '~/generated-metadata/graphql';

type SignInUpV2StandardContentProps = {
  workspacePublicData: PublicWorkspaceData | null;
  signInUpForm: JSX.Element | null;
  signInUpStep: SignInUpStep;
  title: string;
  onClickOnLogo: () => void;
};

const StyledContainer = styled.div`
  align-items: center;
  box-sizing: border-box;
  display: flex;
  flex: 1;
  flex-direction: column;
  justify-content: center;
  margin: 0 auto;
  max-width: 400px;
  padding: 48px 24px;
  width: 100%;
`;

const StyledTitle = styled.div`
  color: ${themeCssVariables.font.color.primary};
  font-size: 22px;
  font-weight: ${themeCssVariables.font.weight.semiBold};
  margin-bottom: 28px;
  text-align: center;
  width: 100%;
`;

const StyledFooterArea = styled.div`
  margin-top: 24px;
  width: 100%;
`;

export const SignInUpV2StandardContent = ({
  workspacePublicData,
  signInUpForm,
  signInUpStep,
  title,
  onClickOnLogo,
}: SignInUpV2StandardContentProps) => {
  const hasWorkspaceLogo =
    !!workspacePublicData?.logo || !!workspacePublicData?.displayName;

  return (
    <StyledContainer>
      {hasWorkspaceLogo && (
        <AnimatedEaseIn>
          <Logo
            secondaryLogo={workspacePublicData?.logo}
            placeholder={workspacePublicData?.displayName}
            onClick={onClickOnLogo}
            to={AppPath.SignInUpV2}
          />
        </AnimatedEaseIn>
      )}
      <StyledTitle>{title}</StyledTitle>
      {signInUpForm}
      {signInUpStep === SignInUpStep.WorkspaceSelection && (
        <StyledFooterArea>
          <WorkspaceSelectionFooter />
        </StyledFooterArea>
      )}
      {![
        SignInUpStep.Password,
        SignInUpStep.TwoFactorAuthenticationProvision,
        SignInUpStep.TwoFactorAuthenticationVerification,
        SignInUpStep.WorkspaceSelection,
        SignInUpStep.WorkspaceCreation,
      ].includes(signInUpStep) && (
        <StyledFooterArea>
          <FooterNote secondaryAgreement="dataProcessingAgreement" />
        </StyledFooterArea>
      )}
    </StyledContainer>
  );
};
