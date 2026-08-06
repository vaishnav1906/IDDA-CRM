import { type FlatViewField } from 'src/engine/metadata-modules/flat-view-field/types/flat-view-field.type';
import {
  createStandardViewFieldFlatMetadata,
  type CreateStandardViewFieldArgs,
} from 'src/engine/workspace-manager/twenty-standard-application/utils/view-field/create-standard-view-field-flat-metadata.util';

export const computeStandardVisitViewFields = (
  args: Omit<CreateStandardViewFieldArgs<'visit'>, 'context'>,
): Record<string, FlatViewField> => {
  return {
    // allVisits view fields
    allVisitsVisitDate: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'visit',
      context: {
        viewName: 'allVisits',
        viewFieldName: 'visitDate',
        fieldName: 'visitDate',
        position: 0,
        isVisible: true,
        size: 180,
      },
    }),
    allVisitsClinic: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'visit',
      context: {
        viewName: 'allVisits',
        viewFieldName: 'clinic',
        fieldName: 'clinic',
        position: 1,
        isVisible: true,
        size: 200,
      },
    }),
    allVisitsEmployee: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'visit',
      context: {
        viewName: 'allVisits',
        viewFieldName: 'employee',
        fieldName: 'employee',
        position: 2,
        isVisible: true,
        size: 180,
      },
    }),
    allVisitsVerificationStatus: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'visit',
      context: {
        viewName: 'allVisits',
        viewFieldName: 'verificationStatus',
        fieldName: 'verificationStatus',
        position: 3,
        isVisible: true,
        size: 150,
      },
    }),
    allVisitsVerificationScore: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'visit',
      context: {
        viewName: 'allVisits',
        viewFieldName: 'verificationScore',
        fieldName: 'verificationScore',
        position: 4,
        isVisible: true,
        size: 120,
      },
    }),
    allVisitsDistanceFromClinic: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'visit',
      context: {
        viewName: 'allVisits',
        viewFieldName: 'distanceFromClinic',
        fieldName: 'distanceFromClinic',
        position: 5,
        isVisible: true,
        size: 150,
      },
    }),

    // visitRecordPageFields — verification group
    visitRecordPageFieldsSelfieStatus: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'visit',
      context: {
        viewName: 'visitRecordPageFields',
        viewFieldName: 'selfieStatus',
        fieldName: 'selfieStatus',
        position: 0,
        isVisible: true,
        size: 150,
        viewFieldGroupName: 'verification',
      },
    }),
    visitRecordPageFieldsVerificationStatus: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'visit',
      context: {
        viewName: 'visitRecordPageFields',
        viewFieldName: 'verificationStatus',
        fieldName: 'verificationStatus',
        position: 1,
        isVisible: true,
        size: 150,
        viewFieldGroupName: 'verification',
      },
    }),
    visitRecordPageFieldsVerificationScore: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'visit',
      context: {
        viewName: 'visitRecordPageFields',
        viewFieldName: 'verificationScore',
        fieldName: 'verificationScore',
        position: 2,
        isVisible: true,
        size: 150,
        viewFieldGroupName: 'verification',
      },
    }),
    visitRecordPageFieldsReviewDecision: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'visit',
      context: {
        viewName: 'visitRecordPageFields',
        viewFieldName: 'reviewDecision',
        fieldName: 'reviewDecision',
        position: 3,
        isVisible: true,
        size: 150,
        viewFieldGroupName: 'verification',
      },
    }),

    // visitRecordPageFields — location group
    visitRecordPageFieldsLatitude: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'visit',
      context: {
        viewName: 'visitRecordPageFields',
        viewFieldName: 'latitude',
        fieldName: 'latitude',
        position: 0,
        isVisible: true,
        size: 150,
        viewFieldGroupName: 'location',
      },
    }),
    visitRecordPageFieldsLongitude: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'visit',
      context: {
        viewName: 'visitRecordPageFields',
        viewFieldName: 'longitude',
        fieldName: 'longitude',
        position: 1,
        isVisible: true,
        size: 150,
        viewFieldGroupName: 'location',
      },
    }),
    visitRecordPageFieldsVisitAddress: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'visit',
      context: {
        viewName: 'visitRecordPageFields',
        viewFieldName: 'visitAddress',
        fieldName: 'visitAddress',
        position: 2,
        isVisible: true,
        size: 150,
        viewFieldGroupName: 'location',
      },
    }),
    visitRecordPageFieldsGpsAccuracy: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'visit',
      context: {
        viewName: 'visitRecordPageFields',
        viewFieldName: 'gpsAccuracy',
        fieldName: 'gpsAccuracy',
        position: 3,
        isVisible: true,
        size: 150,
        viewFieldGroupName: 'location',
      },
    }),
    visitRecordPageFieldsDistanceFromClinic: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'visit',
      context: {
        viewName: 'visitRecordPageFields',
        viewFieldName: 'distanceFromClinic',
        fieldName: 'distanceFromClinic',
        position: 4,
        isVisible: true,
        size: 150,
        viewFieldGroupName: 'location',
      },
    }),
    visitRecordPageFieldsLocationStatus: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'visit',
      context: {
        viewName: 'visitRecordPageFields',
        viewFieldName: 'locationStatus',
        fieldName: 'locationStatus',
        position: 5,
        isVisible: true,
        size: 150,
        viewFieldGroupName: 'location',
      },
    }),

    // visitRecordPageFields — capture group
    visitRecordPageFieldsSelfie: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'visit',
      context: {
        viewName: 'visitRecordPageFields',
        viewFieldName: 'selfie',
        fieldName: 'selfie',
        position: 0,
        isVisible: true,
        size: 150,
        viewFieldGroupName: 'capture',
      },
    }),
    visitRecordPageFieldsLiveCameraCapture: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'visit',
      context: {
        viewName: 'visitRecordPageFields',
        viewFieldName: 'liveCameraCapture',
        fieldName: 'liveCameraCapture',
        position: 1,
        isVisible: true,
        size: 150,
        viewFieldGroupName: 'capture',
      },
    }),
    visitRecordPageFieldsImageReused: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'visit',
      context: {
        viewName: 'visitRecordPageFields',
        viewFieldName: 'imageReused',
        fieldName: 'imageReused',
        position: 2,
        isVisible: true,
        size: 150,
        viewFieldGroupName: 'capture',
      },
    }),
    visitRecordPageFieldsCaptureSource: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'visit',
      context: {
        viewName: 'visitRecordPageFields',
        viewFieldName: 'captureSource',
        fieldName: 'captureSource',
        position: 3,
        isVisible: true,
        size: 150,
        viewFieldGroupName: 'capture',
      },
    }),
    visitRecordPageFieldsDeviceIdentifier: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'visit',
      context: {
        viewName: 'visitRecordPageFields',
        viewFieldName: 'deviceIdentifier',
        fieldName: 'deviceIdentifier',
        position: 4,
        isVisible: true,
        size: 150,
        viewFieldGroupName: 'capture',
      },
    }),

    // visitRecordPageFields — review group
    visitRecordPageFieldsVisitNotes: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'visit',
      context: {
        viewName: 'visitRecordPageFields',
        viewFieldName: 'visitNotes',
        fieldName: 'visitNotes',
        position: 0,
        isVisible: true,
        size: 150,
        viewFieldGroupName: 'review',
      },
    }),
    visitRecordPageFieldsVisitDate: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'visit',
      context: {
        viewName: 'visitRecordPageFields',
        viewFieldName: 'visitDate',
        fieldName: 'visitDate',
        position: 1,
        isVisible: true,
        size: 150,
        viewFieldGroupName: 'review',
      },
    }),
    visitRecordPageFieldsClinic: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'visit',
      context: {
        viewName: 'visitRecordPageFields',
        viewFieldName: 'clinic',
        fieldName: 'clinic',
        position: 2,
        isVisible: true,
        size: 150,
        viewFieldGroupName: 'review',
      },
    }),
    visitRecordPageFieldsEmployee: createStandardViewFieldFlatMetadata({
      ...args,
      objectName: 'visit',
      context: {
        viewName: 'visitRecordPageFields',
        viewFieldName: 'employee',
        fieldName: 'employee',
        position: 3,
        isVisible: true,
        size: 150,
        viewFieldGroupName: 'review',
      },
    }),
  };
};
