-- CreateEnum
CREATE TYPE "UserAccessType" AS ENUM ('LOGIN', 'REGISTER');

-- AlterTable
ALTER TABLE "User"
ADD COLUMN "displayName" TEXT,
ADD COLUMN "bio" TEXT,
ADD COLUMN "favoriteQuote" TEXT;

-- AlterTable
ALTER TABLE "Reservation"
ADD COLUMN "userId" TEXT;

-- CreateTable
CREATE TABLE "UserAccessEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "UserAccessType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserAccessEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Reservation_userId_createdAt_idx" ON "Reservation"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "UserAccessEvent_userId_createdAt_idx" ON "UserAccessEvent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "UserAccessEvent_type_createdAt_idx" ON "UserAccessEvent"("type", "createdAt");

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAccessEvent" ADD CONSTRAINT "UserAccessEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
