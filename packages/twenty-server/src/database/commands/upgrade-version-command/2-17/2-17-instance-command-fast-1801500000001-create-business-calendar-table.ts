import { QueryRunner } from 'typeorm';

import { RegisteredInstanceCommand } from 'src/engine/core-modules/upgrade/decorators/registered-instance-command.decorator';
import { FastInstanceCommand } from 'src/engine/core-modules/upgrade/interfaces/fast-instance-command.interface';

@RegisteredInstanceCommand('2.17.0', 1801500000001)
export class CreateBusinessCalendarTableFastInstanceCommand
  implements FastInstanceCommand
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "core"."businessCalendar" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "workspaceId" uuid NOT NULL,
        "timezone" character varying NOT NULL DEFAULT 'UTC',
        "weekSchedule" jsonb NOT NULL DEFAULT '{}',
        "holidays" jsonb NOT NULL DEFAULT '[]',
        "slaSlaTargetMinutes" integer NOT NULL DEFAULT 480,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_businessCalendar" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_BUSINESS_CALENDAR_WORKSPACE"
        ON "core"."businessCalendar" ("workspaceId")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_BUSINESS_CALENDAR_WORKSPACE_ID"
        ON "core"."businessCalendar" ("workspaceId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "core"."IDX_BUSINESS_CALENDAR_WORKSPACE_ID"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "core"."UQ_BUSINESS_CALENDAR_WORKSPACE"`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "core"."businessCalendar"`,
    );
  }
}
