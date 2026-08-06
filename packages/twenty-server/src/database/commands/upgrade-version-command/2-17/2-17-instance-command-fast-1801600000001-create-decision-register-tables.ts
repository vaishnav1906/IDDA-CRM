import { QueryRunner } from 'typeorm';

import { RegisteredInstanceCommand } from 'src/engine/core-modules/upgrade/decorators/registered-instance-command.decorator';
import { FastInstanceCommand } from 'src/engine/core-modules/upgrade/interfaces/fast-instance-command.interface';

@RegisteredInstanceCommand('2.17.0', 1801600000001)
export class CreateDecisionRegisterTablesFastInstanceCommand
  implements FastInstanceCommand
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "core"."decisionRegister" (
        "id"               uuid        NOT NULL DEFAULT gen_random_uuid(),
        "workspaceId"      uuid        NOT NULL,
        "title"            varchar(200) NOT NULL,
        "context"          text        NOT NULL,
        "decisionSummary"  text        NOT NULL,
        "outcome"          text,
        "category"         varchar(50),
        "tags"             text,
        "createdById"      uuid        NOT NULL,
        "updatedById"      uuid        NOT NULL,
        "entityType"       varchar,
        "entityId"         uuid,
        "createdAt"        timestamptz NOT NULL DEFAULT now(),
        "updatedAt"        timestamptz NOT NULL DEFAULT now(),
        "deletedAt"        timestamptz,
        CONSTRAINT "PK_decisionRegister_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_decisionRegister_workspaceId"
          FOREIGN KEY ("workspaceId")
          REFERENCES "core"."workspace"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_decisionRegister_workspaceId_deletedAt"
        ON "core"."decisionRegister" ("workspaceId", "deletedAt")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_decisionRegister_workspaceId_category"
        ON "core"."decisionRegister" ("workspaceId", "category")
        WHERE "deletedAt" IS NULL
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "core"."decisionRegisterOption" (
        "id"          uuid NOT NULL DEFAULT gen_random_uuid(),
        "decisionId"  uuid NOT NULL,
        "optionText"  text NOT NULL,
        CONSTRAINT "PK_decisionRegisterOption_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_decisionRegisterOption_decisionId"
          FOREIGN KEY ("decisionId")
          REFERENCES "core"."decisionRegister"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_decisionRegisterOption_decisionId"
        ON "core"."decisionRegisterOption" ("decisionId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "core"."IDX_decisionRegisterOption_decisionId"`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "core"."decisionRegisterOption"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "core"."IDX_decisionRegister_workspaceId_category"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "core"."IDX_decisionRegister_workspaceId_deletedAt"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "core"."decisionRegister"`);
  }
}
