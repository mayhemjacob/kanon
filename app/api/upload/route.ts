import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { SupabaseClient } from "@supabase/supabase-js";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { createSupabaseAdmin } from "@/lib/supabase/server";

const BUCKET = "item-covers";
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

function mimeToExt(mime: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
  };
  return map[mime] ?? "bin";
}

/** Creates the public bucket if it does not exist (idempotent). */
async function ensureItemCoversBucket(
  supabase: SupabaseClient
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error } = await supabase.storage.createBucket(BUCKET, {
    public: true,
  });

  if (!error) return { ok: true };

  const msg = (error.message ?? "").toLowerCase();
  const alreadyThere =
    msg.includes("already exists") ||
    msg.includes("resourcealreadyexists") ||
    msg.includes("duplicate");

  if (alreadyThere) return { ok: true };

  return { ok: false, message: error.message };
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file");
  const itemIdRaw = formData.get("itemId");

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  if (typeof itemIdRaw !== "string" || !itemIdRaw.trim()) {
    return NextResponse.json({ error: "Missing itemId" }, { status: 400 });
  }

  const itemId = itemIdRaw.trim();

  if (!ALLOWED_TYPES.includes(file.type as (typeof ALLOWED_TYPES)[number])) {
    return NextResponse.json(
      { error: "Invalid file type. Use JPEG, PNG, WebP, or GIF." },
      { status: 400 }
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "File too large (max 5 MB)." },
      { status: 400 }
    );
  }

  let supabase;
  try {
    supabase = createSupabaseAdmin();
  } catch (e) {
    console.error("Supabase admin client:", e);
    return NextResponse.json(
      { error: "Upload is not configured on the server." },
      { status: 503 }
    );
  }

  const bucketReady = await ensureItemCoversBucket(supabase);
  if (!bucketReady.ok) {
    console.error("Supabase create bucket:", bucketReady.message);
    return NextResponse.json(
      { error: bucketReady.message || "Could not prepare storage bucket." },
      { status: 500 }
    );
  }

  const ext = mimeToExt(file.type);
  const path = `${itemId}/${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    console.error("Supabase storage upload:", error);
    return NextResponse.json(
      { error: error.message || "Upload failed" },
      { status: 500 }
    );
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(data.path);

  return NextResponse.json({ url: publicUrl });
}
