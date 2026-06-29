import { AggregateOperations } from 'twenty-shared/types';

import { type FlatViewField } from 'src/engine/metadata-modules/flat-view-field/types/flat-view-field.type';
import {
  createStandardViewFieldFlatMetadata,
  type CreateStandardViewFieldArgs,
} from 'src/engine/workspace-manager/twenty-standard-application/utils/view-field/create-standard-view-field-flat-metadata.util';

export const computeStandardSubscriptionViewFields = (
  args: Omit<CreateStandardViewFieldArgs<'subscription'>, 'context'>,
): Record<string, FlatViewField> => {
  return {
    // allSubscriptions view fields
    allSubscriptionsName: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'subscription',
      context: {
        viewName: 'allSubscriptions',
        viewFieldName: 'name',
        fieldName: 'name',
        position: 0,
        isVisible: true,
        size: 200,
      },
    }),
    allSubscriptionsPlan: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'subscription',
      context: {
        viewName: 'allSubscriptions',
        viewFieldName: 'plan',
        fieldName: 'plan',
        position: 1,
        isVisible: true,
        size: 120,
      },
    }),
    allSubscriptionsStatus: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'subscription',
      context: {
        viewName: 'allSubscriptions',
        viewFieldName: 'status',
        fieldName: 'status',
        position: 2,
        isVisible: true,
        size: 130,
      },
    }),
    allSubscriptionsRenewalDate: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'subscription',
      context: {
        viewName: 'allSubscriptions',
        viewFieldName: 'renewalDate',
        fieldName: 'renewalDate',
        position: 3,
        isVisible: true,
        size: 150,
        aggregateOperation: AggregateOperations.MIN,
      },
    }),
    allSubscriptionsPaymentStatus: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'subscription',
      context: {
        viewName: 'allSubscriptions',
        viewFieldName: 'paymentStatus',
        fieldName: 'paymentStatus',
        position: 4,
        isVisible: true,
        size: 140,
      },
    }),
    allSubscriptionsClinic: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'subscription',
      context: {
        viewName: 'allSubscriptions',
        viewFieldName: 'clinic',
        fieldName: 'clinic',
        position: 5,
        isVisible: true,
        size: 180,
      },
    }),
    allSubscriptionsAssignedEmployee: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'subscription',
      context: {
        viewName: 'allSubscriptions',
        viewFieldName: 'assignedEmployee',
        fieldName: 'assignedEmployee',
        position: 6,
        isVisible: true,
        size: 150,
      },
    }),

    // subscriptionRecordPageFields — plan group
    subscriptionRecordPageFieldsPlan: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'subscription',
      context: {
        viewName: 'subscriptionRecordPageFields',
        viewFieldName: 'plan',
        fieldName: 'plan',
        position: 0,
        isVisible: true,
        size: 150,
        viewFieldGroupName: 'plan',
      },
    }),
    subscriptionRecordPageFieldsStatus: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'subscription',
      context: {
        viewName: 'subscriptionRecordPageFields',
        viewFieldName: 'status',
        fieldName: 'status',
        position: 1,
        isVisible: true,
        size: 150,
        viewFieldGroupName: 'plan',
      },
    }),
    subscriptionRecordPageFieldsBillingCycle: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'subscription',
      context: {
        viewName: 'subscriptionRecordPageFields',
        viewFieldName: 'billingCycle',
        fieldName: 'billingCycle',
        position: 2,
        isVisible: true,
        size: 150,
        viewFieldGroupName: 'plan',
      },
    }),
    subscriptionRecordPageFieldsPaymentStatus: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'subscription',
      context: {
        viewName: 'subscriptionRecordPageFields',
        viewFieldName: 'paymentStatus',
        fieldName: 'paymentStatus',
        position: 3,
        isVisible: true,
        size: 150,
        viewFieldGroupName: 'plan',
      },
    }),
    subscriptionRecordPageFieldsAmount: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'subscription',
      context: {
        viewName: 'subscriptionRecordPageFields',
        viewFieldName: 'amount',
        fieldName: 'amount',
        position: 4,
        isVisible: true,
        size: 150,
        viewFieldGroupName: 'plan',
      },
    }),

    // subscriptionRecordPageFields — dates group
    subscriptionRecordPageFieldsStartDate: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'subscription',
      context: {
        viewName: 'subscriptionRecordPageFields',
        viewFieldName: 'startDate',
        fieldName: 'startDate',
        position: 0,
        isVisible: true,
        size: 150,
        viewFieldGroupName: 'dates',
      },
    }),
    subscriptionRecordPageFieldsEndDate: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'subscription',
      context: {
        viewName: 'subscriptionRecordPageFields',
        viewFieldName: 'endDate',
        fieldName: 'endDate',
        position: 1,
        isVisible: true,
        size: 150,
        viewFieldGroupName: 'dates',
      },
    }),
    subscriptionRecordPageFieldsRenewalDate: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'subscription',
      context: {
        viewName: 'subscriptionRecordPageFields',
        viewFieldName: 'renewalDate',
        fieldName: 'renewalDate',
        position: 2,
        isVisible: true,
        size: 150,
        viewFieldGroupName: 'dates',
      },
    }),

    // subscriptionRecordPageFields — relations group
    subscriptionRecordPageFieldsClinic: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'subscription',
      context: {
        viewName: 'subscriptionRecordPageFields',
        viewFieldName: 'clinic',
        fieldName: 'clinic',
        position: 0,
        isVisible: true,
        size: 150,
        viewFieldGroupName: 'relations',
      },
    }),
    subscriptionRecordPageFieldsDoctor: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'subscription',
      context: {
        viewName: 'subscriptionRecordPageFields',
        viewFieldName: 'doctor',
        fieldName: 'doctor',
        position: 1,
        isVisible: true,
        size: 150,
        viewFieldGroupName: 'relations',
      },
    }),
    subscriptionRecordPageFieldsAssignedEmployee: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'subscription',
      context: {
        viewName: 'subscriptionRecordPageFields',
        viewFieldName: 'assignedEmployee',
        fieldName: 'assignedEmployee',
        position: 2,
        isVisible: true,
        size: 150,
        viewFieldGroupName: 'relations',
      },
    }),

    // subscriptionRecordPageFields — system group
    subscriptionRecordPageFieldsCreatedAt: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'subscription',
      context: {
        viewName: 'subscriptionRecordPageFields',
        viewFieldName: 'createdAt',
        fieldName: 'createdAt',
        position: 0,
        isVisible: true,
        size: 150,
        viewFieldGroupName: 'system',
      },
    }),
    subscriptionRecordPageFieldsCreatedBy: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'subscription',
      context: {
        viewName: 'subscriptionRecordPageFields',
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
