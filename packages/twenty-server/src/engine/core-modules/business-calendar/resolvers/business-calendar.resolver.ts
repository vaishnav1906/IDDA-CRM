import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';

import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { UserAuthGuard } from 'src/engine/guards/user-auth.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
import { UpsertBusinessCalendarInput } from 'src/engine/core-modules/business-calendar/dtos/upsert-business-calendar.input';
import { BusinessCalendarEntity } from 'src/engine/core-modules/business-calendar/entities/business-calendar.entity';
import { BusinessCalendarService } from 'src/engine/core-modules/business-calendar/services/business-calendar.service';

@Resolver(() => BusinessCalendarEntity)
@UseGuards(WorkspaceAuthGuard, UserAuthGuard)
export class BusinessCalendarResolver {
  constructor(
    private readonly businessCalendarService: BusinessCalendarService,
  ) {}

  @Query(() => BusinessCalendarEntity, { nullable: true })
  async businessCalendar(
    @AuthWorkspace() { id: workspaceId }: { id: string },
  ): Promise<BusinessCalendarEntity | null> {
    return this.businessCalendarService.findByWorkspaceId(workspaceId);
  }

  @Mutation(() => BusinessCalendarEntity)
  async upsertBusinessCalendar(
    @AuthWorkspace() { id: workspaceId }: { id: string },
    @Args('input') input: UpsertBusinessCalendarInput,
  ): Promise<BusinessCalendarEntity> {
    return this.businessCalendarService.upsert(workspaceId, input);
  }

  @Mutation(() => Boolean)
  async deleteBusinessCalendar(
    @AuthWorkspace() { id: workspaceId }: { id: string },
  ): Promise<boolean> {
    await this.businessCalendarService.delete(workspaceId, workspaceId);

    return true;
  }
}
