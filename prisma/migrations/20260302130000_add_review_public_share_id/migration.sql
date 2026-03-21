-- AlterTable
ALTER TABLE "Review" ADD COLUMN "publicShareId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Review_publicShareId_key" ON "Review"("publicShareId");
