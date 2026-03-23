-- All lists are public for now: new default + backfill existing rows.
ALTER TABLE "List" ALTER COLUMN "visibility" SET DEFAULT 'PUBLIC';

UPDATE "List" SET "visibility" = 'PUBLIC';
