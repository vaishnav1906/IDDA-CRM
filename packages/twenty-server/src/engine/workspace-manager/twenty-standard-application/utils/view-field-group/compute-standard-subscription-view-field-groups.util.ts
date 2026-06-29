import { type FlatViewFieldGroup } from 'src/engine/metadata-modules/flat-view-field-group/types/flat-view-field-group.type';
import {
  createStandardViewFieldGroupFlatMetadata,
  type CreateStandardViewFieldGroupArgs,
} from 'src/engine/workspace-manager/twenty-standard-application/utils/view-field-group/create-standard-view-field-group-flat-metadata.util';

export const computeStandardSubscriptionViewFieldGroups = (
  args: Omit<CreateStandardViewFieldGroupArgs<'subscription'>, 'context'>,
): Record<string, FlatViewFieldGroup> => {
  return {
    subscriptionRecordPageFieldsPlan: createStandardViewFieldGroupFlatMetadata({
      ...args,
      objectName: 'subscription',
      context: {
        viewName: 'subscriptionRecordPageFields',
        viewFieldGroupName: 'plan',
        name: 'Plan',
        position: 0,
        isVisible: true,
      },
    }),
    subscriptionRecordPageFieldsDates: createStandardViewFieldGroupFlatMetadata({
      ...args,
      objectName: 'subscription',
      context: {
        viewName: 'subscriptionRecordPageFields',
        viewFieldGroupName: 'dates',
        name: 'Dates',
        position: 1,
        isVisible: true,
      },
    }),
    subscriptionRecordPageFieldsRelations: createStandardViewFieldGroupFlatMetadata({
      ...args,
      objectName: 'subscription',
      context: {
        viewName: 'subscriptionRecordPageFields',
        viewFieldGroupName: 'relations',
        name: 'Relations',
        position: 2,
        isVisible: true,
      },
    }),
    subscriptionRecordPageFieldsSystem: createStandardViewFieldGroupFlatMetadata({
      ...args,
      objectName: 'subscription',
      context: {
        viewName: 'subscriptionRecordPageFields',
        viewFieldGroupName: 'system',
        name: 'System',
        position: 3,
        isVisible: true,
      },
    }),
  };
};
