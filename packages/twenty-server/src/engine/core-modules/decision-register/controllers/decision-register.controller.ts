import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  Res,
  UploadedFile,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { Response } from 'express';

import { JwtAuthGuard } from 'src/engine/guards/jwt-auth.guard';
import { NoPermissionGuard } from 'src/engine/guards/no-permission.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';
import { CreateCommentDto } from 'src/engine/core-modules/decision-register/dtos/create-comment.dto';
import { CreateDecisionDto } from 'src/engine/core-modules/decision-register/dtos/create-decision.dto';
import {
  AttachmentResponse,
  CommentResponse,
  DecisionPermissionsResponse,
  DecisionResponse,
  ListDecisionsResponse,
  MemberResponse,
} from 'src/engine/core-modules/decision-register/dtos/decision-response.dto';
import { ListDecisionsQueryDto } from 'src/engine/core-modules/decision-register/dtos/list-decisions-query.dto';
import { UpdateDecisionDto } from 'src/engine/core-modules/decision-register/dtos/update-decision.dto';
import { DecisionRegisterRestApiExceptionFilter } from 'src/engine/core-modules/decision-register/filters/decision-register-rest-api-exception.filter';
import { DecisionRegisterService } from 'src/engine/core-modules/decision-register/services/decision-register.service';

type UploadedMulterFile = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

@Controller('rest/decision-register')
@UseGuards(JwtAuthGuard, WorkspaceAuthGuard, NoPermissionGuard)
@UseFilters(DecisionRegisterRestApiExceptionFilter)
export class DecisionRegisterController {
  constructor(private readonly decisionRegisterService: DecisionRegisterService) {}

  @Get('me/permissions')
  async getPermissions(): Promise<DecisionPermissionsResponse> {
    return this.decisionRegisterService.getPermissions();
  }

  @Get('tags')
  async getTags(): Promise<string[]> {
    return this.decisionRegisterService.getAllTags();
  }

  @Get('members')
  async getMembers(): Promise<MemberResponse[]> {
    return this.decisionRegisterService.getMembers();
  }

  @Get('deleted')
  async listDeleted(): Promise<DecisionResponse[]> {
    return this.decisionRegisterService.listDeleted();
  }

  @Get()
  async list(@Query() query: ListDecisionsQueryDto): Promise<ListDecisionsResponse> {
    return this.decisionRegisterService.list(query);
  }

  @Get('attachments/:attachmentId/download')
  async downloadAttachment(
    @Param('attachmentId') attachmentId: string,
    @Res() res: Response,
  ): Promise<void> {
    const { buffer, fileName, mimeType } = await this.decisionRegisterService.downloadAttachment(attachmentId);
    res.set({ 'Content-Type': mimeType, 'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"` });
    res.send(buffer);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<DecisionResponse> {
    return this.decisionRegisterService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateDecisionDto): Promise<DecisionResponse> {
    return this.decisionRegisterService.create(dto);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateDecisionDto): Promise<DecisionResponse> {
    return this.decisionRegisterService.update(id, dto);
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  async approve(@Param('id') id: string): Promise<DecisionResponse> {
    return this.decisionRegisterService.approve(id);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  async reject(@Param('id') id: string): Promise<DecisionResponse> {
    return this.decisionRegisterService.reject(id);
  }

  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  async restore(@Param('id') id: string): Promise<DecisionResponse> {
    return this.decisionRegisterService.restore(id);
  }

  @Post(':id/attachments')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }))
  async uploadAttachment(
    @Param('id') id: string,
    @UploadedFile() file: UploadedMulterFile | undefined,
  ): Promise<AttachmentResponse> {
    if (!file) throw new Error('No file uploaded');
    return this.decisionRegisterService.uploadAttachment(id, file);
  }

  @Delete('attachments/:attachmentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAttachment(@Param('attachmentId') attachmentId: string): Promise<void> {
    return this.decisionRegisterService.deleteAttachment(attachmentId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async softDelete(@Param('id') id: string): Promise<void> {
    return this.decisionRegisterService.softDelete(id);
  }

  @Get(':id/comments')
  async listComments(@Param('id') id: string): Promise<CommentResponse[]> {
    return this.decisionRegisterService.listComments(id);
  }

  @Post(':id/comments')
  @HttpCode(HttpStatus.CREATED)
  async addComment(
    @Param('id') id: string,
    @Body() dto: CreateCommentDto,
  ): Promise<CommentResponse> {
    return this.decisionRegisterService.addComment(id, dto);
  }

  @Delete('comments/:commentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteComment(@Param('commentId') commentId: string): Promise<void> {
    return this.decisionRegisterService.deleteComment(commentId);
  }
}
