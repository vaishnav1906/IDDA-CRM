import { QueryRunner } from 'typeorm';

import { RegisteredInstanceCommand } from 'src/engine/core-modules/upgrade/decorators/registered-instance-command.decorator';
import { FastInstanceCommand } from 'src/engine/core-modules/upgrade/interfaces/fast-instance-command.interface';

@RegisteredInstanceCommand('2.17.0', 1801700000001)
export class AddDecisionRegisterApprovalFastInstanceCommand
  implements FastInstanceCommand
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_type
          WHERE typname = 'decisionRegister_status_enum'
          AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'core')
        ) THEN
          CREATE TYPE "core"."decisionRegister_status_enum"
            AS ENUM('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED');
        END IF;
      END $$
    `);

    await queryRunner.query(`
      ALTER TABLE "core"."decisionRegister"
        ADD COLUMN IF NOT EXISTS "status" "core"."decisionRegister_status_enum"
          NOT NULL DEFAULT 'DRAFT'
    `);

    await queryRunner.query(`
      ALTER TABLE "core"."decisionRegister"
        ADD COLUMN IF NOT EXISTS "approvedById" uuid
    `);

    await queryRunner.query(`
      ALTER TABLE "core"."decisionRegister"
        ADD COLUMN IF NOT EXISTS "approvedAt" timestamptz
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_decisionRegister_workspaceId_status_active"
        ON "core"."decisionRegister" ("workspaceId", "status")
        WHERE "deletedAt" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "core"."IDX_decisionRegister_workspaceId_status_active"`,
    );
    await queryRunner.query(
      `ALTER TABLE "core"."decisionRegister" DROP COLUMN IF EXISTS "approvedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "core"."decisionRegister" DROP COLUMN IF EXISTS "approvedById"`,
    );
    await queryRunner.query(
      `ALTER TABLE "core"."decisionRegister" DROP COLUMN IF EXISTS "status"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "core"."decisionRegister_status_enum"`,
    );
  }
}
