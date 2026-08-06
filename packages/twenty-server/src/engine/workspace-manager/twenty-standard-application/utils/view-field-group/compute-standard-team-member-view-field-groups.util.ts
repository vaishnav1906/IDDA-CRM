import { type FlatViewFieldGroup } from 'src/engine/metadata-modules/flat-view-field-group/types/flat-view-field-group.type';
import {
  createStandardViewFieldGroupFlatMetadata,
  type CreateStandardViewFieldGroupArgs,
} from 'src/engine/workspace-manager/twenty-standard-application/utils/view-field-group/create-standard-view-field-group-flat-metadata.util';

export const computeStandardTeamMemberViewFieldGroups = (
  args: Omit<CreateStandardViewFieldGroupArgs<'teamMember'>, 'context'>,
): Record<string, FlatViewFieldGroup> => {
  return {
    teamMemberRecordPageFieldsIdentity: createStandardViewFieldGroupFlatMetadata({
      ...args,
      objectName: 'teamMember',
      context: {
        viewName: 'teamMemberRecordPageFields',
        viewFieldGroupName: 'identity',
        name: 'Identity',
        position: 0,
        isVisible: true,
      },
    }),
    teamMemberRecordPageFieldsEmployment: createStandardViewFieldGroupFlatMetadata({
      ...args,
      objectName: 'teamMember',
      context: {
        viewName: 'teamMemberRecordPageFields',
        viewFieldGroupName: 'employment',
        name: 'Employment',
        position: 1,
        isVisible: true,
      },
    }),
    teamMemberRecordPageFieldsSync: createStandardViewFieldGroupFlatMetadata({
      ...args,
      objectName: 'teamMember',
      context: {
        viewName: 'teamMemberRecordPageFields',
        viewFieldGroupName: 'sync',
        name: 'Sync',
        position: 2,
        isVisible: true,
      },
    }),
  };
};
