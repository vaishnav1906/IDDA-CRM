import { QueryRunner } from 'typeorm';

import { RegisteredInstanceCommand } from 'src/engine/core-modules/upgrade/decorators/registered-instance-command.decorator';
import { FastInstanceCommand } from 'src/engine/core-modules/upgrade/interfaces/fast-instance-command.interface';

@RegisteredInstanceCommand('2.17.0', 1801800000001)
export class AddDecisionRegisterAttachmentsFastInstanceCommand
  implements FastInstanceCommand
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "core"."decisionRegisterAttachment" (
        "id"           uuid        NOT NULL DEFAULT gen_random_uuid(),
        "decisionId"   uuid        NOT NULL,
        "workspaceId"  uuid        NOT NULL,
        "fileName"     varchar     NOT NULL,
        "fileSize"     bigint      NOT NULL DEFAULT 0,
        "mimeType"     varchar     NOT NULL DEFAULT 'application/octet-stream',
        "storagePath"  text        NOT NULL,
        "uploadedById" uuid        NOT NULL,
        "uploadedAt"   timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_decisionRegisterAttachment_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_decisionRegisterAttachment_decisionId"
          FOREIGN KEY ("decisionId")
          REFERENCES "core"."decisionRegister"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_decisionRegisterAttachment_workspaceId"
          FOREIGN KEY ("workspaceId")
          REFERENCES "core"."workspace"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_decisionRegisterAttachment_decisionId"
        ON "core"."decisionRegisterAttachment" ("decisionId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "core"."IDX_decisionRegisterAttachment_decisionId"`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "core"."decisionRegisterAttachment"`,
    );
  }
}
