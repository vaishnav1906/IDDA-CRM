import { styled } from '@linaria/react';
import { MOBILE_VIEWPORT } from 'twenty-ui/theme-constants';

const StyledPanel = styled.div`
  align-items: center;
  background: linear-gradient(160deg, #0b2545 0%, #134074 60%, #1a5276 100%);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  justify-content: center;
  padding: 48px 40px;
  position: relative;
  width: 42%;

  @media (max-width: ${MOBILE_VIEWPORT}px) {
    display: none;
  }
`;

const StyledLogoCard = styled.div`
  align-items: center;
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  display: flex;
  justify-content: center;
  margin-bottom: 32px;
  padding: 24px 32px;
  width: 220px;
`;

const StyledLogoImage = styled.img`
  height: auto;
  max-height: 80px;
  width: 100%;
`;

const StyledTagline = styled.p`
  color: #a8c8e8;
  font-size: 14px;
  font-weight: 400;
  letter-spacing: 0.5px;
  margin: 0 0 48px;
  text-align: center;
  text-transform: uppercase;
`;

const StyledFeatureList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  width: 100%;
`;

const StyledFeatureItem = styled.li`
  align-items: flex-start;
  color: #cce0f5;
  display: flex;
  font-size: 14px;
  gap: 12px;
  line-height: 1.6;
  margin-bottom: 16px;

  &::before {
    color: #5b9bd5;
    content: '✦';
    flex-shrink: 0;
    font-size: 10px;
    margin-top: 4px;
  }
`;

const StyledFooterText = styled.p`
  bottom: 32px;
  color: #4a7fa5;
  font-size: 12px;
  margin: 0;
  position: absolute;
  text-align: center;
`;

export const SignInUpLeftPanel = () => {
  return (
    <StyledPanel>
      <StyledLogoCard>
        <StyledLogoImage
          src="/images/integrations/idda-crm-logo.png"
          alt="IDDA CRM"
        />
      </StyledLogoCard>

      <StyledTagline>Lead & Practice Management</StyledTagline>

      <StyledFeatureList>
        <StyledFeatureItem>
          Manage clinic relationships and doctor networks in one place
        </StyledFeatureItem>
        <StyledFeatureItem>
          Track leads from MedLeads staging through the full sales cycle
        </StyledFeatureItem>
        <StyledFeatureItem>
          Subscription management with renewal tracking and payment status
        </StyledFeatureItem>
        <StyledFeatureItem>
          Role-based access for Sales, Research, Operations, and Leadership
        </StyledFeatureItem>
      </StyledFeatureList>

      <StyledFooterText>Indian Dental Derma Assurance</StyledFooterText>
    </StyledPanel>
  );
};
