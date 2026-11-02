"use client";

import { Play } from "lucide-react";
import { type RefObject, useEffect, useRef, useState } from "react";

import { useThirdPartyContentAllowed } from "@/lib/consent";
import { tiktokPlayerUrl } from "@/lib/links/tiktokVideo";

type TikTokVideoCardProps = { videoId: string; title: string; playLabel: string; inStudioPreview: boolean };

function useComesIntoView(target: RefObject<HTMLElement | null>): boolean {
  const [inView, setInView] = useState(() => typeof IntersectionObserver === "undefined");
  useEffect(() => {
    const element = target.current;
    if (!element || inView) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) setInView(true);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [target, inView]);
  return inView;
}

export function TikTokVideoCard({ videoId, title, playLabel, inStudioPreview }: TikTokVideoCardProps) {
  const card = useRef<HTMLDivElement>(null);
  const consent = useThirdPartyContentAllowed();
  const allowed = inStudioPreview || consent;
  const inView = useComesIntoView(card);
  const [tapped, setTapped] = useState(false);
  const showPlayer = tapped || (allowed === true && inView);

  return (
    <div ref={card} className="relative aspect-[9/16] w-full overflow-hidden rounded-md bg-[#000000]">
      {showPlayer ? (
        <iframe
          src={tiktokPlayerUrl(videoId, { autoplay: tapped })}
          title={title}
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 h-full w-full border-0"
        />
      ) : allowed === false ? (
        <button
          type="button"
          onClick={() => setTapped(true)}
          aria-label={`${playLabel}: ${title}`}
          data-mp-event="links_video_play"
          data-mp-video-id={videoId}
          data-clarity-event="tt_video_play"
          className="absolute inset-0 flex items-center justify-center"
        >
          <span className="relative flex h-12 w-12 items-center justify-center rounded-full bg-black/55 text-[#FFFFFF]">
            <Play className="ml-0.5 h-6 w-6" fill="currentColor" aria-hidden="true" />
          </span>
        </button>
      ) : null}
    </div>
  );
}
