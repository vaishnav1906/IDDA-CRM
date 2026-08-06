import { ViewKey, ViewType } from 'twenty-shared/types';

import { type FlatView } from 'src/engine/metadata-modules/flat-view/types/flat-view.type';
import {
  createStandardViewFlatMetadata,
  type CreateStandardViewArgs,
} from 'src/engine/workspace-manager/twenty-standard-application/utils/view/create-standard-view-flat-metadata.util';

export const computeStandardTeamMemberViews = (
  args: Omit<CreateStandardViewArgs<'teamMember'>, 'context'>,
): Record<string, FlatView> => {
  return {
    allTeamMembers: createStandardViewFlatMetadata({
      ...args,
      objectName: 'teamMember',
      context: {
        viewName: 'allTeamMembers',
        name: 'All {objectLabelPlural}',
        type: ViewType.TABLE,
        key: ViewKey.INDEX,
        position: 0,
        icon: 'IconUsers',
      },
    }),
    teamMemberRecordPageFields: createStandardViewFlatMetadata({
      ...args,
      objectName: 'teamMember',
      context: {
        viewName: 'teamMemberRecordPageFields',
        name: 'Team Member Record Page Fields',
        type: ViewType.FIELDS_WIDGET,
        key: null,
        position: 0,
        icon: 'IconUser',
      },
    }),
  };
};
