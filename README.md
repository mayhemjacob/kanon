This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Database (PostgreSQL)

For fast Home feed loads (<2s), use a **connection pooler** in production:

- **Neon**: Use the pooled connection string (host ends with `-pooler`). Add `?pgbouncer=true` if needed.
- **Supabase**: Use port `6543` (transaction pooler) instead of `5432`.
- **Railway / other**: Consider PgBouncer or Prisma Accelerate.

Add `?connection_limit=1` to your `DATABASE_URL` when using an external pooler to avoid exhausting connections in serverless. Without a pooler, each serverless request can open a new DB connection, adding 2–5+ seconds on cold starts.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Share Preview Regression Checklist

Use this quick checklist when updating public share pages (`/r/*`, `/l/*`, `/match/*`):

1. **Metadata exists in page source**
   - Verify `og:title`, `og:description`, `og:image`, and `twitter:image` are present.
2. **`og:image` is absolute**
   - It must use `https://<host>/...`, not a relative URL.
3. **OG image route returns `200`**
   - Example: `/l/<id>/opengraph-image` should return `image/png`.
4. **Fallback is safe**
   - If data/images fail, route still returns a valid image (no 500).
5. **Crawler-style fetch passes**
   - `curl -A "facebookexternalhit/1.1" "<public-url>"` includes OG tags.
6. **Real external test**
   - Share a production (or tunnel) URL in WhatsApp; if cached, retry with a query param.
