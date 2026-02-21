"use client";

import { ExternalLink, Maximize2, Minimize2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

export function ArcadeFrame({
  gameTitle,
  iframeSrc,
}: {
  gameTitle: string;
  iframeSrc: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    function onFullscreenChange() {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }

    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, []);

  async function toggleFullscreen() {
    if (!containerRef.current) {
      return;
    }

    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }

    await containerRef.current.requestFullscreen();
  }

  return (
    <div className="space-y-3">
      <div
        ref={containerRef}
        className="overflow-hidden rounded-lg border bg-card/90 shadow-sm"
      >
        <iframe
          title={`CipherForge Arcade: ${gameTitle}`}
          src={iframeSrc}
          className={`block w-full ${isFullscreen ? "h-screen" : "h-[clamp(560px,82vh,960px)]"}`}
          allowFullScreen
          sandbox="allow-scripts allow-same-origin allow-popups"
        />
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={() => void toggleFullscreen()}>
          {isFullscreen ? (
            <>
              <Minimize2 className="h-4 w-4" />
              Exit fullscreen
            </>
          ) : (
            <>
              <Maximize2 className="h-4 w-4" />
              Fullscreen
            </>
          )}
        </Button>
        <Button asChild variant="secondary" size="sm">
          <a href={iframeSrc} target="_blank" rel="noreferrer">
            <ExternalLink className="h-4 w-4" />
            Open game in new tab
          </a>
        </Button>
      </div>
    </div>
  );
}
