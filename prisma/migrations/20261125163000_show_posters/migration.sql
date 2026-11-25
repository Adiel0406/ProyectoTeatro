-- CreateTable
CREATE TABLE "ShowPoster" (
    "id" TEXT NOT NULL,
    "showId" TEXT NOT NULL,
    "imageData" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShowPoster_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShowPoster_showId_key" ON "ShowPoster"("showId");

-- AddForeignKey
ALTER TABLE "ShowPoster" ADD CONSTRAINT "ShowPoster_showId_fkey" FOREIGN KEY ("showId") REFERENCES "Show"("id") ON DELETE CASCADE ON UPDATE CASCADE;
