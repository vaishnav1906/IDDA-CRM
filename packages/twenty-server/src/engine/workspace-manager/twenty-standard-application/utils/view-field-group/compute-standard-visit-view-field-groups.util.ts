import { type FlatViewFieldGroup } from 'src/engine/metadata-modules/flat-view-field-group/types/flat-view-field-group.type';
import {
  createStandardViewFieldGroupFlatMetadata,
  type CreateStandardViewFieldGroupArgs,
} from 'src/engine/workspace-manager/twenty-standard-application/utils/view-field-group/create-standard-view-field-group-flat-metadata.util';

export const computeStandardVisitViewFieldGroups = (
  args: Omit<CreateStandardViewFieldGroupArgs<'visit'>, 'context'>,
): Record<string, FlatViewFieldGroup> => {
  return {
    visitRecordPageFieldsVerification: createStandardViewFieldGroupFlatMetadata({
      ...args,
      objectName: 'visit',
      context: {
        viewName: 'visitRecordPageFields',
        viewFieldGroupName: 'verification',
        name: 'Verification',
        position: 0,
        isVisible: true,
      },
    }),
    visitRecordPageFieldsLocation: createStandardViewFieldGroupFlatMetadata({
      ...args,
      objectName: 'visit',
      context: {
        viewName: 'visitRecordPageFields',
        viewFieldGroupName: 'location',
        name: 'Location',
        position: 1,
        isVisible: true,
      },
    }),
    visitRecordPageFieldsCapture: createStandardViewFieldGroupFlatMetadata({
      ...args,
      objectName: 'visit',
      context: {
        viewName: 'visitRecordPageFields',
        viewFieldGroupName: 'capture',
        name: 'Capture',
        position: 2,
        isVisible: true,
      },
    }),
    visitRecordPageFieldsReview: createStandardViewFieldGroupFlatMetadata({
      ...args,
      objectName: 'visit',
      context: {
        viewName: 'visitRecordPageFields',
        viewFieldGroupName: 'review',
        name: 'Review',
        position: 3,
        isVisible: true,
      },
    }),
  };
};
