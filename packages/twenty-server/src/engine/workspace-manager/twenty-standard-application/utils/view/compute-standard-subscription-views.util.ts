import { ViewKey, ViewType } from 'twenty-shared/types';

import { type FlatView } from 'src/engine/metadata-modules/flat-view/types/flat-view.type';
import {
  createStandardViewFlatMetadata,
  type CreateStandardViewArgs,
} from 'src/engine/workspace-manager/twenty-standard-application/utils/view/create-standard-view-flat-metadata.util';

export const computeStandardSubscriptionViews = (
  args: Omit<CreateStandardViewArgs<'subscription'>, 'context'>,
): Record<string, FlatView> => {
  return {
    allSubscriptions: createStandardViewFlatMetadata({
      ...args,
      objectName: 'subscription',
      context: {
        viewName: 'allSubscriptions',
        name: 'All {objectLabelPlural}',
        type: ViewType.TABLE,
        key: ViewKey.INDEX,
        position: 0,
        icon: 'IconList',
      },
    }),
    subscriptionRecordPageFields: createStandardViewFlatMetadata({
      ...args,
      objectName: 'subscription',
      context: {
        viewName: 'subscriptionRecordPageFields',
        name: 'Subscription Record Page Fields',
        type: ViewType.FIELDS_WIDGET,
        key: null,
        position: 0,
        icon: 'IconList',
      },
    }),
  };
};
