import { QueryRunner } from 'typeorm';

import { RegisteredInstanceCommand } from 'src/engine/core-modules/upgrade/decorators/registered-instance-command.decorator';
import { FastInstanceCommand } from 'src/engine/core-modules/upgrade/interfaces/fast-instance-command.interface';

@RegisteredInstanceCommand('2.17.0', 1801900000001)
export class AddDecisionRegisterCommentsFastInstanceCommand
  implements FastInstanceCommand
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "core"."decisionRegisterComment" (
        "id"          uuid        NOT NULL DEFAULT gen_random_uuid(),
        "workspaceId" uuid        NOT NULL,
        "decisionId"  uuid        NOT NULL,
        "parentId"    uuid        NULL,
        "authorId"    uuid        NOT NULL,
        "body"        text        NOT NULL,
        "createdAt"   timestamptz NOT NULL DEFAULT now(),
        "updatedAt"   timestamptz NOT NULL DEFAULT now(),
        "deletedAt"   timestamptz NULL,
        CONSTRAINT "PK_decisionRegisterComment_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_decisionRegisterComment_decisionId"
          FOREIGN KEY ("decisionId")
          REFERENCES "core"."decisionRegister"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_decisionRegisterComment_workspaceId"
          FOREIGN KEY ("workspaceId")
          REFERENCES "core"."workspace"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_decisionRegisterComment_workspace_decision"
        ON "core"."decisionRegisterComment" ("workspaceId", "decisionId", "deletedAt")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_decisionRegisterComment_parentId"
        ON "core"."decisionRegisterComment" ("parentId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "core"."IDX_decisionRegisterComment_parentId"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "core"."IDX_decisionRegisterComment_workspace_decision"`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "core"."decisionRegisterComment"`,
    );
  }
}
