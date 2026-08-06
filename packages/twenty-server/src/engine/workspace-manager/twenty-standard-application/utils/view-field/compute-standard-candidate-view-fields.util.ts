import { type FlatViewField } from 'src/engine/metadata-modules/flat-view-field/types/flat-view-field.type';
import {
  createStandardViewFieldFlatMetadata,
  type CreateStandardViewFieldArgs,
} from 'src/engine/workspace-manager/twenty-standard-application/utils/view-field/create-standard-view-field-flat-metadata.util';

export const computeStandardCandidateViewFields = (
  args: Omit<CreateStandardViewFieldArgs<'candidate'>, 'context'>,
): Record<string, FlatViewField> => {
  return {
    // allCandidates view fields
    allCandidatesName: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'candidate',
      context: {
        viewName: 'allCandidates',
        viewFieldName: 'name',
        fieldName: 'name',
        position: 0,
        isVisible: true,
        size: 200,
      },
    }),
    allCandidatesPhone: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'candidate',
      context: {
        viewName: 'allCandidates',
        viewFieldName: 'phone',
        fieldName: 'phone',
        position: 1,
        isVisible: true,
        size: 150,
      },
    }),
    allCandidatesEmail: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'candidate',
      context: {
        viewName: 'allCandidates',
        viewFieldName: 'email',
        fieldName: 'email',
        position: 2,
        isVisible: true,
        size: 200,
      },
    }),
    allCandidatesStatus: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'candidate',
      context: {
        viewName: 'allCandidates',
        viewFieldName: 'status',
        fieldName: 'status',
        position: 3,
        isVisible: true,
        size: 120,
      },
    }),
    allCandidatesAssignedTo: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'candidate',
      context: {
        viewName: 'allCandidates',
        viewFieldName: 'assignedTo',
        fieldName: 'assignedTo',
        position: 4,
        isVisible: true,
        size: 150,
      },
    }),

    // candidateRecordPageFields — candidateInfo group
    candidateRecordPageFieldsName: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'candidate',
      context: {
        viewName: 'candidateRecordPageFields',
        viewFieldName: 'name',
        fieldName: 'name',
        position: 0,
        isVisible: true,
        size: 150,
        viewFieldGroupName: 'candidateInfo',
      },
    }),
    candidateRecordPageFieldsPhone: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'candidate',
      context: {
        viewName: 'candidateRecordPageFields',
        viewFieldName: 'phone',
        fieldName: 'phone',
        position: 1,
        isVisible: true,
        size: 150,
        viewFieldGroupName: 'candidateInfo',
      },
    }),
    candidateRecordPageFieldsEmail: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'candidate',
      context: {
        viewName: 'candidateRecordPageFields',
        viewFieldName: 'email',
        fieldName: 'email',
        position: 2,
        isVisible: true,
        size: 150,
        viewFieldGroupName: 'candidateInfo',
      },
    }),

    // candidateRecordPageFields — crm group
    candidateRecordPageFieldsStatus: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'candidate',
      context: {
        viewName: 'candidateRecordPageFields',
        viewFieldName: 'status',
        fieldName: 'status',
        position: 0,
        isVisible: true,
        size: 150,
        viewFieldGroupName: 'crm',
      },
    }),
    candidateRecordPageFieldsNextFollowUpDate: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'candidate',
      context: {
        viewName: 'candidateRecordPageFields',
        viewFieldName: 'nextFollowUpDate',
        fieldName: 'nextFollowUpDate',
        position: 1,
        isVisible: true,
        size: 150,
        viewFieldGroupName: 'crm',
      },
    }),
    candidateRecordPageFieldsAssignedTo: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'candidate',
      context: {
        viewName: 'candidateRecordPageFields',
        viewFieldName: 'assignedTo',
        fieldName: 'assignedTo',
        position: 2,
        isVisible: true,
        size: 150,
        viewFieldGroupName: 'crm',
      },
    }),
    candidateRecordPageFieldsTaskTargets: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'candidate',
      context: {
        viewName: 'candidateRecordPageFields',
        viewFieldName: 'taskTargets',
        fieldName: 'taskTargets',
        position: 3,
        isVisible: false,
        size: 150,
        viewFieldGroupName: 'crm',
      },
    }),
    candidateRecordPageFieldsNoteTargets: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'candidate',
      context: {
        viewName: 'candidateRecordPageFields',
        viewFieldName: 'noteTargets',
        fieldName: 'noteTargets',
        position: 4,
        isVisible: false,
        size: 150,
        viewFieldGroupName: 'crm',
      },
    }),

    // candidateRecordPageFields — system group
    candidateRecordPageFieldsCreatedAt: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'candidate',
      context: {
        viewName: 'candidateRecordPageFields',
        viewFieldName: 'createdAt',
        fieldName: 'createdAt',
        position: 0,
        isVisible: true,
        size: 150,
        viewFieldGroupName: 'system',
      },
    }),
    candidateRecordPageFieldsCreatedBy: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'candidate',
      context: {
        viewName: 'candidateRecordPageFields',
        viewFieldName: 'createdBy',
        fieldName: 'createdBy',
        position: 1,
        isVisible: true,
        size: 150,
        viewFieldGroupName: 'system',
      },
    }),
  };
};
