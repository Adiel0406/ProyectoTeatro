-- AddEnumValue
ALTER TYPE "UserRole" ADD VALUE 'SUPERADMIN';

-- Revoke outstanding administrator invitations created before role delegation was restricted.
UPDATE "AccessCode"
SET "revokedAt" = CURRENT_TIMESTAMP
WHERE "usedAt" IS NULL AND "revokedAt" IS NULL;
