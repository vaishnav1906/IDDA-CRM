import { type FlatViewFieldGroup } from 'src/engine/metadata-modules/flat-view-field-group/types/flat-view-field-group.type';
import {
  createStandardViewFieldGroupFlatMetadata,
  type CreateStandardViewFieldGroupArgs,
} from 'src/engine/workspace-manager/twenty-standard-application/utils/view-field-group/create-standard-view-field-group-flat-metadata.util';

export const computeStandardCandidateViewFieldGroups = (
  args: Omit<CreateStandardViewFieldGroupArgs<'candidate'>, 'context'>,
): Record<string, FlatViewFieldGroup> => {
  return {
    candidateRecordPageFieldsCandidateInfo: createStandardViewFieldGroupFlatMetadata({
      ...args,
      objectName: 'candidate',
      context: {
        viewName: 'candidateRecordPageFields',
        viewFieldGroupName: 'candidateInfo',
        name: 'Candidate Info',
        position: 0,
        isVisible: true,
      },
    }),
    candidateRecordPageFieldsCrm: createStandardViewFieldGroupFlatMetadata({
      ...args,
      objectName: 'candidate',
      context: {
        viewName: 'candidateRecordPageFields',
        viewFieldGroupName: 'crm',
        name: 'CRM',
        position: 1,
        isVisible: true,
      },
    }),
    candidateRecordPageFieldsSystem: createStandardViewFieldGroupFlatMetadata({
      ...args,
      objectName: 'candidate',
      context: {
        viewName: 'candidateRecordPageFields',
        viewFieldGroupName: 'system',
        name: 'System',
        position: 2,
        isVisible: true,
      },
    }),
  };
};
