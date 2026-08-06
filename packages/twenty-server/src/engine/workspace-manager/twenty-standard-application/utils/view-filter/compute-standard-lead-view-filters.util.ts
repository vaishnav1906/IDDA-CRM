import { type FlatViewFilter } from 'src/engine/metadata-modules/flat-view-filter/types/flat-view-filter.type';
import { type CreateStandardViewFilterArgs } from 'src/engine/workspace-manager/twenty-standard-application/utils/view-filter/create-standard-view-filter-flat-metadata.util';

export const computeStandardLeadViewFilters = (
  _args: Omit<CreateStandardViewFilterArgs<'lead'>, 'context'>,
): Record<string, FlatViewFilter> => {
  return {};
};
