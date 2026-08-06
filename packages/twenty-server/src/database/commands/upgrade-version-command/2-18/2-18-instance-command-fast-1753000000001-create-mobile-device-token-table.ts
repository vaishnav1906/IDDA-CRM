import { QueryRunner } from 'typeorm';

import { RegisteredInstanceCommand } from 'src/engine/core-modules/upgrade/decorators/registered-instance-command.decorator';
import { FastInstanceCommand } from 'src/engine/core-modules/upgrade/interfaces/fast-instance-command.interface';

@RegisteredInstanceCommand('2.18.0', 1753000000001)
export class CreateMobileDeviceTokenTableFastInstanceCommand
  implements FastInstanceCommand
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "core"."mobileDeviceToken" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "workspaceId" uuid NOT NULL,
        "workspaceMemberId" uuid NOT NULL,
        "fcmToken" text NOT NULL,
        "platform" character varying(16) NOT NULL DEFAULT 'android',
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_mobileDeviceToken_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_mobileDeviceToken_fcmToken" UNIQUE ("fcmToken")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_mobileDeviceToken_workspaceId_workspaceMemberId"
        ON "core"."mobileDeviceToken" ("workspaceId", "workspaceMemberId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "core"."IDX_mobileDeviceToken_workspaceId_workspaceMemberId"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "core"."mobileDeviceToken"`);
  }
}
