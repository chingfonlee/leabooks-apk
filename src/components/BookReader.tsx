import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  SkipForward,
  Volume2,
  VolumeX,
} from "lucide-react";
import type { AppSettings, TvBook } from "../types";
import {
  buildSubtitleSegments,
  getSegmentIndexAtTime,
} from "../utils/subtitles";

interface BookReaderProps {
  playlist: TvBook[];
  initialBookIndex?: number;
  initialAutoplay: boolean;
  settings: AppSettings;
  onToggleMute: () => void;
  onExit: () => void;
}

export function BookReader({
  playlist,
  initialBookIndex = 0,
  initialAutoplay,
  settings,
  onToggleMute,
  onExit,
}: BookReaderProps) {
  const [bookIdx, setBookIdx] = useState(initialBookIndex);
  const [pageIdx, setPageIdx] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(initialAutoplay);
  const [autoResumeArmed, setAutoResumeArmed] = useState(initialAutoplay);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [manualSegIdx, setManualSegIdx] = useState(0);
  const [controlsVisible, setControlsVisible] = useState(false);
  const [idleRemainingSec, setIdleRemainingSec] = useState<number | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const controlsTimerRef = useRef<number | null>(null);

  const currentBook = playlist[bookIdx] ?? playlist[0];
  const currentPage = currentBook.pages[pageIdx] ?? currentBook.pages[0];
  const pageDurationMs = settings.pageDurationSec * 1000;

  // Build cinema subtitle segments for the current page
  const segments = useMemo(() => {
    const text =
      currentPage.text ||
      (currentPage.page === 1 ? `《${currentBook.title}》` : "");
    return buildSubtitleSegments(text, pageDurationMs);
  }, [currentPage.text, currentPage.page, currentBook.title, pageDurationMs]);

  const activeSegIdx = isAutoPlaying
    ? getSegmentIndexAtTime(segments, elapsedMs)
    : Math.min(manualSegIdx, Math.max(segments.length - 1, 0));

  const currentSubtitle = segments[activeSegIdx]?.text ?? "";

  // Preload next page image for instant transitions
  useEffect(() => {
    const nextPage = currentBook.pages[pageIdx + 1];
    if (nextPage) {
      const img = new Image();
      img.src = nextPage.image;
    }
  }, [currentBook, pageIdx]);

  // Background music playback
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = settings.musicMuted ? 0 : settings.musicVolume;
    audio.muted = settings.musicMuted;
    if (!settings.musicMuted) {
      audio.play().catch(() => {
        // Ignore autoplay restriction until first user gesture
      });
    }
  }, [currentBook.musicSrc, settings.musicMuted, settings.musicVolume]);

  useEffect(() => {
    const audio = audioRef.current;
    return () => {
      if (audio) {
        audio.pause();
      }
    };
  }, []);

  const showControlsTemporarily = useCallback(() => {
    setControlsVisible(true);
    if (controlsTimerRef.current) {
      window.clearTimeout(controlsTimerRef.current);
    }
    controlsTimerRef.current = window.setTimeout(() => {
      setControlsVisible(false);
    }, 4500);
  }, []);

  useEffect(() => {
    return () => {
      if (controlsTimerRef.current) {
        window.clearTimeout(controlsTimerRef.current);
      }
    };
  }, []);

  // Register any touch/user activity: pauses autoplay if currently running and resets idle timer
  const noteUserInteraction = useCallback(
    (pauseIfAuto: boolean) => {
      lastActivityRef.current = Date.now();
      if (audioRef.current && !settings.musicMuted && audioRef.current.paused) {
        audioRef.current.play().catch(() => {});
      }
      if (pauseIfAuto && isAutoPlaying) {
        setIsAutoPlaying(false);
        setAutoResumeArmed(true);
      }
      if (settings.idleResumeSec > 0) {
        setIdleRemainingSec(settings.idleResumeSec);
      }
    },
    [isAutoPlaying, settings.idleResumeSec, settings.musicMuted],
  );

  const goToNextPage = useCallback(
    (fromAutoplay: boolean) => {
      if (!fromAutoplay) {
        noteUserInteraction(true);
      }
      setElapsedMs(0);
      setManualSegIdx(0);

      if (pageIdx < currentBook.pages.length - 1) {
        setPageIdx((p) => p + 1);
      } else {
        // End of current book
        if (playlist.length > 1) {
          setBookIdx((b) => (b + 1) % playlist.length);
          setPageIdx(0);
        } else {
          // Loop single book back to page 1
          setPageIdx(0);
        }
      }
    },
    [currentBook.pages.length, noteUserInteraction, pageIdx, playlist.length],
  );

  const goToPrevPage = useCallback(() => {
    noteUserInteraction(true);
    setElapsedMs(0);
    setManualSegIdx(0);

    if (pageIdx > 0) {
      setPageIdx((p) => p - 1);
    } else if (playlist.length > 1) {
      const prevBookIdx = (bookIdx - 1 + playlist.length) % playlist.length;
      setBookIdx(prevBookIdx);
      setPageIdx(playlist[prevBookIdx].pages.length - 1);
    }
  }, [bookIdx, noteUserInteraction, pageIdx, playlist]);

  const goToNextBook = useCallback(() => {
    noteUserInteraction(false);
    setElapsedMs(0);
    setManualSegIdx(0);
    setBookIdx((b) => (b + 1) % playlist.length);
    setPageIdx(0);
  }, [noteUserInteraction, playlist.length]);

  // 15-second autoplay tick (updates smoothly every 100ms)
  useEffect(() => {
    if (!isAutoPlaying) return;
    let lastTick = performance.now();

    const timer = window.setInterval(() => {
      const now = performance.now();
      const delta = now - lastTick;
      lastTick = now;

      setElapsedMs((prev) => {
        const next = prev + delta;
        if (next >= pageDurationMs) {
          goToNextPage(true);
          return 0;
        }
        return next;
      });
    }, 100);

    return () => window.clearInterval(timer);
  }, [isAutoPlaying, pageDurationMs, goToNextPage]);

  // Idle auto-resume timer (default 60s)
  useEffect(() => {
    if (isAutoPlaying || !autoResumeArmed || settings.idleResumeSec <= 0) {
      setIdleRemainingSec(null);
      return;
    }

    const timer = window.setInterval(() => {
      const idleSec = Math.floor((Date.now() - lastActivityRef.current) / 1000);
      const remain = settings.idleResumeSec - idleSec;
      if (remain <= 0) {
        setIdleRemainingSec(null);
        setElapsedMs(0);
        setIsAutoPlaying(true);
      } else {
        setIdleRemainingSec(remain);
      }
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isAutoPlaying, autoResumeArmed, settings.idleResumeSec]);

  // Keyboard support (helpful on PC preview or remote control)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        goToNextPage(false);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goToPrevPage();
      } else if (e.key === "Escape") {
        onExit();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goToNextPage, goToPrevPage, onExit]);

  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    if (t) {
      touchStartRef.current = { x: t.clientX, y: t.clientY };
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const start = touchStartRef.current;
    const end = e.changedTouches[0];
    touchStartRef.current = null;
    if (!start || !end) return;

    const dx = end.clientX - start.x;
    const dy = end.clientY - start.y;
    if (Math.abs(dx) > 65 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      if (dx < 0) {
        goToNextPage(false);
      } else {
        goToPrevPage();
      }
    }
  };

  const handleSubtitleTap = (e: React.MouseEvent) => {
    e.stopPropagation();
    noteUserInteraction(true);
    if (segments.length > 1) {
      setManualSegIdx((prev) => (prev + 1) % segments.length);
    }
  };

  const handleToggleAutoplay = (e: React.MouseEvent) => {
    e.stopPropagation();
    lastActivityRef.current = Date.now();
    if (isAutoPlaying) {
      setIsAutoPlaying(false);
      setAutoResumeArmed(false);
    } else {
      setElapsedMs(0);
      setAutoResumeArmed(true);
      setIsAutoPlaying(true);
    }
    showControlsTemporarily();
  };

  const progressPercent = isAutoPlaying
    ? Math.min(100, (elapsedMs / pageDurationMs) * 100)
    : 0;

  return (
    <div
      className={`reader-root ${controlsVisible ? "controls-visible" : ""}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClick={() => {
        noteUserInteraction(false);
        showControlsTemporarily();
      }}
    >
      {currentBook.musicSrc && (
        <audio ref={audioRef} src={currentBook.musicSrc} loop preload="auto" />
      )}

      {/* Top floating bar */}
      <div
        className={`reader-top-bar ${controlsVisible ? "" : "hidden"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="reader-top-left">
          <button className="reader-pill-btn" onClick={onExit}>
            <ArrowLeft size={22} />
            返回書架
          </button>
          <div className="reader-title-block">
            <span className="reader-book-title">{currentBook.title}</span>
            <span className="reader-page-counter">
              第 {pageIdx + 1} / {currentBook.pages.length} 頁
            </span>
          </div>
        </div>

        <div className="reader-top-right">
          {playlist.length > 1 && (
            <button className="reader-pill-btn" onClick={goToNextBook}>
              <SkipForward size={20} />
              下一本 ({bookIdx + 1}/{playlist.length})
            </button>
          )}
          <button
            className={`reader-pill-btn ${isAutoPlaying ? "active" : ""}`}
            onClick={handleToggleAutoplay}
          >
            {isAutoPlaying ? <Pause size={20} /> : <Play size={20} />}
            {isAutoPlaying
              ? `自動播放中（${settings.pageDurationSec}秒）`
              : "開始自動播放"}
          </button>
          <button
            className="reader-pill-btn"
            onClick={(e) => {
              e.stopPropagation();
              onToggleMute();
              showControlsTemporarily();
            }}
          >
            {settings.musicMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            {settings.musicMuted ? "靜音" : "音樂"}
          </button>
        </div>
      </div>

      {/* Subtle status badge when paused by touch */}
      {!isAutoPlaying && idleRemainingSec !== null && (
        <div className="mode-status-badge">
          手動翻頁中・{idleRemainingSec} 秒後恢復自動播放
        </div>
      )}

      {/* Left / Right edge tap zones */}
      <button
        className="touch-zone-left"
        aria-label="上一頁"
        onClick={(e) => {
          e.stopPropagation();
          goToPrevPage();
        }}
      >
        <span className="edge-arrow-pill">
          <ChevronLeft size={34} />
        </span>
      </button>

      <button
        className="touch-zone-right"
        aria-label="下一頁"
        onClick={(e) => {
          e.stopPropagation();
          goToNextPage(false);
        }}
      >
        <span className="edge-arrow-pill">
          <ChevronRight size={34} />
        </span>
      </button>

      {/* Main wide picture-book artwork */}
      <div className="reader-stage">
        <img
          key={`${currentBook.slug}-${currentPage.page}`}
          className="reader-artwork"
          src={currentPage.image}
          alt={`${currentBook.title} 第 ${currentPage.page} 頁`}
          draggable={false}
        />
      </div>

      {/* Cinema bottom subtitle bar (Option B - Always visible) */}
      {currentSubtitle && (
        <div
          className="cinema-subtitle-wrap"
          onClick={handleSubtitleTap}
          title={segments.length > 1 ? "點擊切換下一段字幕" : undefined}
        >
          <p
            key={`${currentBook.slug}-${currentPage.page}-${activeSegIdx}`}
            className="cinema-subtitle-text"
          >
            {currentSubtitle}
          </p>
          {segments.length > 1 && (
            <div className="subtitle-dots" aria-hidden="true">
              {segments.map((_, idx) => (
                <span
                  key={idx}
                  className={`subtitle-dot ${idx === activeSegIdx ? "active" : ""}`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Thin 15-second countdown bar at very bottom */}
      {isAutoPlaying && (
        <div className="autoplay-progress-track" aria-hidden="true">
          <div
            className="autoplay-progress-fill"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}
    </div>
  );
}
