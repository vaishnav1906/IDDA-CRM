import * as fs from 'fs';
import * as path from 'path';

import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';

import { DataSource, ILike, IsNull, Not, Repository } from 'typeorm';

import { getWorkspaceAuthContext } from 'src/engine/core-modules/auth/storage/workspace-auth-context.storage';
import { DecisionRegisterAttachmentEntity } from 'src/engine/core-modules/decision-register/decision-register-attachment.entity';
import { DecisionRegisterCommentEntity } from 'src/engine/core-modules/decision-register/decision-register-comment.entity';
import { DecisionRegisterOptionEntity } from 'src/engine/core-modules/decision-register/decision-register-option.entity';
import { DecisionRegisterEntity } from 'src/engine/core-modules/decision-register/decision-register.entity';
import { CreateCommentDto } from 'src/engine/core-modules/decision-register/dtos/create-comment.dto';
import { CreateDecisionDto } from 'src/engine/core-modules/decision-register/dtos/create-decision.dto';
import {
  AttachmentResponse,
  CommentResponse,
  DecisionOptionResponse,
  DecisionPermissionsResponse,
  DecisionResponse,
  ListDecisionsResponse,
  MemberResponse,
} from 'src/engine/core-modules/decision-register/dtos/decision-response.dto';
import { ListDecisionsQueryDto } from 'src/engine/core-modules/decision-register/dtos/list-decisions-query.dto';
import { UpdateDecisionDto } from 'src/engine/core-modules/decision-register/dtos/update-decision.dto';
import { DecisionRegisterExceptionCode } from 'src/engine/core-modules/decision-register/exceptions/decision-register-exception-code.enum';
import { DecisionRegisterException } from 'src/engine/core-modules/decision-register/exceptions/decision-register.exception';

const APPROVER_ROLES = ['Admin', 'CEO', 'CTO'];

const UPLOADS_DIR = path.join(process.cwd(), 'uploads', 'decision-register');

@Injectable()
export class DecisionRegisterService {
  constructor(
    @InjectRepository(DecisionRegisterEntity)
    private readonly decisionRepository: Repository<DecisionRegisterEntity>,
    @InjectRepository(DecisionRegisterOptionEntity)
    private readonly optionRepository: Repository<DecisionRegisterOptionEntity>,
    @InjectRepository(DecisionRegisterAttachmentEntity)
    private readonly attachmentRepository: Repository<DecisionRegisterAttachmentEntity>,
    @InjectRepository(DecisionRegisterCommentEntity)
    private readonly commentRepository: Repository<DecisionRegisterCommentEntity>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
  }

  private getAuthContext() {
    return getWorkspaceAuthContext();
  }

  private getCurrentUserId(): string {
    const ctx = this.getAuthContext();
    return ctx.type === 'user' ? ctx.user.id : 'system';
  }

  private getCurrentWorkspaceId(): string {
    return this.getAuthContext().workspace.id;
  }

  private async getUserName(userId: string): Promise<string> {
    const rows = await this.dataSource.query<{ firstName: string; lastName: string; email: string }[]>(
      `SELECT "firstName", "lastName", email FROM core."user" WHERE id = $1 LIMIT 1`,
      [userId],
    );
    if (!rows[0]) return 'Unknown';
    const { firstName, lastName, email } = rows[0];
    const name = `${firstName ?? ''} ${lastName ?? ''}`.trim();
    return name || email;
  }

  async getPermissions(): Promise<DecisionPermissionsResponse> {
    const ctx = this.getAuthContext();
    const workspaceId = ctx.workspace.id;

    if (ctx.type !== 'user') {
      return { userId: 'system', userEmail: '', userName: 'System', canApprove: false, role: 'system' };
    }

    const userId = ctx.user.id;
    const userEmail = ctx.user.email;
    const userName = `${ctx.user.firstName ?? ''} ${ctx.user.lastName ?? ''}`.trim() || userEmail;

    const result = await this.dataSource.query<{ label: string }[]>(
      `SELECT r.label FROM core."roleTarget" rt
       JOIN core.role r ON r.id = rt."roleId"
       JOIN core."userWorkspace" uw ON uw.id = rt."userWorkspaceId"
       WHERE uw."userId" = $1 AND uw."workspaceId" = $2 AND uw."deletedAt" IS NULL
       LIMIT 1`,
      [userId, workspaceId],
    );

    const role = result[0]?.label ?? 'Member';
    const canApprove = APPROVER_ROLES.includes(role);

    return { userId, userEmail, userName, canApprove, role };
  }

  async getMembers(): Promise<MemberResponse[]> {
    const workspaceId = this.getCurrentWorkspaceId();
    const rows = await this.dataSource.query<{ id: string; firstName: string; lastName: string; email: string }[]>(
      `SELECT DISTINCT u.id, u."firstName", u."lastName", u.email
       FROM core."user" u
       JOIN core."userWorkspace" uw ON uw."userId" = u.id
       JOIN core."roleTarget" rt ON rt."userWorkspaceId" = uw.id
       JOIN core.role r ON r.id = rt."roleId"
       WHERE uw."workspaceId" = $1
         AND uw."deletedAt" IS NULL
         AND r.label != 'Member'
       ORDER BY u."firstName", u."lastName"`,
      [workspaceId],
    );
    return rows.map((r) => ({
      id: r.id,
      name: `${r.firstName ?? ''} ${r.lastName ?? ''}`.trim() || r.email,
      email: r.email,
    }));
  }

  async getAllTags(): Promise<string[]> {
    const workspaceId = this.getCurrentWorkspaceId();
    const rows = await this.decisionRepository.find({
      where: { workspaceId, deletedAt: IsNull() },
      select: ['tags'],
    });
    const tagSet = new Set<string>();
    for (const row of rows) {
      for (const tag of row.tags ?? []) {
        if (tag) tagSet.add(tag.startsWith('#') ? tag : `#${tag}`);
      }
    }
    return [...tagSet].sort();
  }

  private toAttachmentResponse(a: DecisionRegisterAttachmentEntity): AttachmentResponse {
    return {
      id: a.id,
      fileName: a.fileName,
      fileSize: Number(a.fileSize),
      mimeType: a.mimeType,
      uploadedById: a.uploadedById,
      uploadedAt: a.uploadedAt.toISOString(),
      downloadUrl: `/rest/decision-register/attachments/${a.id}/download`,
    };
  }

  private async toResponse(entity: DecisionRegisterEntity): Promise<DecisionResponse> {
    const createdByName = await this.getUserName(entity.createdById);
    const ids = entity.requestedApproverIds ?? [];
    const requestedApproverNames = await Promise.all(ids.map((id) => this.getUserName(id)));
    const attachments = await this.attachmentRepository.find({ where: { decisionId: entity.id } });

    return {
      id: entity.id,
      title: entity.title,
      context: entity.context,
      decisionSummary: entity.decisionSummary,
      outcome: entity.outcome,
      category: entity.category,
      tags: (entity.tags ?? []).map((t) => (t.startsWith('#') ? t : `#${t}`)),
      createdById: entity.createdById,
      createdByName,
      updatedById: entity.updatedById,
      entityType: entity.entityType,
      entityId: entity.entityId,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
      options: (entity.options ?? []).map((o): DecisionOptionResponse => ({ id: o.id, optionText: o.optionText })),
      status: entity.status ?? 'DRAFT',
      requestedApproverIds: ids,
      requestedApproverNames,
      approvedById: entity.approvedById,
      approvedAt: entity.approvedAt?.toISOString() ?? null,
      attachments: attachments.map((a) => this.toAttachmentResponse(a)),
    };
  }

  async list(query: ListDecisionsQueryDto): Promise<ListDecisionsResponse> {
    const workspaceId = this.getCurrentWorkspaceId();
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const baseWhere: Record<string, unknown> = { workspaceId, deletedAt: IsNull() };
    if (query.category) baseWhere['category'] = query.category;

    let whereClause: Record<string, unknown>[] | Record<string, unknown>;
    if (query.search) {
      const pattern = ILike(`%${query.search}%`);
      whereClause = [
        { ...baseWhere, title: pattern },
        { ...baseWhere, context: pattern },
        { ...baseWhere, decisionSummary: pattern },
        { ...baseWhere, tags: pattern },
      ];
    } else {
      whereClause = baseWhere;
    }

    const [entities, total] = await this.decisionRepository.findAndCount({
      where: whereClause as never,
      relations: ['options'],
      order: { updatedAt: 'DESC' },
      skip,
      take: pageSize,
    });

    const data = await Promise.all(entities.map((e) => this.toResponse(e)));
    return { data, total, page, pageSize };
  }

  async listDeleted(): Promise<DecisionResponse[]> {
    const { canApprove } = await this.getPermissions();
    if (!canApprove) {
      throw new DecisionRegisterException(
        'Only admins can view deleted decisions',
        DecisionRegisterExceptionCode.FORBIDDEN,
      );
    }

    const workspaceId = this.getCurrentWorkspaceId();
    const entities = await this.decisionRepository.find({
      where: { workspaceId, deletedAt: Not(IsNull()) },
      relations: ['options'],
      order: { deletedAt: 'DESC' },
    });

    return Promise.all(entities.map((e) => this.toResponse(e)));
  }

  async findOne(id: string): Promise<DecisionResponse> {
    const workspaceId = this.getCurrentWorkspaceId();
    const entity = await this.decisionRepository.findOne({
      where: { id, workspaceId, deletedAt: IsNull() },
      relations: ['options'],
    });

    if (!entity) {
      throw new DecisionRegisterException(`Decision ${id} not found`, DecisionRegisterExceptionCode.NOT_FOUND);
    }

    return this.toResponse(entity);
  }

  async create(dto: CreateDecisionDto): Promise<DecisionResponse> {
    const workspaceId = this.getCurrentWorkspaceId();
    const userId = this.getCurrentUserId();

    const normalisedTags = (dto.tags ?? []).map((t) => (t.startsWith('#') ? t : `#${t}`));

    const decision = this.decisionRepository.create({
      workspaceId,
      title: dto.title,
      context: dto.context,
      decisionSummary: dto.decisionSummary,
      outcome: dto.outcome ?? null,
      category: dto.category ?? null,
      tags: normalisedTags.length ? normalisedTags : null,
      createdById: userId,
      updatedById: userId,
      requestedApproverIds: dto.requestedApproverIds?.length ? dto.requestedApproverIds : null,
      status: dto.submitForApproval ? 'PENDING_APPROVAL' : 'DRAFT',
    });

    const saved = await this.decisionRepository.save(decision);

    if (dto.options?.length) {
      await this.optionRepository.save(
        dto.options.map((text) => this.optionRepository.create({ decisionId: saved.id, optionText: text })),
      );
    }

    return this.findOne(saved.id);
  }

  async update(id: string, dto: UpdateDecisionDto): Promise<DecisionResponse> {
    const workspaceId = this.getCurrentWorkspaceId();
    const userId = this.getCurrentUserId();

    const entity = await this.decisionRepository.findOne({ where: { id, workspaceId, deletedAt: IsNull() } });
    if (!entity) throw new DecisionRegisterException(`Decision ${id} not found`, DecisionRegisterExceptionCode.NOT_FOUND);

    if (dto.context !== undefined) entity.context = dto.context;
    if (dto.decisionSummary !== undefined) entity.decisionSummary = dto.decisionSummary;
    if (dto.outcome !== undefined) entity.outcome = dto.outcome;
    if (dto.category !== undefined) entity.category = dto.category;
    if (dto.tags !== undefined) entity.tags = dto.tags.map((t) => (t.startsWith('#') ? t : `#${t}`));
    if (dto.requestedApproverIds !== undefined) entity.requestedApproverIds = dto.requestedApproverIds?.length ? dto.requestedApproverIds : null;
    if (dto.submitForApproval && entity.status === 'DRAFT') entity.status = 'PENDING_APPROVAL';
    entity.updatedById = userId;

    await this.decisionRepository.save(entity);

    if (dto.options !== undefined) {
      await this.optionRepository.delete({ decisionId: id });
      if (dto.options.length) {
        await this.optionRepository.save(
          dto.options.map((text) => this.optionRepository.create({ decisionId: id, optionText: text })),
        );
      }
    }

    return this.findOne(id);
  }

  private async canActOnDecision(entity: DecisionRegisterEntity): Promise<{ allowed: boolean; userId: string }> {
    const { canApprove, userId } = await this.getPermissions();
    const isDesignatedApprover = (entity.requestedApproverIds ?? []).includes(userId);
    return { allowed: canApprove || isDesignatedApprover, userId };
  }

  async approve(id: string): Promise<DecisionResponse> {
    const workspaceId = this.getCurrentWorkspaceId();
    const entity = await this.decisionRepository.findOne({ where: { id, workspaceId, deletedAt: IsNull() } });
    if (!entity) throw new DecisionRegisterException(`Decision ${id} not found`, DecisionRegisterExceptionCode.NOT_FOUND);

    const { allowed, userId } = await this.canActOnDecision(entity);
    if (!allowed) throw new DecisionRegisterException('You do not have permission to approve this decision', DecisionRegisterExceptionCode.FORBIDDEN);

    entity.status = 'APPROVED';
    entity.approvedById = userId;
    entity.approvedAt = new Date();
    entity.updatedById = userId;
    await this.decisionRepository.save(entity);
    return this.findOne(id);
  }

  async reject(id: string): Promise<DecisionResponse> {
    const workspaceId = this.getCurrentWorkspaceId();
    const entity = await this.decisionRepository.findOne({ where: { id, workspaceId, deletedAt: IsNull() } });
    if (!entity) throw new DecisionRegisterException(`Decision ${id} not found`, DecisionRegisterExceptionCode.NOT_FOUND);

    const { allowed, userId } = await this.canActOnDecision(entity);
    if (!allowed) throw new DecisionRegisterException('You do not have permission to reject this decision', DecisionRegisterExceptionCode.FORBIDDEN);

    entity.status = 'REJECTED';
    entity.approvedById = userId;
    entity.approvedAt = new Date();
    entity.updatedById = userId;
    await this.decisionRepository.save(entity);
    return this.findOne(id);
  }

  async softDelete(id: string): Promise<void> {
    const workspaceId = this.getCurrentWorkspaceId();
    const entity = await this.decisionRepository.findOne({ where: { id, workspaceId, deletedAt: IsNull() } });
    if (!entity) throw new DecisionRegisterException(`Decision ${id} not found`, DecisionRegisterExceptionCode.NOT_FOUND);
    entity.deletedAt = new Date();
    await this.decisionRepository.save(entity);
  }

  async restore(id: string): Promise<DecisionResponse> {
    const { canApprove } = await this.getPermissions();
    if (!canApprove) throw new DecisionRegisterException('Only admins can restore deleted decisions', DecisionRegisterExceptionCode.FORBIDDEN);

    const workspaceId = this.getCurrentWorkspaceId();
    const entity = await this.decisionRepository.findOne({ where: { id, workspaceId, deletedAt: Not(IsNull()) }, relations: ['options'] });
    if (!entity) throw new DecisionRegisterException(`Deleted decision ${id} not found`, DecisionRegisterExceptionCode.NOT_FOUND);

    entity.deletedAt = null;
    await this.decisionRepository.save(entity);
    return this.toResponse(entity);
  }

  async uploadAttachment(decisionId: string, file: { buffer: Buffer; originalname: string; mimetype: string; size: number }): Promise<AttachmentResponse> {
    const workspaceId = this.getCurrentWorkspaceId();
    const userId = this.getCurrentUserId();

    const entity = await this.decisionRepository.findOne({ where: { id: decisionId, workspaceId, deletedAt: IsNull() } });
    if (!entity) throw new DecisionRegisterException(`Decision ${decisionId} not found`, DecisionRegisterExceptionCode.NOT_FOUND);

    const safeFileName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storageName = `${Date.now()}_${safeFileName}`;
    const storagePath = path.join(UPLOADS_DIR, storageName);
    fs.writeFileSync(storagePath, file.buffer);

    const attachment = this.attachmentRepository.create({
      decisionId,
      workspaceId,
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
      storagePath: storageName,
      uploadedById: userId,
    });

    const saved = await this.attachmentRepository.save(attachment);
    return this.toAttachmentResponse(saved);
  }

  async downloadAttachment(attachmentId: string): Promise<{ buffer: Buffer; fileName: string; mimeType: string }> {
    const workspaceId = this.getCurrentWorkspaceId();
    const attachment = await this.attachmentRepository.findOne({ where: { id: attachmentId, workspaceId } });
    if (!attachment) throw new DecisionRegisterException(`Attachment ${attachmentId} not found`, DecisionRegisterExceptionCode.NOT_FOUND);

    const filePath = path.join(UPLOADS_DIR, attachment.storagePath);
    if (!fs.existsSync(filePath)) throw new DecisionRegisterException('File not found on disk', DecisionRegisterExceptionCode.NOT_FOUND);

    return { buffer: fs.readFileSync(filePath), fileName: attachment.fileName, mimeType: attachment.mimeType };
  }

  async deleteAttachment(attachmentId: string): Promise<void> {
    const workspaceId = this.getCurrentWorkspaceId();
    const attachment = await this.attachmentRepository.findOne({ where: { id: attachmentId, workspaceId } });
    if (!attachment) throw new DecisionRegisterException(`Attachment ${attachmentId} not found`, DecisionRegisterExceptionCode.NOT_FOUND);

    const filePath = path.join(UPLOADS_DIR, attachment.storagePath);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    await this.attachmentRepository.delete(attachmentId);
  }

  private buildInitials(name: string): string {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  private async toCommentResponse(
    comment: DecisionRegisterCommentEntity,
    replies: DecisionRegisterCommentEntity[],
    nameCache: Map<string, string>,
  ): Promise<CommentResponse> {
    if (!nameCache.has(comment.authorId)) {
      nameCache.set(comment.authorId, await this.getUserName(comment.authorId));
    }
    const authorName = nameCache.get(comment.authorId) ?? 'Unknown';
    const childReplies = replies.filter((r) => r.parentId === comment.id);
    const nestedReplies = await Promise.all(
      childReplies.map((r) => this.toCommentResponse(r, replies, nameCache)),
    );

    return {
      id: comment.id,
      decisionId: comment.decisionId,
      parentId: comment.parentId,
      authorId: comment.authorId,
      authorName,
      authorInitials: this.buildInitials(authorName),
      body: comment.body,
      createdAt: comment.createdAt.toISOString(),
      replies: nestedReplies,
    };
  }

  async listComments(decisionId: string): Promise<CommentResponse[]> {
    const workspaceId = this.getCurrentWorkspaceId();

    const decision = await this.decisionRepository.findOne({
      where: { id: decisionId, workspaceId, deletedAt: IsNull() },
    });
    if (!decision) {
      throw new DecisionRegisterException(`Decision ${decisionId} not found`, DecisionRegisterExceptionCode.NOT_FOUND);
    }

    const all = await this.commentRepository.find({
      where: { decisionId, workspaceId, deletedAt: IsNull() },
      order: { createdAt: 'ASC' },
    });

    const topLevel = all.filter((c) => c.parentId === null);
    const replies = all.filter((c) => c.parentId !== null);
    const nameCache = new Map<string, string>();

    return Promise.all(topLevel.map((c) => this.toCommentResponse(c, replies, nameCache)));
  }

  async addComment(decisionId: string, dto: CreateCommentDto): Promise<CommentResponse> {
    const workspaceId = this.getCurrentWorkspaceId();
    const authorId = this.getCurrentUserId();

    const decision = await this.decisionRepository.findOne({
      where: { id: decisionId, workspaceId, deletedAt: IsNull() },
    });
    if (!decision) {
      throw new DecisionRegisterException(`Decision ${decisionId} not found`, DecisionRegisterExceptionCode.NOT_FOUND);
    }

    if (dto.parentId) {
      const parent = await this.commentRepository.findOne({
        where: { id: dto.parentId, decisionId, workspaceId, deletedAt: IsNull() },
      });
      if (!parent) {
        throw new DecisionRegisterException(`Parent comment not found`, DecisionRegisterExceptionCode.NOT_FOUND);
      }
    }

    const comment = this.commentRepository.create({
      workspaceId,
      decisionId,
      parentId: dto.parentId ?? null,
      authorId,
      body: dto.body.trim(),
    });

    const saved = await this.commentRepository.save(comment);
    const nameCache = new Map<string, string>();
    return this.toCommentResponse(saved, [], nameCache);
  }

  async deleteComment(commentId: string): Promise<void> {
    const workspaceId = this.getCurrentWorkspaceId();
    const { userId, canApprove } = await this.getPermissions();

    const comment = await this.commentRepository.findOne({
      where: { id: commentId, workspaceId, deletedAt: IsNull() },
    });
    if (!comment) {
      throw new DecisionRegisterException(`Comment ${commentId} not found`, DecisionRegisterExceptionCode.NOT_FOUND);
    }

    if (comment.authorId !== userId && !canApprove) {
      throw new DecisionRegisterException('You can only delete your own comments', DecisionRegisterExceptionCode.FORBIDDEN);
    }

    const now = new Date();
    comment.deletedAt = now;
    await this.commentRepository.save(comment);

    // Soft-delete child replies
    await this.commentRepository
      .createQueryBuilder()
      .update()
      .set({ deletedAt: now })
      .where('"parentId" = :commentId AND "workspaceId" = :workspaceId AND "deletedAt" IS NULL', { commentId, workspaceId })
      .execute();
  }
}
