-- Add revocation tracking for administrator access codes.
ALTER TABLE "AccessCode" ADD COLUMN "revokedAt" TIMESTAMP(3);
