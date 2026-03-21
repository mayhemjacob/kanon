"use client";

import { useCallback, useEffect, useState } from "react";

function LinkIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

function ShareIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}

type Props = {
  handleA: string;
  handleB: string;
  compatibilityScore: number;
};

function copyTextToClipboard(text: string): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
    return Promise.resolve(legacyCopy(text));
  }
  return navigator.clipboard
    .writeText(text)
    .then(() => true)
    .catch(() => Promise.resolve(legacyCopy(text)));
}

function legacyCopy(text: string): boolean {
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    ta.setAttribute("readonly", "");
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, text.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export function ClashShareActions({
  handleA,
  handleB,
  compatibilityScore,
}: Props) {
  const [copyButtonLabel, setCopyButtonLabel] = useState<"copy" | "copied">(
    "copy",
  );
  /** Solo mostrar Share cuando el SO/navegador ofrece compartir de verdad (p. ej. móvil) */
  const [showNativeShare, setShowNativeShare] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const setTimedStatus = useCallback((msg: string, ms = 2500) => {
    setStatusMessage(msg);
    window.setTimeout(() => setStatusMessage(""), ms);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || typeof navigator === "undefined") {
      return;
    }
    if (typeof navigator.share !== "function") {
      setShowNativeShare(false);
      return;
    }
    const href = window.location.href;
    const title = `Taste clash: @${handleA} & @${handleB}`;
    const text = `@${handleA} and @${handleB} — ${compatibilityScore}% cultural compatibility on Kanon`;
    const data: ShareData = { title, text, url: href };
    if (typeof navigator.canShare === "function") {
      setShowNativeShare(navigator.canShare(data));
    } else {
      // Navegadores antiguos con share pero sin canShare (p. ej. Safari iOS viejo)
      setShowNativeShare(true);
    }
  }, [handleA, handleB, compatibilityScore]);

  const copyLink = useCallback(async () => {
    const href =
      typeof window !== "undefined" ? window.location.href : "";
    if (!href) return;
    const markCopySuccess = () => {
      setCopyButtonLabel("copied");
      setTimedStatus("Link copied to clipboard", 2000);
      window.setTimeout(() => setCopyButtonLabel("copy"), 2000);
    };
    const ok = await copyTextToClipboard(href);
    if (ok) markCopySuccess();
    else setTimedStatus("Could not copy link");
  }, [setTimedStatus]);

  const shareClash = useCallback(async () => {
    const href =
      typeof window !== "undefined" ? window.location.href : "";
    if (!href || typeof navigator.share !== "function") return;
    const title = `Taste clash: @${handleA} & @${handleB}`;
    const text = `@${handleA} and @${handleB} — ${compatibilityScore}% cultural compatibility on Kanon`;
    const payload: ShareData = { title, text, url: href };
    try {
      await navigator.share(payload);
    } catch (err) {
      const name = err instanceof Error ? err.name : "";
      if (name === "AbortError") return;
      setTimedStatus("Could not open share. Use Copy Link.");
    }
  }, [handleA, handleB, compatibilityScore, setTimedStatus]);

  return (
    <div className="mt-6">
      <hr className="mb-6 border-zinc-100" />
      <div
        className="flex flex-wrap items-center justify-center gap-3"
        role="group"
        aria-label={
          showNativeShare
            ? "Copy or share this clash"
            : "Copy link to this clash"
        }
      >
        <button
          type="button"
          onClick={copyLink}
          className="inline-flex h-11 min-w-[8.5rem] items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-900 shadow-sm transition-colors hover:border-zinc-300 hover:bg-zinc-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
        >
          <LinkIcon className="shrink-0 text-zinc-600" />
          {copyButtonLabel === "copied" ? "Copied!" : "Copy Link"}
        </button>
        {showNativeShare ? (
          <button
            type="button"
            onClick={() => void shareClash()}
            className="inline-flex h-11 min-w-[8.5rem] items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
          >
            <ShareIcon className="shrink-0 text-white" />
            Share Clash
          </button>
        ) : null}
      </div>
      {statusMessage ? (
        <p
          className="mt-4 text-center text-sm text-zinc-600"
          role="status"
          aria-live="polite"
        >
          {statusMessage}
        </p>
      ) : null}
    </div>
  );
}
