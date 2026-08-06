import { QueryRunner } from 'typeorm';

import { RegisteredInstanceCommand } from 'src/engine/core-modules/upgrade/decorators/registered-instance-command.decorator';
import { FastInstanceCommand } from 'src/engine/core-modules/upgrade/interfaces/fast-instance-command.interface';

@RegisteredInstanceCommand('2.18.0', 1752000000001)
export class CreatePushSubscriptionTableFastInstanceCommand
  implements FastInstanceCommand
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "core"."pushSubscription" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "workspaceId" uuid NOT NULL,
        "workspaceMemberId" uuid NOT NULL,
        "endpoint" text NOT NULL,
        "p256dhKey" text NOT NULL,
        "authKey" text NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_pushSubscription_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_pushSubscription_endpoint" UNIQUE ("endpoint")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_pushSubscription_workspaceId_workspaceMemberId"
        ON "core"."pushSubscription" ("workspaceId", "workspaceMemberId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "core"."IDX_pushSubscription_workspaceId_workspaceMemberId"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "core"."pushSubscription"`);
  }
}
