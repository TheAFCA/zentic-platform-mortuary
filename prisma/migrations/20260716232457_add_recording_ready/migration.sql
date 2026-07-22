-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "recordingReady" BOOLEAN NOT NULL DEFAULT false;

-- Backfill historical finished events. For finished streams, the playback
-- asset is already available through the provider-specific playback fields,
-- so the safest historical signal we have at migration time is the finished
-- status itself.
UPDATE "Event"
SET "recordingReady" = true
WHERE "status" = 'FINISHED';
