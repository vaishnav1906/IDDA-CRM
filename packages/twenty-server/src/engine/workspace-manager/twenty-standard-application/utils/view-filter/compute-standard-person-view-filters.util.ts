import { ViewFilterOperand } from 'twenty-shared/types';

import { type FlatViewFilter } from 'src/engine/metadata-modules/flat-view-filter/types/flat-view-filter.type';
import {
  createStandardViewFilterFlatMetadata,
  type CreateStandardViewFilterArgs,
} from 'src/engine/workspace-manager/twenty-standard-application/utils/view-filter/create-standard-view-filter-flat-metadata.util';

export const computeStandardPersonViewFilters = (
  args: Omit<CreateStandardViewFilterArgs<'person'>, 'context'>,
): Record<string, FlatViewFilter> => {
  return {
    allPeopleIsPrimaryDoctorIsTrue: createStandardViewFilterFlatMetadata({
      ...args,
      objectName: 'person',
      context: {
        viewName: 'allPeople',
        viewFilterName: 'isPrimaryDoctorIsTrue',
        fieldName: 'isPrimaryDoctor',
        operand: ViewFilterOperand.IS,
        value: 'true',
      },
    }),
  };
};
