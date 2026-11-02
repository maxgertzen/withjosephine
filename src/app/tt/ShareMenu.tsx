"use client";

import { Copy, EllipsisVertical, X } from "lucide-react";
import { type ReactNode, useRef, useState } from "react";
import { flushSync } from "react-dom";

import type { LinksPageShareWords } from "@/data/defaults";
import { copyText } from "@/lib/clipboard";
import { SHARE_APPS, type ShareApp, shareAppHref, shareAppName } from "@/lib/links/shareTargets";

const PHONE_POINTER = "(pointer: coarse)";

type ShareMenuProps = {
  label: string;
  shareHref: string;
  linkKey: string;
  words: LinksPageShareWords;
  appIcons: Record<ShareApp, ReactNode>;
};

function shareTracking(linkKey: string, method: string) {
  return {
    "data-mp-event": "links_share",
    "data-mp-link-key": linkKey,
    "data-mp-method": method,
    "data-clarity-event": "tt_link_share",
    "data-clarity-tag-tt-link": linkKey,
  };
}

function phoneCanShare(): boolean {
  return typeof navigator.share === "function" && window.matchMedia(PHONE_POINTER).matches;
}

export function ShareMenu({ label, shareHref, linkKey, words, appIcons }: ShareMenuProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);

  async function open() {
    const absolute = new URL(shareHref, window.location.href).toString();
    flushSync(() => {
      setUrl(absolute);
      setCopied(false);
    });
    if (phoneCanShare()) {
      try {
        await navigator.share({ title: label, url: absolute });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    dialogRef.current?.showModal();
  }

  async function copy() {
    setCopied(await copyText(url));
  }

  const titleId = `share-${linkKey}`;

  return (
    <>
      <button
        type="button"
        onClick={open}
        aria-label={`${words.shareButton} ${label}`}
        aria-haspopup="dialog"
        data-mp-event="links_share_open"
        data-mp-link-key={linkKey}
        className="absolute top-1/2 right-1.5 flex h-10 w-8 -translate-y-1/2 items-center justify-center text-j-text-on-dark opacity-80 hover:opacity-100 focus-visible:outline-2 focus-visible:outline-j-text-on-dark"
      >
        <EllipsisVertical className="h-4 w-4" aria-hidden="true" />
      </button>
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        onClick={(event) => event.target === dialogRef.current && dialogRef.current?.close()}
        className="m-auto w-[min(92vw,22rem)] rounded-xl bg-[#FFFFFF] p-0 text-left text-[#1C1935] shadow-xl backdrop:bg-black/40"
      >
        {url ? (
          <div className="flex flex-col gap-4 p-5">
            <div className="flex items-center justify-between">
              <h2 id={titleId} className="m-0 font-body text-base font-semibold">
                {words.title}
              </h2>
              <button
                type="button"
                onClick={() => dialogRef.current?.close()}
                aria-label={words.close}
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-[#F2F0EC]"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <div className="rounded-lg border border-[#E6E2DA] px-4 py-3">
              <p className="m-0 font-body text-sm font-semibold">{label}</p>
              <p className="m-0 mt-0.5 truncate font-body text-xs text-[#6B6470]">{new URL(url).host}</p>
            </div>
            <ul className="m-0 grid list-none grid-cols-3 gap-3 p-0">
              <li>
                <button
                  type="button"
                  onClick={copy}
                  className="flex w-full flex-col items-center gap-1.5 font-body text-xs"
                  {...shareTracking(linkKey, "copy")}
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#1C1935] text-[#FFFFFF]">
                    <Copy className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span aria-live="polite">{copied ? words.copied : words.copyLink}</span>
                </button>
              </li>
              {SHARE_APPS.map((app) => (
                <li key={app}>
                  <a
                    href={shareAppHref(app, url, label)}
                    target={app === "email" ? undefined : "_blank"}
                    rel="noopener noreferrer"
                    className="flex flex-col items-center gap-1.5 font-body text-xs text-[#1C1935] no-underline"
                    {...shareTracking(linkKey, app)}
                  >
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#F2F0EC]">
                      {appIcons[app]}
                    </span>
                    <span>{shareAppName(app, words.email)}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </dialog>
    </>
  );
}
