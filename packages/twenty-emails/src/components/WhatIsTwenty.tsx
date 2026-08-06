import { type I18n } from '@lingui/core';
import { MainText } from 'src/components/MainText';
import { SubTitle } from 'src/components/SubTitle';

type WhatIsIddaCrmProps = {
  i18n: I18n;
};

export const WhatIsTwenty = ({ i18n }: WhatIsIddaCrmProps) => {
  return (
    <>
      <SubTitle value={i18n._('What is IDDA CRM?')} />
      <MainText>
        {i18n._(
          "It's a CRM built for the medical device industry, helping teams manage leads, clinics, and doctor relationships efficiently.",
        )}
      </MainText>
    </>
  );
};
