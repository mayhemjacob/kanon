-- Home feed — EXPLAIN (ANALYZE, BUFFERS) (matches lib/feed.ts getHomeFeed SQL shape)
--
-- Runs the real query once (not a dry run). Use dev/staging or a replica; avoid peak prod.
--
-- Option A — from project root, with psql:
--   export DATABASE_URL='postgresql://...'   # same as .env.local
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -v viewer_id=YOUR_USER_CUID -f scripts/explain-home-feed.sql
--
-- Option B — use the wrapper:
--   ./scripts/explain-home-feed.sh YOUR_USER_CUID
--
-- Find YOUR_USER_CUID: Prisma Studio → User.id, or SELECT id FROM "User" WHERE email = '...';

EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT
  r.id,
  r."itemId",
  r.rating,
  CASE
    WHEN r.body IS NULL THEN NULL
    WHEN char_length(r.body) <= 120 THEN r.body
    ELSE LEFT(r.body, 120) || '…'
  END AS body,
  r."createdAt",
  u.handle    AS user_handle,
  u.name     AS user_name,
  u.email    AS user_email,
  u.image    AS user_image,
  i.type     AS item_type,
  i.title    AS item_title,
  i."imageUrl" AS item_imageurl,
  i.year     AS item_year,
  (s."itemId" IS NOT NULL) AS saved,
  (r2."itemId" IS NOT NULL) AS reviewed,
  r2.id AS my_review_id
FROM "Review" r
INNER JOIN "Follow" f
  ON f."followingId" = r."userId"
  AND f."followerId" = :'viewer_id'
INNER JOIN "User" u ON r."userId" = u.id
INNER JOIN "Item" i ON r."itemId" = i.id
LEFT JOIN "SavedItem" s ON s."userId" = :'viewer_id' AND s."itemId" = r."itemId"
LEFT JOIN "Review" r2 ON r2."userId" = :'viewer_id' AND r2."itemId" = r."itemId"
ORDER BY r."createdAt" DESC
LIMIT 15;
