-- Speed up Discover aggregates: Review.groupBy(itemId)
CREATE INDEX "Review_itemId_idx" ON "Review"("itemId");

