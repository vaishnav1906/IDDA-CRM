import { Img } from '@react-email/components';

const logoStyle = {
  marginBottom: '32px',
};

export const Logo = () => {
  return (
    <Img
      src="https://app.idda-crm.com/images/integrations/idda-crm-logo.png"
      alt="IDDA CRM"
      width="160"
      height="52"
      style={logoStyle}
    />
  );
};
