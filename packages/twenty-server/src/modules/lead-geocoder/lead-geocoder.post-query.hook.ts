import { Logger } from '@nestjs/common';

import { isDefined } from 'twenty-shared/utils';

import { type WorkspacePostQueryHookInstance } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/interfaces/workspace-query-hook.interface';
import { WorkspaceQueryHook } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/decorators/workspace-query-hook.decorator';
import { WorkspaceQueryHookType } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/types/workspace-query-hook.type';
import { type WorkspaceAuthContext } from 'src/engine/core-modules/auth/types/workspace-auth-context.type';
import { type LeadWorkspaceEntity } from 'src/modules/lead/standard-objects/lead.workspace-entity';
import { LeadGeocoderService } from 'src/modules/lead-geocoder/services/lead-geocoder.service';

@WorkspaceQueryHook({
  key: 'lead.createOne',
  type: WorkspaceQueryHookType.POST_HOOK,
})
export class LeadGeocoderCreatePostQueryHook
  implements WorkspacePostQueryHookInstance
{
  private readonly logger = new Logger(LeadGeocoderCreatePostQueryHook.name);

  constructor(private readonly leadGeocoderService: LeadGeocoderService) {}

  async execute(
    authContext: WorkspaceAuthContext,
    _objectName: string,
    payload: LeadWorkspaceEntity | LeadWorkspaceEntity[],
  ): Promise<void> {
    await geocodeIfNeeded(
      authContext,
      payload,
      this.leadGeocoderService,
      this.logger,
    );
  }
}

@WorkspaceQueryHook({
  key: 'lead.updateOne',
  type: WorkspaceQueryHookType.POST_HOOK,
})
export class LeadGeocoderUpdatePostQueryHook
  implements WorkspacePostQueryHookInstance
{
  private readonly logger = new Logger(LeadGeocoderUpdatePostQueryHook.name);

  constructor(private readonly leadGeocoderService: LeadGeocoderService) {}

  async execute(
    authContext: WorkspaceAuthContext,
    _objectName: string,
    payload: LeadWorkspaceEntity | LeadWorkspaceEntity[],
  ): Promise<void> {
    await geocodeIfNeeded(
      authContext,
      payload,
      this.leadGeocoderService,
      this.logger,
    );
  }
}

async function geocodeIfNeeded(
  authContext: WorkspaceAuthContext,
  payload: LeadWorkspaceEntity | LeadWorkspaceEntity[],
  service: LeadGeocoderService,
  logger: Logger,
): Promise<void> {
  const lead = Array.isArray(payload) ? payload[0] : payload;

  if (!isDefined(lead)) return;

  const address = (lead as any).address as string | null | undefined;
  const latitude = (lead as any).latitude as number | null | undefined;
  const longitude = (lead as any).longitude as number | null | undefined;

  // Only geocode if address is present and coordinates are missing
  if (!address || address.trim() === '') return;
  if (isDefined(latitude) && isDefined(longitude)) return;

  const workspaceId = authContext.workspace.id;

  logger.log(
    `LeadGeocoderHook: scheduling geocoding for lead=${lead.id} workspace=${workspaceId}`,
  );

  // Fire-and-forget — don't block the API response
  service
    .geocodeAndUpdate(workspaceId, lead.id, address)
    .catch((err: Error) => {
      logger.error(
        `LeadGeocoderHook: geocoding failed for lead=${lead.id}: ${err.message}`,
      );
    });
}
