"use client";

import { Pause, Play } from "lucide-react";
import { useRef, useState } from "react";

type ListenButtonProps = { src: string; label: string; length?: string };

export function ListenButton({ src, label, length }: ListenButtonProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) audio.play().catch(() => setPlaying(false));
    else audio.pause();
  }

  const Icon = playing ? Pause : Play;

  return (
    <div className="mt-4 flex items-center gap-3">
      <button
        type="button"
        onClick={toggle}
        aria-pressed={playing}
        className="inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-[var(--j-btn-radius)] bg-j-deep px-4 font-body text-sm font-medium text-j-cream transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-j-deep"
      >
        <Icon aria-hidden="true" className="size-3.5" fill="currentColor" strokeWidth={0} />
        {label}
      </button>
      {length ? <span className="font-body text-sm text-j-text-muted">{length}</span> : null}
      <audio
        ref={audioRef}
        src={src}
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
      />
    </div>
  );
}
