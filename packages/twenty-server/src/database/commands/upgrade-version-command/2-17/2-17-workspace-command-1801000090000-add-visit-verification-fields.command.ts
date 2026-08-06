import { Command } from 'nest-commander';
import { STANDARD_OBJECTS } from 'twenty-shared/metadata';
import { FieldMetadataType } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';

import { ActiveOrSuspendedWorkspaceCommandRunner } from 'src/database/commands/command-runners/active-or-suspended-workspace.command-runner';
import { WorkspaceIteratorService } from 'src/database/commands/command-runners/workspace-iterator.service';
import { type RunOnWorkspaceArgs } from 'src/database/commands/command-runners/workspace.command-runner';
import { ApplicationService } from 'src/engine/core-modules/application/application.service';
import { RegisteredWorkspaceCommand } from 'src/engine/core-modules/upgrade/decorators/registered-workspace-command.decorator';
import { type CreateFieldInput } from 'src/engine/metadata-modules/field-metadata/dtos/create-field.input';
import { FieldMetadataService } from 'src/engine/metadata-modules/field-metadata/services/field-metadata.service';
import { findFlatEntityByUniversalIdentifier } from 'src/engine/metadata-modules/flat-entity/utils/find-flat-entity-by-universal-identifier.util';
import { type FlatFieldMetadata } from 'src/engine/metadata-modules/flat-field-metadata/types/flat-field-metadata.type';
import { type FlatObjectMetadata } from 'src/engine/metadata-modules/flat-object-metadata/types/flat-object-metadata.type';
import { WorkspaceCacheService } from 'src/engine/workspace-cache/services/workspace-cache.service';

const VISIT_UNIVERSAL_IDENTIFIER = STANDARD_OBJECTS.visit.universalIdentifier;

// Universal IDs for each field being added.
// These match standard-object.constant.ts and the flat metadata util.
const FIELD_UNIVERSAL_IDS = {
  visitDate:          'a0b1c2d3-e4f5-6789-abcd-000000000112',
  visitNotes:         'a0b1c2d3-e4f5-6789-abcd-000000000113',
  latitude:           'a0b1c2d3-e4f5-6789-abcd-000000000114',
  longitude:          'a0b1c2d3-e4f5-6789-abcd-000000000115',
  visitAddress:       'a0b1c2d3-e4f5-6789-abcd-000000000116',
  selfie:             'a0b1c2d3-e4f5-6789-abcd-000000000117',
  selfieHash:         'a0b1c2d3-e4f5-6789-abcd-000000000118',
  selfieStatus:       'a0b1c2d3-e4f5-6789-abcd-000000000119',
  gpsAccuracy:        'a0b1c2d3-e4f5-6789-abcd-000000000120',
  distanceFromClinic: 'a0b1c2d3-e4f5-6789-abcd-000000000121',
  locationStatus:     'a0b1c2d3-e4f5-6789-abcd-000000000122',
  liveCameraCapture:  'a0b1c2d3-e4f5-6789-abcd-000000000123',
  imageReused:        'a0b1c2d3-e4f5-6789-abcd-000000000124',
  verificationScore:  'a0b1c2d3-e4f5-6789-abcd-000000000125',
  verificationStatus: 'a0b1c2d3-e4f5-6789-abcd-000000000126',
  reviewDecision:     'a0b1c2d3-e4f5-6789-abcd-000000000127',
  deviceIdentifier:   'a0b1c2d3-e4f5-6789-abcd-000000000128',
  captureSource:      'a0b1c2d3-e4f5-6789-abcd-000000000129',
  selfiePhoto:        '8b0008c0-3153-49d6-a281-9096e1e3c033', // matches the orphaned DB record
} as const;

@RegisteredWorkspaceCommand('2.17.0', 1801000090000)
@Command({
  name: 'upgrade:2-17:add-visit-verification-fields',
  description:
    'Add all missing Visit verification fields (selfieHash, selfiePhoto, ' +
    'selfieStatus, selfie, gpsAccuracy, distanceFromClinic, locationStatus, ' +
    'liveCameraCapture, imageReused, verificationScore, verificationStatus, ' +
    'reviewDecision, deviceIdentifier, captureSource, visitDate, visitNotes, ' +
    'visitAddress, latitude, longitude) to existing workspaces. ' +
    'Each field is idempotent: skipped when already present by universal ID or name.',
})
export class AddVisitVerificationFieldsCommand extends ActiveOrSuspendedWorkspaceCommandRunner {
  constructor(
    protected readonly workspaceIteratorService: WorkspaceIteratorService,
    private readonly applicationService: ApplicationService,
    private readonly workspaceCacheService: WorkspaceCacheService,
    private readonly fieldMetadataService: FieldMetadataService,
  ) {
    super(workspaceIteratorService);
  }

  override async runOnWorkspace({
    workspaceId,
    options,
  }: RunOnWorkspaceArgs): Promise<void> {
    const isDryRun = options.dryRun ?? false;

    const { flatObjectMetadataMaps, flatFieldMetadataMaps } =
      await this.workspaceCacheService.getOrRecompute(workspaceId, [
        'flatObjectMetadataMaps',
        'flatFieldMetadataMaps',
      ]);

    // ── Locate the visit object ─────────────────────────────────────────────
    let visitObject =
      findFlatEntityByUniversalIdentifier<FlatObjectMetadata>({
        flatEntityMaps: flatObjectMetadataMaps,
        universalIdentifier: VISIT_UNIVERSAL_IDENTIFIER,
      }) ??
      Object.values(flatObjectMetadataMaps.byUniversalIdentifier).find(
        (obj) => obj.nameSingular === 'visit',
      ) ??
      null;

    if (!isDefined(visitObject)) {
      this.logger.log(
        `visit object not found for workspace ${workspaceId}, skipping`,
      );

      return;
    }

    // Pre-build a by-name lookup for existing fields on the visit object
    const existingFieldsByName = new Map<string, FlatFieldMetadata>(
      Object.values(flatFieldMetadataMaps.byUniversalIdentifier)
        .filter((f) => f.objectMetadataId === visitObject.id)
        .map((f) => [f.name, f]),
    );

    // Helper: returns true if a field already exists by universal ID or name
    const fieldExists = (
      universalId: string,
      fieldName: string,
    ): boolean => {
      const byId = findFlatEntityByUniversalIdentifier<FlatFieldMetadata>({
        flatEntityMaps: flatFieldMetadataMaps,
        universalIdentifier: universalId,
      });

      return isDefined(byId) || existingFieldsByName.has(fieldName);
    };

    // ── Build list of fields to create ─────────────────────────────────────
    const fieldsToAdd: Omit<CreateFieldInput, 'workspaceId'>[] = [];

    const maybeAdd = (
      field: Omit<CreateFieldInput, 'workspaceId'>,
      universalId: string,
    ) => {
      if (fieldExists(universalId, field.name as string)) {
        this.logger.log(
          `${field.name as string} already present on visit for workspace ${workspaceId}, skipping`,
        );

        return;
      }
      fieldsToAdd.push(field);
    };

    maybeAdd(
      {
        objectMetadataId: visitObject.id,
        name: 'visitDate',
        type: FieldMetadataType.DATE_TIME,
        label: 'Visit Date',
        description: 'Date and time of the visit',
        icon: 'IconCalendar',
        isNullable: true,
        isActive: true,
        universalIdentifier: FIELD_UNIVERSAL_IDS.visitDate,
        settings: { displayFormat: 'RELATIVE' },
      },
      FIELD_UNIVERSAL_IDS.visitDate,
    );

    maybeAdd(
      {
        objectMetadataId: visitObject.id,
        name: 'visitNotes',
        type: FieldMetadataType.TEXT,
        label: 'Visit Notes',
        description: 'Notes taken during the visit',
        icon: 'IconNotes',
        isNullable: true,
        isActive: true,
        universalIdentifier: FIELD_UNIVERSAL_IDS.visitNotes,
      },
      FIELD_UNIVERSAL_IDS.visitNotes,
    );

    maybeAdd(
      {
        objectMetadataId: visitObject.id,
        name: 'latitude',
        type: FieldMetadataType.NUMBER,
        label: 'Latitude',
        description: 'GPS latitude coordinate at time of visit',
        icon: 'IconMapPin',
        isNullable: true,
        isActive: true,
        universalIdentifier: FIELD_UNIVERSAL_IDS.latitude,
        settings: { decimals: 6 },
      },
      FIELD_UNIVERSAL_IDS.latitude,
    );

    maybeAdd(
      {
        objectMetadataId: visitObject.id,
        name: 'longitude',
        type: FieldMetadataType.NUMBER,
        label: 'Longitude',
        description: 'GPS longitude coordinate at time of visit',
        icon: 'IconMapPin',
        isNullable: true,
        isActive: true,
        universalIdentifier: FIELD_UNIVERSAL_IDS.longitude,
        settings: { decimals: 6 },
      },
      FIELD_UNIVERSAL_IDS.longitude,
    );

    maybeAdd(
      {
        objectMetadataId: visitObject.id,
        name: 'visitAddress',
        type: FieldMetadataType.TEXT,
        label: 'Visit Address',
        description: 'Reverse-geocoded address at time of visit',
        icon: 'IconMap',
        isNullable: true,
        isActive: true,
        universalIdentifier: FIELD_UNIVERSAL_IDS.visitAddress,
      },
      FIELD_UNIVERSAL_IDS.visitAddress,
    );

    maybeAdd(
      {
        objectMetadataId: visitObject.id,
        name: 'selfie',
        type: FieldMetadataType.TEXT,
        label: 'Selfie',
        description: 'Stored path of the visit selfie image',
        icon: 'IconCamera',
        isNullable: true,
        isActive: true,
        universalIdentifier: FIELD_UNIVERSAL_IDS.selfie,
      },
      FIELD_UNIVERSAL_IDS.selfie,
    );

    maybeAdd(
      {
        objectMetadataId: visitObject.id,
        name: 'selfieHash',
        type: FieldMetadataType.TEXT,
        label: 'Selfie Hash',
        description: 'SHA-256 hash of selfie for duplicate detection',
        icon: 'IconFingerprint',
        isNullable: true,
        isSystem: true,
        isActive: true,
        universalIdentifier: FIELD_UNIVERSAL_IDS.selfieHash,
      },
      FIELD_UNIVERSAL_IDS.selfieHash,
    );

    maybeAdd(
      {
        objectMetadataId: visitObject.id,
        name: 'selfieStatus',
        type: FieldMetadataType.SELECT,
        label: 'Selfie Status',
        description: 'Quality status of the captured selfie',
        icon: 'IconUserScan',
        isNullable: true,
        isActive: true,
        defaultValue: "'MISSING'",
        universalIdentifier: FIELD_UNIVERSAL_IDS.selfieStatus,
        options: [
          { id: 'a0b1c2d3-e4f5-6789-abcd-010000000001', value: 'CLEAR',          label: 'Clear',          position: 0, color: 'green'  },
          { id: 'a0b1c2d3-e4f5-6789-abcd-010000000002', value: 'FACE_NOT_CLEAR', label: 'Face Not Clear', position: 1, color: 'orange' },
          { id: 'a0b1c2d3-e4f5-6789-abcd-010000000003', value: 'MISSING',        label: 'Missing',        position: 2, color: 'gray'   },
        ],
      },
      FIELD_UNIVERSAL_IDS.selfieStatus,
    );

    maybeAdd(
      {
        objectMetadataId: visitObject.id,
        name: 'gpsAccuracy',
        type: FieldMetadataType.NUMBER,
        label: 'GPS Accuracy (m)',
        description: 'GPS accuracy radius in metres',
        icon: 'IconRadar',
        isNullable: true,
        isActive: true,
        universalIdentifier: FIELD_UNIVERSAL_IDS.gpsAccuracy,
        settings: { decimals: 2 },
      },
      FIELD_UNIVERSAL_IDS.gpsAccuracy,
    );

    maybeAdd(
      {
        objectMetadataId: visitObject.id,
        name: 'distanceFromClinic',
        type: FieldMetadataType.NUMBER,
        label: 'Distance from Clinic (m)',
        description: 'Computed distance in metres from the clinic',
        icon: 'IconRuler',
        isNullable: true,
        isActive: true,
        universalIdentifier: FIELD_UNIVERSAL_IDS.distanceFromClinic,
        settings: { decimals: 2 },
      },
      FIELD_UNIVERSAL_IDS.distanceFromClinic,
    );

    maybeAdd(
      {
        objectMetadataId: visitObject.id,
        name: 'locationStatus',
        type: FieldMetadataType.SELECT,
        label: 'Location Status',
        description: 'Whether the employee was within the clinic geofence',
        icon: 'IconShieldCheck',
        isNullable: true,
        isActive: true,
        universalIdentifier: FIELD_UNIVERSAL_IDS.locationStatus,
        options: [
          { id: 'a0b1c2d3-e4f5-6789-abcd-020000000001', value: 'WITHIN_RANGE',  label: 'Within Range',      position: 0, color: 'green'  },
          { id: 'a0b1c2d3-e4f5-6789-abcd-020000000002', value: 'OUTSIDE_RANGE', label: 'Outside Range',     position: 1, color: 'red'    },
          { id: 'a0b1c2d3-e4f5-6789-abcd-020000000003', value: 'SUSPICIOUS',    label: 'Suspicious Location',position: 2, color: 'orange' },
        ],
      },
      FIELD_UNIVERSAL_IDS.locationStatus,
    );

    maybeAdd(
      {
        objectMetadataId: visitObject.id,
        name: 'liveCameraCapture',
        type: FieldMetadataType.BOOLEAN,
        label: 'Live Camera Capture',
        description: 'Whether the photo was taken live from the camera',
        icon: 'IconVideo',
        isNullable: false,
        isActive: true,
        defaultValue: false,
        universalIdentifier: FIELD_UNIVERSAL_IDS.liveCameraCapture,
      },
      FIELD_UNIVERSAL_IDS.liveCameraCapture,
    );

    maybeAdd(
      {
        objectMetadataId: visitObject.id,
        name: 'imageReused',
        type: FieldMetadataType.BOOLEAN,
        label: 'Image Reused',
        description: 'Whether a previously uploaded image was reused',
        icon: 'IconCopy',
        isNullable: false,
        isActive: true,
        defaultValue: false,
        universalIdentifier: FIELD_UNIVERSAL_IDS.imageReused,
      },
      FIELD_UNIVERSAL_IDS.imageReused,
    );

    maybeAdd(
      {
        objectMetadataId: visitObject.id,
        name: 'verificationScore',
        type: FieldMetadataType.NUMBER,
        label: 'Verification Score',
        description: 'Score 0–100 computed from verification checks',
        icon: 'IconStar',
        isNullable: true,
        isActive: true,
        universalIdentifier: FIELD_UNIVERSAL_IDS.verificationScore,
        settings: { decimals: 0 },
      },
      FIELD_UNIVERSAL_IDS.verificationScore,
    );

    maybeAdd(
      {
        objectMetadataId: visitObject.id,
        name: 'verificationStatus',
        type: FieldMetadataType.SELECT,
        label: 'Verification Status',
        description: 'Overall verification outcome',
        icon: 'IconShield',
        isNullable: true,
        isActive: true,
        defaultValue: "'UNVERIFIED'",
        universalIdentifier: FIELD_UNIVERSAL_IDS.verificationStatus,
        options: [
          { id: 'a0b1c2d3-e4f5-6789-abcd-030000000001', value: 'VERIFIED',           label: 'Verified',           position: 0, color: 'green'  },
          { id: 'a0b1c2d3-e4f5-6789-abcd-030000000002', value: 'PARTIALLY_VERIFIED', label: 'Partially Verified', position: 1, color: 'yellow' },
          { id: 'a0b1c2d3-e4f5-6789-abcd-030000000003', value: 'UNVERIFIED',         label: 'Unverified',         position: 2, color: 'red'    },
          { id: 'a0b1c2d3-e4f5-6789-abcd-030000000004', value: 'NEEDS_REVIEW',       label: 'Needs Review',       position: 3, color: 'purple' },
        ],
      },
      FIELD_UNIVERSAL_IDS.verificationStatus,
    );

    maybeAdd(
      {
        objectMetadataId: visitObject.id,
        name: 'reviewDecision',
        type: FieldMetadataType.SELECT,
        label: 'Review Decision',
        description: 'Manager review outcome for this visit',
        icon: 'IconChecklist',
        isNullable: true,
        isActive: true,
        defaultValue: "'PENDING'",
        universalIdentifier: FIELD_UNIVERSAL_IDS.reviewDecision,
        options: [
          { id: 'a0b1c2d3-e4f5-6789-abcd-040000000001', value: 'APPROVED', label: 'Approved', position: 0, color: 'green' },
          { id: 'a0b1c2d3-e4f5-6789-abcd-040000000002', value: 'REJECTED', label: 'Rejected', position: 1, color: 'red'   },
          { id: 'a0b1c2d3-e4f5-6789-abcd-040000000003', value: 'PENDING',  label: 'Pending',  position: 2, color: 'gray'  },
        ],
      },
      FIELD_UNIVERSAL_IDS.reviewDecision,
    );

    maybeAdd(
      {
        objectMetadataId: visitObject.id,
        name: 'deviceIdentifier',
        type: FieldMetadataType.TEXT,
        label: 'Device Identifier',
        description: 'Identifier of the device used to capture the selfie',
        icon: 'IconDeviceMobile',
        isNullable: true,
        isSystem: true,
        isActive: true,
        universalIdentifier: FIELD_UNIVERSAL_IDS.deviceIdentifier,
      },
      FIELD_UNIVERSAL_IDS.deviceIdentifier,
    );

    maybeAdd(
      {
        objectMetadataId: visitObject.id,
        name: 'captureSource',
        type: FieldMetadataType.SELECT,
        label: 'Capture Source',
        description: 'Method used to capture the selfie',
        icon: 'IconCamera',
        isNullable: true,
        isActive: true,
        universalIdentifier: FIELD_UNIVERSAL_IDS.captureSource,
        options: [
          { id: 'a0b1c2d3-e4f5-6789-abcd-050000000001', value: 'CRM_MOBILE_CAMERA', label: 'CRM Mobile Camera', position: 0, color: 'blue' },
          { id: 'a0b1c2d3-e4f5-6789-abcd-050000000002', value: 'CRM_WEB_CAMERA',    label: 'CRM Web Camera',    position: 1, color: 'sky'  },
        ],
      },
      FIELD_UNIVERSAL_IDS.captureSource,
    );

    maybeAdd(
      {
        objectMetadataId: visitObject.id,
        name: 'selfiePhoto',
        type: FieldMetadataType.TEXT,
        label: 'Selfie Photo',
        description: 'Stored path of the agent selfie taken during check-in',
        icon: 'IconCamera',
        isNullable: true,
        isActive: true,
        universalIdentifier: FIELD_UNIVERSAL_IDS.selfiePhoto,
      },
      FIELD_UNIVERSAL_IDS.selfiePhoto,
    );

    // ── Apply ───────────────────────────────────────────────────────────────
    if (fieldsToAdd.length === 0) {
      this.logger.log(
        `All visit verification fields already present for workspace ${workspaceId}, nothing to do`,
      );

      return;
    }

    if (isDryRun) {
      this.logger.log(
        `[DRY RUN] Would add ${fieldsToAdd.map((f) => f.name as string).join(', ')} ` +
          `to visit for workspace ${workspaceId}`,
      );

      return;
    }

    const { twentyStandardFlatApplication } =
      await this.applicationService.findWorkspaceTwentyStandardAndCustomApplicationOrThrow(
        { workspaceId },
      );

    try {
      await this.fieldMetadataService.createManyFields({
        createFieldInputs: fieldsToAdd,
        workspaceId,
        ownerFlatApplication: twentyStandardFlatApplication,
        isSystemBuild: true,
      });

      this.logger.log(
        `Added ${fieldsToAdd.map((f) => f.name as string).join(', ')} ` +
          `to visit for workspace ${workspaceId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to add visit verification fields for workspace ${workspaceId}:\n${
          error instanceof Error ? error.stack : JSON.stringify(error, null, 2)
        }`,
      );
      throw error;
    }
  }
}
