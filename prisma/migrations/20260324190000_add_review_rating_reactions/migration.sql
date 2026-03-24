-- CreateEnum
CREATE TYPE "ReviewRatingReactionType" AS ENUM ('TOO_LOW', 'ABOUT_RIGHT', 'TOO_HIGH');

-- CreateTable
CREATE TABLE "ReviewRatingReaction" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reactionType" "ReviewRatingReactionType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReviewRatingReaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReviewRatingReaction_reviewId_userId_key" ON "ReviewRatingReaction"("reviewId", "userId");

-- CreateIndex
CREATE INDEX "ReviewRatingReaction_reviewId_idx" ON "ReviewRatingReaction"("reviewId");

-- AddForeignKey
ALTER TABLE "ReviewRatingReaction" ADD CONSTRAINT "ReviewRatingReaction_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewRatingReaction" ADD CONSTRAINT "ReviewRatingReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
