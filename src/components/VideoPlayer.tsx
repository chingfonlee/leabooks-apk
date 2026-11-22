import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from "lucide-react";
import type { LocalVideoItem } from "../types";

interface VideoPlayerProps {
  videos: LocalVideoItem[];
  initialIndex: number;
  onExit: () => void;
}

function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "00:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function VideoPlayer({
  videos,
  initialIndex,
  onExit,
}: VideoPlayerProps) {
  const [index, setIndex] = useState(initialIndex);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [controlsVisible, setControlsVisible] = useState(true);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hideTimerRef = useRef<number | null>(null);

  const currentVideo = videos[index] ?? videos[0];

  const showControlsBriefly = useCallback(() => {
    setControlsVisible(true);
    if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    hideTimerRef.current = window.setTimeout(() => {
      setControlsVisible(false);
    }, 4500);
  }, []);

  useEffect(() => {
    showControlsBriefly();
    return () => {
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    };
  }, [index, showControlsBriefly]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.currentTime = 0;
    el.play()
      .then(() => setPlaying(true))
      .catch(() => setPlaying(false));
  }, [currentVideo?.playUrl]);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) {
      el.play().then(() => setPlaying(true)).catch(() => {});
    } else {
      el.pause();
      setPlaying(false);
    }
    showControlsBriefly();
  };

  const goNext = useCallback(() => {
    setIndex((i) => (i + 1) % videos.length);
  }, [videos.length]);

  const goPrev = useCallback(() => {
    setIndex((i) => (i - 1 + videos.length) % videos.length);
  }, [videos.length]);

  if (!currentVideo) return null;

  return (
    <div className="video-player-root" onClick={showControlsBriefly}>
      <video
        ref={videoRef}
        className="video-element"
        src={currentVideo.playUrl}
        muted={muted}
        playsInline
        autoPlay
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onEnded={goNext}
      />

      {/* Top bar */}
      <div
        className={`reader-top-bar ${controlsVisible ? "" : "hidden"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="reader-top-left">
          <button className="reader-pill-btn" onClick={onExit}>
            <ArrowLeft size={22} />
            返回影片牆
          </button>
          <div className="reader-title-block">
            <span className="reader-book-title">{currentVideo.displayTitle}</span>
            <span className="reader-page-counter">
              {index + 1} / {videos.length}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom controls */}
      <div
        className={`video-bottom-bar ${controlsVisible ? "" : "hidden"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="video-seek-row">
          <input
            className="video-seek-slider"
            type="range"
            min={0}
            max={duration || 100}
            step={0.5}
            value={currentTime}
            onChange={(e) => {
              const t = Number(e.target.value);
              setCurrentTime(t);
              if (videoRef.current) videoRef.current.currentTime = t;
              showControlsBriefly();
            }}
          />
          <span className="video-time-label">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>

        <div className="video-controls-row">
          <div style={{ display: "flex", gap: 12 }}>
            {videos.length > 1 && (
              <button
                className="reader-pill-btn"
                onClick={() => {
                  goPrev();
                  showControlsBriefly();
                }}
              >
                <SkipBack size={20} />
                上一支
              </button>
            )}
            <button className="reader-pill-btn active" onClick={togglePlay}>
              {playing ? <Pause size={20} /> : <Play size={20} />}
              {playing ? "暫停" : "播放"}
            </button>
            {videos.length > 1 && (
              <button
                className="reader-pill-btn"
                onClick={() => {
                  goNext();
                  showControlsBriefly();
                }}
              >
                <SkipForward size={20} />
                下一支
              </button>
            )}
          </div>

          <button
            className="reader-pill-btn"
            onClick={() => {
              setMuted((m) => !m);
              showControlsBriefly();
            }}
          >
            {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            {muted ? "靜音" : "聲音"}
          </button>
        </div>
      </div>
    </div>
  );
}
