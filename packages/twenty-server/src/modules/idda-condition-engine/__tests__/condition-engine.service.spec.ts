import { Test, TestingModule } from '@nestjs/testing';

import { StepLogicalOperator, ViewFilterOperand } from 'twenty-shared/types';

import { ConditionEngineService } from 'src/modules/idda-condition-engine/services/condition-engine.service';

const FILTER_GROUP_ID = 'group-1';

describe('ConditionEngineService', () => {
  let service: ConditionEngineService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ConditionEngineService],
    }).compile();

    service = module.get(ConditionEngineService);
  });

  describe('evaluate', () => {
    it('returns true when there are no groups or filters', () => {
      expect(service.evaluate([], [])).toBe(true);
    });

    it('evaluates a simple text contains filter', () => {
      const result = service.evaluate(
        [
          {
            id: FILTER_GROUP_ID,
            logicalOperator: StepLogicalOperator.AND,
            parentStepFilterGroupId: undefined,
            positionInStepFilterGroup: 0,
          },
        ],
        [
          {
            id: 'filter-1',
            stepFilterGroupId: FILTER_GROUP_ID,
            type: 'TEXT',
            operand: ViewFilterOperand.CONTAINS,
            leftOperand: 'hello',
            rightOperand: 'hello',
            compositeFieldSubFieldName: undefined,
          } as any,
        ],
      );

      expect(result).toBe(true);
    });

    it('returns false when text does not contain value', () => {
      const result = service.evaluate(
        [
          {
            id: FILTER_GROUP_ID,
            logicalOperator: StepLogicalOperator.AND,
            parentStepFilterGroupId: undefined,
            positionInStepFilterGroup: 0,
          },
        ],
        [
          {
            id: 'filter-1',
            stepFilterGroupId: FILTER_GROUP_ID,
            type: 'TEXT',
            operand: ViewFilterOperand.CONTAINS,
            leftOperand: 'hello',
            rightOperand: 'world',
            compositeFieldSubFieldName: undefined,
          } as any,
        ],
      );

      expect(result).toBe(false);
    });
  });

  describe('evaluateWithContext', () => {
    it('resolves a top-level key from context', () => {
      const result = service.evaluateWithContext(
        {
          filterGroups: [],
          filters: [
            {
              id: 'filter-1',
              stepFilterGroupId: FILTER_GROUP_ID,
              type: 'TEXT',
              operand: ViewFilterOperand.CONTAINS,
              stepOutputKey: 'status',
              value: 'active',
              compositeFieldSubFieldName: undefined,
            } as any,
          ],
        },
        { status: 'active' },
      );

      expect(result).toBe(true);
    });

    it('resolves a nested dot-notation key from context', () => {
      const result = service.evaluateWithContext(
        {
          filterGroups: [],
          filters: [
            {
              id: 'filter-1',
              stepFilterGroupId: FILTER_GROUP_ID,
              type: 'NUMBER',
              operand: ViewFilterOperand.GREATER_THAN_OR_EQUAL,
              stepOutputKey: 'lead.score',
              value: '50',
              compositeFieldSubFieldName: undefined,
            } as any,
          ],
        },
        { lead: { score: 75 } },
      );

      expect(result).toBe(true);
    });

    it('returns false when nested key resolves to undefined', () => {
      const result = service.evaluateWithContext(
        {
          filterGroups: [],
          filters: [
            {
              id: 'filter-1',
              stepFilterGroupId: FILTER_GROUP_ID,
              type: 'TEXT',
              operand: ViewFilterOperand.IS_NOT_EMPTY,
              stepOutputKey: 'missing.path',
              value: '',
              compositeFieldSubFieldName: undefined,
            } as any,
          ],
        },
        { other: 'data' },
      );

      expect(result).toBe(false);
    });
  });
});
