import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWorkspaceJoinRequest1751900000001
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "core"."workspaceJoinRequest_status_enum" AS ENUM('PENDING', 'APPROVED', 'REJECTED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "core"."workspaceJoinRequest" (
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
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_workspaceJoinRequest_workspaceId_status" ON "core"."workspaceJoinRequest" ("workspaceId", "status")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "core"."IDX_workspaceJoinRequest_workspaceId_status"`,
    );
    await queryRunner.query(`DROP TABLE "core"."workspaceJoinRequest"`);
    await queryRunner.query(
      `DROP TYPE "core"."workspaceJoinRequest_status_enum"`,
    );
  }
}
