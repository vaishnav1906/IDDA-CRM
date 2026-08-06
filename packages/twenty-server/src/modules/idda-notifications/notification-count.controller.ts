import { Controller, Get, UseFilters, UseGuards } from '@nestjs/common';

import { RestApiExceptionFilter } from 'src/engine/api/rest/rest-api-exception.filter';
import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { buildSystemAuthContext } from 'src/engine/twenty-orm/utils/build-system-auth-context.util';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { AuthWorkspaceMemberId } from 'src/engine/decorators/auth/auth-workspace-member-id.decorator';
import { JwtAuthGuard } from 'src/engine/guards/jwt-auth.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';

@Controller('api/idda/notifications')
@UseGuards(JwtAuthGuard, WorkspaceAuthGuard)
@UseFilters(RestApiExceptionFilter)
export class NotificationCountController {
  constructor(
    private readonly globalWorkspaceOrmManager: GlobalWorkspaceOrmManager,
  ) {}

  @Get('unread-count')
  async getUnreadCount(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @AuthWorkspaceMemberId() workspaceMemberId: string,
  ): Promise<{ count: number; notifications: Array<{ id: string; title: string; actionUrl: string | null }> }> {
    const authContext = buildSystemAuthContext(workspace.id);

    let count = 0;
    const notifications: Array<{ id: string; title: string; actionUrl: string | null }> = [];

    await this.globalWorkspaceOrmManager.executeInWorkspaceContext(async () => {
      const repo = await this.globalWorkspaceOrmManager.getRepository(
        workspace.id,
        'inAppNotification',
        { shouldBypassPermissionChecks: true },
      );

      const rows = await repo.find({
        where: {
          isRead: false,
          recipientId: workspaceMemberId,
        } as any,
        order: { createdAt: 'DESC' } as any,
        take: 10,
      });

      count = rows.length;
      notifications.push(
        ...rows.map((r: any) => ({
          id: r.id as string,
          title: r.title as string,
          actionUrl: (r.actionUrl as string | null) ?? null,
        })),
      );
    }, authContext);

    return { count, notifications };
  }
}
