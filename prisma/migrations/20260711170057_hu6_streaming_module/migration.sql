/*
  Warnings:

  - You are about to alter the column `content` on the `Message` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(500)`.
  - Added the required column `title` to the `Event` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "ceremonyType" TEXT NOT NULL DEFAULT 'VELATORIO',
ADD COLUMN     "description" TEXT,
ADD COLUMN     "estimatedDuration" INTEGER,
ADD COLUMN     "recordingExpiry" TIMESTAMP(3),
ADD COLUMN     "title" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedBy" TEXT,
ADD COLUMN     "rejectedReason" TEXT,
ALTER COLUMN "content" SET DATA TYPE VARCHAR(500);
