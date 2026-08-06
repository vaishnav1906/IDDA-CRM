import { Logger } from '@nestjs/common';

import { assertIsDefinedOrThrow, isDefined } from 'twenty-shared/utils';

import { type WorkspacePostQueryHookInstance } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/interfaces/workspace-query-hook.interface';
import { WorkspaceQueryHook } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/decorators/workspace-query-hook.decorator';
import { WorkspaceQueryHookType } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/types/workspace-query-hook.type';
import { type WorkspaceAuthContext } from 'src/engine/core-modules/auth/types/workspace-auth-context.type';
import { WorkspaceNotFoundDefaultError } from 'src/engine/core-modules/workspace/workspace.exception';
import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { type LeadWorkspaceEntity } from 'src/modules/lead/standard-objects/lead.workspace-entity';
import { type PersonWorkspaceEntity } from 'src/modules/person/standard-objects/person.workspace-entity';
import { WorkflowTimelineWriterService } from 'src/modules/idda-timeline-writer/services/workflow-timeline-writer.service';

const CONVERTED_STATUS = 'CONVERTED';

// Maps Lead.specialization SELECT values to human-readable job titles.
// Lead and Person specialization enums differ, so we do not cross-map them.
const SPECIALIZATION_LABELS: Record<string, string> = {
  DENTIST: 'Dentist',
  DERMATOLOGIST: 'Dermatologist',
  PAEDIATRICIAN: 'Paediatrician',
  GENERAL_PHYSICIAN: 'General Physician',
  ENT: 'ENT Specialist',
  COSMETOLOGIST: 'Cosmetologist',
  PLASTIC_SURGEON: 'Plastic Surgeon',
  TRICHOLOGIST: 'Trichologist',
  HOSPITAL: 'Hospital (Multi-Doctor)',
  CLINIC: 'Clinic (Multi-Doctor)',
  OTHER: 'Doctor',
};

@WorkspaceQueryHook({
  key: 'lead.updateOne',
  type: WorkspaceQueryHookType.POST_HOOK,
})
export class LeadConvertOnStatusPostQueryHook
  implements WorkspacePostQueryHookInstance
{
  private readonly logger = new Logger(LeadConvertOnStatusPostQueryHook.name);

  constructor(
    private readonly globalWorkspaceOrmManager: GlobalWorkspaceOrmManager,
    private readonly workflowTimelineWriterService: WorkflowTimelineWriterService,
  ) {}

  async execute(
    authContext: WorkspaceAuthContext,
    _objectName: string,
    payload: LeadWorkspaceEntity | LeadWorkspaceEntity[],
  ): Promise<void> {
    const lead = Array.isArray(payload) ? payload[0] : payload;

    if (!isDefined(lead)) {
      return;
    }

    if (
      !isDefined(lead.status) ||
      lead.status.toUpperCase() !== CONVERTED_STATUS
    ) {
      return;
    }

    // Idempotency: a Doctor is already linked to this lead.
    if (isDefined(lead.doctorId)) {
      return;
    }

    const workspace = authContext.workspace;

    assertIsDefinedOrThrow(workspace, WorkspaceNotFoundDefaultError);

    const { firstName, lastName } = this.parseDoctorName(
      lead.doctorName ?? lead.clinicName ?? '',
    );

    try {
      await this.globalWorkspaceOrmManager.executeInWorkspaceContext(
        async () => {
          const personRepository =
            await this.globalWorkspaceOrmManager.getRepository<PersonWorkspaceEntity>(
              workspace.id,
              'person',
              { shouldBypassPermissionChecks: true },
            );

          const leadRepository =
            await this.globalWorkspaceOrmManager.getRepository<LeadWorkspaceEntity>(
              workspace.id,
              'lead',
              { shouldBypassPermissionChecks: true },
            );

          // Duplicate lookup priority:
          // 1. Normalized phone exact match (most reliable unique identifier)
          // 2. Name + clinic match as secondary fallback
          // Email is not checked because Lead entity has no email field.
          let targetPersonId: string | null = null;

          if (isDefined(lead.phone) && lead.phone.trim() !== '') {
            const normalizedPhone = lead.phone.replace(/\D/g, '');

            const existingByPhone = await personRepository.findOne({
              where: {
                phonesPrimaryPhoneNumber: normalizedPhone,
              } as unknown as Record<string, unknown>,
            });

            if (isDefined(existingByPhone)) {
              targetPersonId = existingByPhone.id;

              this.logger.log(
                `Lead ${lead.id}: found existing Doctor person ${targetPersonId} by phone — linking instead of creating`,
              );
            }
          }

          if (!isDefined(targetPersonId) && firstName && isDefined(lead.clinicId)) {
            const existingByNameAndClinic = await personRepository.findOne({
              where: {
                name: { firstName, lastName },
                companyId: lead.clinicId,
              },
            });

            if (isDefined(existingByNameAndClinic)) {
              targetPersonId = existingByNameAndClinic.id;

              this.logger.log(
                `Lead ${lead.id}: found existing Doctor person ${targetPersonId} by name+clinic — linking instead of creating`,
              );
            }
          }

          if (!isDefined(targetPersonId)) {
            const jobTitle = isDefined(lead.specialization)
              ? (SPECIALIZATION_LABELS[lead.specialization] ?? 'Doctor')
              : 'Doctor';

            const personData = {
              name: { firstName, lastName },
              jobTitle,
              companyId: lead.clinicId ?? undefined,
              isPrimaryDoctor: true,
              phones: lead.phone
                ? {
                    primaryPhoneNumber: lead.phone,
                    primaryPhoneCountryCode: 'IN',
                    primaryPhoneCallingCode: '+91',
                    additionalPhones: null,
                  }
                : undefined,
            };

            // TwentyORM save() may return T | T[]; normalize to single entity.
            const saveResult = await personRepository.save(
              personData as unknown as PersonWorkspaceEntity,
            );
            const savedPerson = Array.isArray(saveResult) ? saveResult[0] : saveResult;

            targetPersonId = savedPerson.id;

            this.logger.log(
              `Lead ${lead.id} converted → Doctor person ${targetPersonId} (${firstName} ${lastName}) created`,
            );
          }

          await leadRepository.update(lead.id, {
            doctorId: targetPersonId,
          });
        },
        authContext,
      );

      // Write timeline event after successful DB operations.
      await this.workflowTimelineWriterService.write({
        workspaceId: workspace.id,
        targetObjectSingularName: 'lead',
        targetRecordId: lead.id,
        eventName: 'workflow.lead.converted.doctor_linked',
        properties: {
          doctorName: `${firstName} ${lastName}`.trim(),
          clinicName: lead.clinicName ?? null,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to auto-create/link Doctor from converted lead ${lead.id}: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }

  parseDoctorName(raw: string): { firstName: string; lastName: string } {
    const cleaned = raw.replace(/^(dr\.?|doctor)\s+/i, '').trim();
    const parts = cleaned.split(/\s+/);

    if (parts.length === 1) {
      return { firstName: parts[0], lastName: '' };
    }

    return {
      firstName: parts[0],
      lastName: parts.slice(1).join(' '),
    };
  }
}
