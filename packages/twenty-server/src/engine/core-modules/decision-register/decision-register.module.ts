import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from 'src/engine/core-modules/auth/auth.module';
import { WorkspaceCacheStorageModule } from 'src/engine/workspace-cache-storage/workspace-cache-storage.module';
import { DecisionRegisterAttachmentEntity } from 'src/engine/core-modules/decision-register/decision-register-attachment.entity';
import { DecisionRegisterCommentEntity } from 'src/engine/core-modules/decision-register/decision-register-comment.entity';
import { DecisionRegisterOptionEntity } from 'src/engine/core-modules/decision-register/decision-register-option.entity';
import { DecisionRegisterEntity } from 'src/engine/core-modules/decision-register/decision-register.entity';
import { DecisionRegisterController } from 'src/engine/core-modules/decision-register/controllers/decision-register.controller';
import { DecisionRegisterRestApiExceptionFilter } from 'src/engine/core-modules/decision-register/filters/decision-register-rest-api-exception.filter';
import { DecisionRegisterService } from 'src/engine/core-modules/decision-register/services/decision-register.service';

@Module({
  imports: [
    AuthModule,
    WorkspaceCacheStorageModule,
    TypeOrmModule.forFeature([
      DecisionRegisterEntity,
      DecisionRegisterOptionEntity,
      DecisionRegisterAttachmentEntity,
      DecisionRegisterCommentEntity,
    ]),
  ],
  controllers: [DecisionRegisterController],
  providers: [DecisionRegisterService, DecisionRegisterRestApiExceptionFilter],
  exports: [DecisionRegisterService],
})
export class DecisionRegisterModule {}
