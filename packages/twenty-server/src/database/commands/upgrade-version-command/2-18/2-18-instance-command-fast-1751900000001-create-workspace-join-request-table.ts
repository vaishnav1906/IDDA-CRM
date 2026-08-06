import { QueryRunner } from 'typeorm';

import { RegisteredInstanceCommand } from 'src/engine/core-modules/upgrade/decorators/registered-instance-command.decorator';
import { FastInstanceCommand } from 'src/engine/core-modules/upgrade/interfaces/fast-instance-command.interface';

@RegisteredInstanceCommand('2.18.0', 1751900000001)
export class CreateWorkspaceJoinRequestTableFastInstanceCommand
  implements FastInstanceCommand
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'workspaceJoinRequest_status_enum' AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'core')) THEN
          CREATE TYPE "core"."workspaceJoinRequest_status_enum" AS ENUM('PENDING', 'APPROVED', 'REJECTED');
        END IF;
      END $$
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "core"."workspaceJoinRequest" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "workspaceId" uuid NOT NULL,
        "email" character varying NOT NULL,
        "firstName" character varying NOT NULL,
        "lastName" character varying,
        "message" text,
        "status" "core"."workspaceJoinRequest_status_enum" NOT NULL DEFAULT 'PENDING',
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_workspaceJoinRequest_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_workspaceJoinRequest_workspaceId" FOREIGN KEY ("workspaceId")
          REFERENCES "core"."workspace"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_workspaceJoinRequest_workspaceId_status"
        ON "core"."workspaceJoinRequest" ("workspaceId", "status")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "core"."IDX_workspaceJoinRequest_workspaceId_status"`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "core"."workspaceJoinRequest"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "core"."workspaceJoinRequest_status_enum"`,
    );
  }
}
