import { useCallback, useEffect, useState } from "react";
import { App as CapApp } from "@capacitor/app";
import { TV_BOOKS, getBookBySlug } from "./data/books";
import {
  listLocalVideos,
  pickLocalVideoFolder,
} from "./plugins/localVideoLibrary";
import { AutoplayModal } from "./components/AutoplayModal";
import { BookReader } from "./components/BookReader";
import { HomeShelf, type ShelfTab } from "./components/HomeShelf";
import { SettingsModal } from "./components/SettingsModal";
import { VideoPlayer } from "./components/VideoPlayer";
import {
  DEFAULT_SETTINGS,
  type AppSettings,
  type LocalVideoItem,
  type TvBook,
} from "./types";

const SETTINGS_STORAGE_KEY = "lea-book-tv-settings-v1";

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

type ViewState =
  | { mode: "shelf" }
  | { mode: "reader"; playlist: TvBook[]; initialAutoplay: boolean }
  | { mode: "video"; initialIndex: number };

export function App() {
  const [view, setView] = useState<ViewState>({ mode: "shelf" });
  const [activeTab, setActiveTab] = useState<ShelfTab>("books");
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [showAutoplayModal, setShowAutoplayModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const [videos, setVideos] = useState<LocalVideoItem[]>([]);
  const [videoFolderName, setVideoFolderName] = useState("");
  const [videoLoading, setVideoLoading] = useState(false);

  const updateSettings = useCallback((next: AppSettings) => {
    setSettings(next);
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage errors
    }
  }, []);

  const loadVideosFromDisk = useCallback(async () => {
    setVideoLoading(true);
    try {
      const res = await listLocalVideos();
      setVideoFolderName(res.folderName);
      setVideos(res.videos);
    } catch {
      // Folder may not be authorized yet
    } finally {
      setVideoLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVideosFromDisk();
  }, [loadVideosFromDisk]);

  // Toggle TV remote focus ring visibility automatically between touch and D-Pad
  useEffect(() => {
    const onPointerOrTouch = () => {
      document.body.classList.remove("tv-remote-mode");
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.key.startsWith("Arrow") ||
        e.key === "Enter" ||
        e.key === "Select" ||
        e.key === "Tab"
      ) {
        document.body.classList.add("tv-remote-mode");
      }
    };
    window.addEventListener("touchstart", onPointerOrTouch, { passive: true });
    window.addEventListener("pointerdown", onPointerOrTouch, { passive: true });
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("touchstart", onPointerOrTouch);
      window.removeEventListener("pointerdown", onPointerOrTouch);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  // Android hardware back button returns to shelf from reader/video, or exits normally from shelf
  useEffect(() => {
    const handlePromise = CapApp.addListener("backButton", () => {
      if (showAutoplayModal) {
        setShowAutoplayModal(false);
      } else if (showSettingsModal) {
        setShowSettingsModal(false);
      } else if (view.mode !== "shelf") {
        setView({ mode: "shelf" });
      } else {
        CapApp.exitApp();
      }
    });
    return () => {
      handlePromise.then((h) => h.remove()).catch(() => {});
    };
  }, [showAutoplayModal, showSettingsModal, view.mode]);

  const handlePickVideoFolder = async () => {
    setVideoLoading(true);
    try {
      const res = await pickLocalVideoFolder();
      setVideoFolderName(res.folderName);
      setVideos(res.videos);
    } catch {
      // User cancelled picker
    } finally {
      setVideoLoading(false);
    }
  };

  const handleOpenBook = (slug: string, autoplay: boolean) => {
    const book = getBookBySlug(slug);
    if (!book) return;
    setView({
      mode: "reader",
      playlist: [book],
      initialAutoplay: autoplay,
    });
  };

  const handleStartAutoplayPlaylist = (slugs: string[]) => {
    const playlist = slugs
      .map((s) => getBookBySlug(s))
      .filter((b): b is TvBook => Boolean(b));
    if (playlist.length === 0) return;
    setShowAutoplayModal(false);
    setView({
      mode: "reader",
      playlist,
      initialAutoplay: true,
    });
  };

  if (view.mode === "reader") {
    return (
      <BookReader
        playlist={view.playlist}
        initialAutoplay={view.initialAutoplay}
        settings={settings}
        onToggleMute={() =>
          updateSettings({ ...settings, musicMuted: !settings.musicMuted })
        }
        onExit={() => setView({ mode: "shelf" })}
      />
    );
  }

  if (view.mode === "video") {
    return (
      <VideoPlayer
        videos={videos}
        initialIndex={view.initialIndex}
        onExit={() => setView({ mode: "shelf" })}
      />
    );
  }

  return (
    <>
      <HomeShelf
        activeTab={activeTab}
        onTabChange={setActiveTab}
        books={TV_BOOKS}
        videos={videos}
        videoFolderName={videoFolderName}
        videoLoading={videoLoading}
        spatialNavEnabled={!showAutoplayModal && !showSettingsModal}
        onOpenBook={handleOpenBook}
        onOpenAutoplayModal={() => setShowAutoplayModal(true)}
        onOpenSettings={() => setShowSettingsModal(true)}
        onPickVideoFolder={handlePickVideoFolder}
        onRescanVideos={loadVideosFromDisk}
        onPlayVideo={(idx) => setView({ mode: "video", initialIndex: idx })}
      />

      {showAutoplayModal && (
        <AutoplayModal
          books={TV_BOOKS}
          pageDurationSec={settings.pageDurationSec}
          onClose={() => setShowAutoplayModal(false)}
          onStartAutoplay={handleStartAutoplayPlaylist}
        />
      )}

      {showSettingsModal && (
        <SettingsModal
          settings={settings}
          onChange={updateSettings}
          onClose={() => setShowSettingsModal(false)}
        />
      )}
    </>
  );
}
