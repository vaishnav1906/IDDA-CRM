import { Injectable } from '@nestjs/common';

import { type StepFilterGroup, type StepFilter } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';

import { evaluateFilterConditions } from 'src/modules/workflow/workflow-executor/workflow-actions/filter/utils/evaluate-filter-conditions.util';
import { type ResolvedFilter } from 'src/modules/workflow/workflow-executor/workflow-actions/if-else/utils/find-matching-branch.util';

export type ConditionContext = Record<string, unknown>;

export type ConditionRule = {
  filterGroups: StepFilterGroup[];
  filters: StepFilter[];
};

/**
 * Injectable wrapper around the existing evaluateFilterConditions utility.
 * Provides a stable DI surface for other IDDA services that need rule
 * evaluation without importing the utility directly.
 */
@Injectable()
export class ConditionEngineService {
  /**
   * Evaluates a set of filter groups and pre-resolved filters.
   * Filters must already have their leftOperand and rightOperand resolved
   * from the workflow context before calling this method.
   */
  evaluate(
    filterGroups: StepFilterGroup[],
    resolvedFilters: ResolvedFilter[],
  ): boolean {
    return evaluateFilterConditions({
      filterGroups,
      filters: resolvedFilters,
    });
  }

  /**
   * Resolves filter values from a flat context object and evaluates the rule.
   * The `stepOutputKey` on each filter is used as a lookup key in `context`.
   * This is the primary entry point for IDDA workflow steps that carry a
   * conditionRule to gate execution.
   */
  evaluateWithContext(
    rule: ConditionRule,
    context: ConditionContext,
  ): boolean {
    const resolved: ResolvedFilter[] = rule.filters.map((filter) => ({
      ...filter,
      leftOperand: isDefined(filter.stepOutputKey)
        ? this.resolveFromContext(filter.stepOutputKey, context)
        : undefined,
      rightOperand: filter.value,
    }));

    return this.evaluate(rule.filterGroups, resolved);
  }

  private resolveFromContext(
    key: string,
    context: ConditionContext,
  ): unknown {
    const parts = key.split('.');
    let current: unknown = context;

    for (const part of parts) {
      if (!isDefined(current) || typeof current !== 'object') {
        return undefined;
      }

      current = (current as Record<string, unknown>)[part];
    }

    return current;
  }
}
