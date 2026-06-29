import { ViewKey, ViewType } from 'twenty-shared/types';

import { type FlatView } from 'src/engine/metadata-modules/flat-view/types/flat-view.type';
import {
  createStandardViewFlatMetadata,
  type CreateStandardViewArgs,
} from 'src/engine/workspace-manager/twenty-standard-application/utils/view/create-standard-view-flat-metadata.util';

export const computeStandardLeadViews = (
  args: Omit<CreateStandardViewArgs<'lead'>, 'context'>,
): Record<string, FlatView> => {
  return {
    allLeads: createStandardViewFlatMetadata({
      ...args,
      objectName: 'lead',
      context: {
        viewName: 'allLeads',
        name: 'All {objectLabelPlural}',
        type: ViewType.TABLE,
        key: ViewKey.INDEX,
        position: 0,
        icon: 'IconList',
      },
    }),
    leadRecordPageFields: createStandardViewFlatMetadata({
      ...args,
      objectName: 'lead',
      context: {
        viewName: 'leadRecordPageFields',
        name: 'Lead Record Page Fields',
        type: ViewType.FIELDS_WIDGET,
        key: null,
        position: 0,
        icon: 'IconList',
      },
    }),
  };
};
