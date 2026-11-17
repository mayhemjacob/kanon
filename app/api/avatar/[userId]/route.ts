import { Prisma } from "@prisma/client"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/** Vercel rejects serverless responses above ~4.5 MB; fail explicitly instead. */
const MAX_AVATAR_BYTES = 4_400_000

const DATA_URI_HEADER = /^data:(image\/(?:png|jpe?g|webp|gif));base64,/i

function isConnectionPoolTimeoutError(err: unknown): boolean {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2024") {
    return true
  }
  const msg = err instanceof Error ? err.message : String(err)
  return (
    /Unable to check out connection from the pool due to timeout/i.test(msg) ||
    /Timed out fetching a new connection from the connection pool/i.test(msg) ||
    /MaxClientsInSessionMode: max clients reached/i.test(msg)
  )
}

/**
 * Serves a user's avatar as a normal image response.
 * - `data:` URIs stored in `User.image` are decoded to bytes (png/jpeg/webp/gif only; no SVG).
 * - `http(s)` URLs (e.g. Google profile photos) are redirected.
 * Public on purpose: avatars already appear on public share pages. Callers pass `?v=`
 * (see `lib/avatar.ts`), so a versioned URL can be cached immutably.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params

  let image: string | null | undefined
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { image: true },
    })
    image = user?.image
  } catch (err) {
    if (isConnectionPoolTimeoutError(err)) {
      return new NextResponse(null, {
        status: 503,
        headers: { "Retry-After": "1", "Cache-Control": "no-store" },
      })
    }
    throw err
  }

  if (!image) {
    return new NextResponse(null, {
      status: 404,
      headers: { "Cache-Control": "public, max-age=60" },
    })
  }

  const versioned = new URL(req.url).searchParams.has("v")
  const cacheControl = versioned
    ? "public, max-age=31536000, immutable"
    : "public, max-age=300"

  if (/^https?:\/\//i.test(image)) {
    return NextResponse.redirect(image, {
      status: 302,
      headers: { "Cache-Control": cacheControl },
    })
  }

  const header = DATA_URI_HEADER.exec(image.slice(0, 64))
  if (!header) {
    return new NextResponse(null, { status: 404 })
  }

  const bytes = Buffer.from(image.slice(header[0].length), "base64")
  if (bytes.length > MAX_AVATAR_BYTES) {
    return new NextResponse(null, { status: 413 })
  }

  return new NextResponse(new Uint8Array(bytes), {
    status: 200,
    headers: {
      "Content-Type": header[1].toLowerCase().replace("image/jpg", "image/jpeg"),
      "Content-Length": String(bytes.length),
      "Cache-Control": cacheControl,
      "X-Content-Type-Options": "nosniff",
    },
  })
}
