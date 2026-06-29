import { type FlatViewFieldGroup } from 'src/engine/metadata-modules/flat-view-field-group/types/flat-view-field-group.type';
import {
  createStandardViewFieldGroupFlatMetadata,
  type CreateStandardViewFieldGroupArgs,
} from 'src/engine/workspace-manager/twenty-standard-application/utils/view-field-group/create-standard-view-field-group-flat-metadata.util';

export const computeStandardLeadViewFieldGroups = (
  args: Omit<CreateStandardViewFieldGroupArgs<'lead'>, 'context'>,
): Record<string, FlatViewFieldGroup> => {
  return {
    leadRecordPageFieldsLeadInfo: createStandardViewFieldGroupFlatMetadata({
      ...args,
      objectName: 'lead',
      context: {
        viewName: 'leadRecordPageFields',
        viewFieldGroupName: 'leadInfo',
        name: 'Lead Info',
        position: 0,
        isVisible: true,
      },
    }),
    leadRecordPageFieldsLocation: createStandardViewFieldGroupFlatMetadata({
      ...args,
      objectName: 'lead',
      context: {
        viewName: 'leadRecordPageFields',
        viewFieldGroupName: 'location',
        name: 'Location',
        position: 1,
        isVisible: true,
      },
    }),
    leadRecordPageFieldsCrm: createStandardViewFieldGroupFlatMetadata({
      ...args,
      objectName: 'lead',
      context: {
        viewName: 'leadRecordPageFields',
        viewFieldGroupName: 'crm',
        name: 'CRM',
        position: 2,
        isVisible: true,
      },
    }),
    leadRecordPageFieldsSystem: createStandardViewFieldGroupFlatMetadata({
      ...args,
      objectName: 'lead',
      context: {
        viewName: 'leadRecordPageFields',
        viewFieldGroupName: 'system',
        name: 'System',
        position: 3,
        isVisible: true,
      },
    }),
  };
};
