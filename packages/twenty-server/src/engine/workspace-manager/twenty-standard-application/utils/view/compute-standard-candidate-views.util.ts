import { ViewKey, ViewType } from 'twenty-shared/types';

import { type FlatView } from 'src/engine/metadata-modules/flat-view/types/flat-view.type';
import {
  createStandardViewFlatMetadata,
  type CreateStandardViewArgs,
} from 'src/engine/workspace-manager/twenty-standard-application/utils/view/create-standard-view-flat-metadata.util';

export const computeStandardCandidateViews = (
  args: Omit<CreateStandardViewArgs<'candidate'>, 'context'>,
): Record<string, FlatView> => {
  return {
    allCandidates: createStandardViewFlatMetadata({
      ...args,
      objectName: 'candidate',
      context: {
        viewName: 'allCandidates',
        name: 'All {objectLabelPlural}',
        type: ViewType.TABLE,
        key: ViewKey.INDEX,
        position: 0,
        icon: 'IconList',
      },
    }),
    candidateRecordPageFields: createStandardViewFlatMetadata({
      ...args,
      objectName: 'candidate',
      context: {
        viewName: 'candidateRecordPageFields',
        name: 'Candidate Record Page Fields',
        type: ViewType.FIELDS_WIDGET,
        key: null,
        position: 0,
        icon: 'IconList',
      },
    }),
  };
};
