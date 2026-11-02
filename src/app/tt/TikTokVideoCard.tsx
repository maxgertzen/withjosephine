"use client";

import { Play } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

import { tiktokPlayerUrl } from "@/lib/links/tiktokVideo";

type TikTokVideoCardProps = {
  videoId: string;
  coverUrl?: string;
  title?: string;
  playLabel: string;
};

export function TikTokVideoCard({ videoId, coverUrl, title, playLabel }: TikTokVideoCardProps) {
  const [playing, setPlaying] = useState(false);
  const name = title ? `${playLabel}: ${title}` : playLabel;

  return (
    <div className="relative aspect-[9/16] w-40 shrink-0 snap-start overflow-hidden rounded-md bg-[#000000]">
      {playing ? (
        <iframe
          src={tiktokPlayerUrl(videoId)}
          title={name}
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 h-full w-full border-0"
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          aria-label={name}
          data-mp-event="links_video_play"
          data-mp-video-id={videoId}
          data-clarity-event="tt_video_play"
          className="absolute inset-0 flex items-center justify-center"
        >
          {coverUrl ? <Image src={coverUrl} alt="" fill sizes="160px" unoptimized className="object-cover" /> : null}
          <span className="relative flex h-12 w-12 items-center justify-center rounded-full bg-black/55 text-[#FFFFFF]">
            <Play className="ml-0.5 h-6 w-6" fill="currentColor" aria-hidden="true" />
          </span>
        </button>
      )}
    </div>
  );
}
