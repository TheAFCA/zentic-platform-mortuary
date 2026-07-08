-- AlterTable
ALTER TABLE "PasswordReset" ADD COLUMN     "usedAt" TIMESTAMP(3);

-- Backfill previously used resets before dropping the legacy flag
UPDATE "PasswordReset" SET "usedAt" = CURRENT_TIMESTAMP WHERE "used" = true;

-- AlterTable
ALTER TABLE "PasswordReset" DROP COLUMN "used";
