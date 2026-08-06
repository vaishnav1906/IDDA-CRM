import { type FlatViewField } from 'src/engine/metadata-modules/flat-view-field/types/flat-view-field.type';
import {
  createStandardViewFieldFlatMetadata,
  type CreateStandardViewFieldArgs,
} from 'src/engine/workspace-manager/twenty-standard-application/utils/view-field/create-standard-view-field-flat-metadata.util';

export const computeStandardTeamMemberViewFields = (
  args: Omit<CreateStandardViewFieldArgs<'teamMember'>, 'context'>,
): Record<string, FlatViewField> => {
  return {
    // allTeamMembers view fields
    allTeamMembersName: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'teamMember',
      context: {
        viewName: 'allTeamMembers',
        viewFieldName: 'name',
        fieldName: 'name',
        position: 0,
        isVisible: true,
        size: 200,
      },
    }),
    allTeamMembersWorkEmail: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'teamMember',
      context: {
        viewName: 'allTeamMembers',
        viewFieldName: 'workEmail',
        fieldName: 'workEmail',
        position: 1,
        isVisible: true,
        size: 200,
      },
    }),
    allTeamMembersDepartment: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'teamMember',
      context: {
        viewName: 'allTeamMembers',
        viewFieldName: 'department',
        fieldName: 'department',
        position: 2,
        isVisible: true,
        size: 160,
      },
    }),
    allTeamMembersRoleLabel: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'teamMember',
      context: {
        viewName: 'allTeamMembers',
        viewFieldName: 'roleLabel',
        fieldName: 'roleLabel',
        position: 3,
        isVisible: true,
        size: 160,
      },
    }),
    allTeamMembersEmploymentStatus: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'teamMember',
      context: {
        viewName: 'allTeamMembers',
        viewFieldName: 'employmentStatus',
        fieldName: 'employmentStatus',
        position: 4,
        isVisible: true,
        size: 130,
      },
    }),
    allTeamMembersPhone: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'teamMember',
      context: {
        viewName: 'allTeamMembers',
        viewFieldName: 'phone',
        fieldName: 'phone',
        position: 5,
        isVisible: true,
        size: 150,
      },
    }),

    // teamMemberRecordPageFields — identity group
    teamMemberRecordPageFieldsName: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'teamMember',
      context: {
        viewName: 'teamMemberRecordPageFields',
        viewFieldName: 'name',
        fieldName: 'name',
        position: 0,
        isVisible: true,
        size: 150,
        viewFieldGroupName: 'identity',
      },
    }),
    teamMemberRecordPageFieldsWorkEmail: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'teamMember',
      context: {
        viewName: 'teamMemberRecordPageFields',
        viewFieldName: 'workEmail',
        fieldName: 'workEmail',
        position: 1,
        isVisible: true,
        size: 150,
        viewFieldGroupName: 'identity',
      },
    }),
    teamMemberRecordPageFieldsPhone: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'teamMember',
      context: {
        viewName: 'teamMemberRecordPageFields',
        viewFieldName: 'phone',
        fieldName: 'phone',
        position: 2,
        isVisible: true,
        size: 150,
        viewFieldGroupName: 'identity',
      },
    }),
    teamMemberRecordPageFieldsRoleLabel: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'teamMember',
      context: {
        viewName: 'teamMemberRecordPageFields',
        viewFieldName: 'roleLabel',
        fieldName: 'roleLabel',
        position: 3,
        isVisible: true,
        size: 150,
        viewFieldGroupName: 'identity',
      },
    }),

    // teamMemberRecordPageFields — employment group
    teamMemberRecordPageFieldsDepartment: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'teamMember',
      context: {
        viewName: 'teamMemberRecordPageFields',
        viewFieldName: 'department',
        fieldName: 'department',
        position: 0,
        isVisible: true,
        size: 150,
        viewFieldGroupName: 'employment',
      },
    }),
    teamMemberRecordPageFieldsEmploymentStatus: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'teamMember',
      context: {
        viewName: 'teamMemberRecordPageFields',
        viewFieldName: 'employmentStatus',
        fieldName: 'employmentStatus',
        position: 1,
        isVisible: true,
        size: 150,
        viewFieldGroupName: 'employment',
      },
    }),
    teamMemberRecordPageFieldsEmployeeType: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'teamMember',
      context: {
        viewName: 'teamMemberRecordPageFields',
        viewFieldName: 'employeeType',
        fieldName: 'employeeType',
        position: 2,
        isVisible: true,
        size: 150,
        viewFieldGroupName: 'employment',
      },
    }),
    teamMemberRecordPageFieldsJoiningDate: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'teamMember',
      context: {
        viewName: 'teamMemberRecordPageFields',
        viewFieldName: 'joiningDate',
        fieldName: 'joiningDate',
        position: 3,
        isVisible: true,
        size: 150,
        viewFieldGroupName: 'employment',
      },
    }),
    teamMemberRecordPageFieldsLocation: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'teamMember',
      context: {
        viewName: 'teamMemberRecordPageFields',
        viewFieldName: 'location',
        fieldName: 'location',
        position: 4,
        isVisible: true,
        size: 150,
        viewFieldGroupName: 'employment',
      },
    }),
    teamMemberRecordPageFieldsReportingManager: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'teamMember',
      context: {
        viewName: 'teamMemberRecordPageFields',
        viewFieldName: 'reportingManager',
        fieldName: 'reportingManager',
        position: 5,
        isVisible: true,
        size: 150,
        viewFieldGroupName: 'employment',
      },
    }),

    // teamMemberRecordPageFields — sync group
    teamMemberRecordPageFieldsSource: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'teamMember',
      context: {
        viewName: 'teamMemberRecordPageFields',
        viewFieldName: 'source',
        fieldName: 'source',
        position: 0,
        isVisible: true,
        size: 150,
        viewFieldGroupName: 'sync',
      },
    }),
    teamMemberRecordPageFieldsLastSyncedAt: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'teamMember',
      context: {
        viewName: 'teamMemberRecordPageFields',
        viewFieldName: 'lastSyncedAt',
        fieldName: 'lastSyncedAt',
        position: 1,
        isVisible: true,
        size: 150,
        viewFieldGroupName: 'sync',
      },
    }),
  };
};
