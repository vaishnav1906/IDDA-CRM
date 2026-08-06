import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { WorkspaceInvitationService } from 'src/engine/core-modules/workspace-invitation/services/workspace-invitation.service';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import {
  WorkspaceJoinRequestEntity,
  WorkspaceJoinRequestStatus,
} from 'src/engine/core-modules/workspace-join-request/workspace-join-request.entity';
import { WorkspaceMemberWorkspaceEntity } from 'src/modules/workspace-member/standard-objects/workspace-member.workspace-entity';

export type CreateJoinRequestInput = {
  email: string;
  firstName: string;
  lastName?: string | null;
  message?: string | null;
  workspaceId: string;
};

@Injectable()
export class WorkspaceJoinRequestService {
  constructor(
    @InjectRepository(WorkspaceJoinRequestEntity)
    private readonly joinRequestRepository: Repository<WorkspaceJoinRequestEntity>,
    private readonly workspaceInvitationService: WorkspaceInvitationService,
  ) {}

  async createRequest(
    input: CreateJoinRequestInput,
  ): Promise<WorkspaceJoinRequestEntity> {
    const joinRequest = this.joinRequestRepository.create({
      email: input.email.toLowerCase(),
      firstName: input.firstName,
      lastName: input.lastName ?? null,
      message: input.message ?? null,
      workspaceId: input.workspaceId,
      status: WorkspaceJoinRequestStatus.PENDING,
    });

    return this.joinRequestRepository.save(joinRequest);
  }

  async findPendingRequests(
    workspaceId: string,
  ): Promise<WorkspaceJoinRequestEntity[]> {
    return this.joinRequestRepository.find({
      where: {
        workspaceId,
        status: WorkspaceJoinRequestStatus.PENDING,
      },
      order: { createdAt: 'ASC' },
    });
  }

  async approveRequest(
    id: string,
    workspaceId: string,
    roleId: string | null | undefined,
    workspace: WorkspaceEntity,
    sender: WorkspaceMemberWorkspaceEntity,
  ): Promise<WorkspaceJoinRequestEntity> {
    const joinRequest = await this.joinRequestRepository.findOne({
      where: { id, workspaceId },
    });

    if (!joinRequest) {
      throw new NotFoundException(`Join request ${id} not found`);
    }

    await this.workspaceInvitationService.sendInvitations(
      [joinRequest.email],
      workspace,
      sender,
      roleId ?? undefined,
    );

    joinRequest.status = WorkspaceJoinRequestStatus.APPROVED;

    return this.joinRequestRepository.save(joinRequest);
  }

  async rejectRequest(
    id: string,
    workspaceId: string,
  ): Promise<WorkspaceJoinRequestEntity> {
    const joinRequest = await this.joinRequestRepository.findOne({
      where: { id, workspaceId },
    });

    if (!joinRequest) {
      throw new NotFoundException(`Join request ${id} not found`);
    }

    joinRequest.status = WorkspaceJoinRequestStatus.REJECTED;

    return this.joinRequestRepository.save(joinRequest);
  }
}
