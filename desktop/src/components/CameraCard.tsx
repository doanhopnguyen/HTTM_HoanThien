import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { Video, Maximize2 } from "lucide-react";
import type { Camera } from "@pool-safety/shared";
import { StatusBadge, Button } from "./ui";
import { useUiStore } from "../stores/uiStore";
export function VideoStream({ url }: { url: string | null }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    setError(false);
    const video = ref.current;
    if (!video || !url) return;
    let hls: Hls | null = null;
    if (
      /\.m3u8(?:\?|$)/i.test(url) &&
      !video.canPlayType("application/vnd.apple.mpegurl") &&
      Hls.isSupported()
    ) {
      hls = new Hls();
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) setError(true);
      });
    } else video.src = url;
    return () => {
      hls?.destroy();
      video.removeAttribute("src");
      video.load();
    };
  }, [url]);
  if (!url)
    return (
      <div className="stream-empty">
        <Video size={32} />
        <span>No playable stream configured</span>
        <small>
          Use an HTTP(S) HLS or MP4 source. RTSP requires a streaming gateway.
        </small>
      </div>
    );
  return (
    <div className="stream">
      {error && (
        <div className="stream-error">
          Stream unavailable — check the camera source.
        </div>
      )}
      <video
        ref={ref}
        controls
        muted
        autoPlay
        playsInline
        onError={() => setError(true)}
      />
    </div>
  );
}
export function CameraCard({ camera }: { camera: Camera }) {
  const container = useRef<HTMLDivElement>(null);
  return (
    <article className="camera-card" ref={container}>
      <div className="camera-title">
        <div>
          <strong>{camera.name}</strong>
          <small>{camera.locationDescription || camera.code}</small>
        </div>
        <StatusBadge status={camera.status} />
      </div>
      {camera.status === "ONLINE" ? (
        <VideoStream url={camera.streamUrl} />
      ) : (
        <div className="stream-empty">
          <Video size={32} />
          Camera {camera.status.toLowerCase()}
        </div>
      )}
      <footer>
        <span className={camera.monitoringEnabled ? "positive" : "muted"}>
          {camera.monitoringEnabled
            ? "● Monitoring enabled"
            : "Monitoring paused"}
        </span>
        <Button
          variant="ghost"
          aria-label="Fullscreen camera"
          onClick={() => {
            void container.current
              ?.requestFullscreen()
              .catch(() => useUiFallback());
          }}
        >
          <Maximize2 size={16} />
        </Button>
      </footer>
    </article>
  );
}
function useUiFallback() {
  useUiStore.getState().notify("Fullscreen is unavailable on this device");
}
