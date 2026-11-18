ALTER TABLE "Performance" ADD COLUMN "endsAt" TIMESTAMP(3);

UPDATE "Performance"
SET "endsAt" = "Performance"."startsAt" + make_interval(mins => "Show"."duration")
FROM "Show"
WHERE "Show"."id" = "Performance"."showId";

ALTER TABLE "Performance" ALTER COLUMN "endsAt" SET NOT NULL;
CREATE INDEX "Performance_endsAt_idx" ON "Performance"("endsAt");
