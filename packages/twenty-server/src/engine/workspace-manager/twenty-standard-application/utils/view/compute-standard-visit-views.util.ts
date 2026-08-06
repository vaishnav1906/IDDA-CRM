import { ViewKey, ViewType } from 'twenty-shared/types';

import { type FlatView } from 'src/engine/metadata-modules/flat-view/types/flat-view.type';
import {
  createStandardViewFlatMetadata,
  type CreateStandardViewArgs,
} from 'src/engine/workspace-manager/twenty-standard-application/utils/view/create-standard-view-flat-metadata.util';

export const computeStandardVisitViews = (
  args: Omit<CreateStandardViewArgs<'visit'>, 'context'>,
): Record<string, FlatView> => {
  return {
    allVisits: createStandardViewFlatMetadata({
      ...args,
      objectName: 'visit',
      context: {
        viewName: 'allVisits',
        name: 'All {objectLabelPlural}',
        type: ViewType.TABLE,
        key: ViewKey.INDEX,
        position: 0,
        icon: 'IconList',
      },
    }),
    visitRecordPageFields: createStandardViewFlatMetadata({
      ...args,
      objectName: 'visit',
      context: {
        viewName: 'visitRecordPageFields',
        name: 'Visit Record Page Fields',
        type: ViewType.FIELDS_WIDGET,
        key: null,
        position: 0,
        icon: 'IconList',
      },
    }),
  };
};
