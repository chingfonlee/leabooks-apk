import { useRef } from "react";
import {
  BookOpen,
  Film,
  FolderOpen,
  Play,
  RefreshCw,
  Settings,
} from "lucide-react";
import type { LocalVideoItem, TvBook } from "../types";
import { useSpatialNavigation } from "../utils/tvNavigation";

export type ShelfTab = "books" | "videos";

interface HomeShelfProps {
  activeTab: ShelfTab;
  onTabChange: (tab: ShelfTab) => void;
  books: TvBook[];
  videos: LocalVideoItem[];
  videoFolderName: string;
  videoLoading: boolean;
  spatialNavEnabled: boolean;
  onOpenBook: (slug: string, autoplay: boolean) => void;
  onOpenAutoplayModal: () => void;
  onOpenSettings: () => void;
  onPickVideoFolder: () => void;
  onRescanVideos: () => void;
  onPlayVideo: (index: number) => void;
}

export function HomeShelf({
  activeTab,
  onTabChange,
  books,
  videos,
  videoFolderName,
  videoLoading,
  spatialNavEnabled,
  onOpenBook,
  onOpenAutoplayModal,
  onOpenSettings,
  onPickVideoFolder,
  onRescanVideos,
  onPlayVideo,
}: HomeShelfProps) {
  const shelfRef = useRef<HTMLDivElement | null>(null);
  useSpatialNavigation(shelfRef, spatialNavEnabled);

  return (
    <div className="shelf-shell" ref={shelfRef}>
      <header className="shelf-header">
        <div className="brand-group">
          <span className="brand-title">Lea Books</span>
          <span className="brand-badge">GATE STORY TV</span>
        </div>

        <nav className="tab-switcher" aria-label="切換模式">
          <button
            className={`tab-btn ${activeTab === "books" ? "active" : ""}`}
            onClick={() => onTabChange("books")}
          >
            <BookOpen size={22} />
            繪本閱讀 ({books.length})
          </button>
          <button
            className={`tab-btn ${activeTab === "videos" ? "active" : ""}`}
            onClick={() => onTabChange("videos")}
          >
            <Film size={22} />
            繪本影片 ({videos.length})
          </button>
        </nav>

        <div className="header-actions">
          {activeTab === "books" && (
            <button className="action-btn primary" onClick={onOpenAutoplayModal}>
              <Play size={20} />
              自動輪播
            </button>
          )}
          <button className="action-btn" onClick={onOpenSettings}>
            <Settings size={20} />
            設定
          </button>
        </div>
      </header>

      <main className="shelf-content">
        {activeTab === "books" ? (
          <div className="book-grid">
            {books.map((book, idx) => (
              <article key={book.slug} className="book-card">
                <div className="book-cover-box">
                  <button
                    className="book-cover-btn"
                    data-autofocus={idx === 0 ? "true" : undefined}
                    onClick={() => onOpenBook(book.slug, false)}
                    aria-label={`閱讀 ${book.title}`}
                  >
                    <img
                      className="book-cover-img"
                      src={book.coverImage}
                      alt={book.title}
                      loading="eager"
                    />
                    <span className="book-order-chip">
                      {String(book.order).padStart(2, "0")}
                    </span>
                  </button>
                </div>
                <div className="book-card-footer">
                  <span
                    className="book-card-title"
                    onClick={() => onOpenBook(book.slug, false)}
                    style={{ cursor: "pointer" }}
                  >
                    {book.title}
                  </span>
                  <button
                    className="book-card-auto-btn"
                    onClick={() => onOpenBook(book.slug, true)}
                    title="自動播放這本繪本"
                  >
                    <Play size={16} />
                    自動
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div>
            <div className="video-toolbar">
              <div className="video-folder-info">
                <span className="video-folder-label">
                  {videoFolderName
                    ? `本機影片資料夾：${videoFolderName}（共 ${videos.length} 支影片）`
                    : "尚未指定本機影片資料夾"}
                </span>
                <span className="video-folder-hint">
                  將 .mp4 影片放入資料夾，檔名與繪本名稱相同即會自動套用封面與書名
                </span>
              </div>

              <div className="video-toolbar-actions">
                {videos.length > 0 && (
                  <button
                    className="action-btn primary"
                    onClick={() => onPlayVideo(0)}
                  >
                    <Play size={20} />
                    全部影片輪播
                  </button>
                )}
                {videoFolderName && (
                  <button
                    className="action-btn"
                    onClick={onRescanVideos}
                    disabled={videoLoading}
                  >
                    <RefreshCw size={20} />
                    重新掃描
                  </button>
                )}
                <button
                  className="action-btn"
                  onClick={onPickVideoFolder}
                  disabled={videoLoading}
                >
                  <FolderOpen size={20} />
                  {videoFolderName ? "更換資料夾" : "選擇影片資料夾"}
                </button>
              </div>
            </div>

            {videos.length === 0 ? (
              <div className="empty-video-state">
                <Film size={64} color="var(--accent)" />
                <h2>
                  {videoFolderName
                    ? "此資料夾目前找不到影片檔"
                    : "尚未連結本機影片資料夾"}
                </h2>
                <p>
                  首次使用請點擊下方按鈕選擇白板本機的影片資料夾（例如{" "}
                  <code>Movies/LeaBookVideos</code>）。授權後系統會永久記住，之後新增{" "}
                  <code>.mp4</code> 影片都會自動讀取。
                </p>
                <button
                  className="action-btn primary"
                  onClick={onPickVideoFolder}
                  disabled={videoLoading}
                >
                  <FolderOpen size={22} />
                  {videoLoading ? "讀取中..." : "選擇本機影片資料夾"}
                </button>
              </div>
            ) : (
              <div className="book-grid">
                {videos.map((video, idx) => (
                  <article key={video.id} className="book-card">
                    <div className="book-cover-box">
                      <button
                        className="book-cover-btn"
                        onClick={() => onPlayVideo(idx)}
                        aria-label={`播放影片 ${video.displayTitle}`}
                      >
                        {video.coverImage ? (
                          <img
                            className="book-cover-img"
                            src={video.coverImage}
                            alt={video.displayTitle}
                          />
                        ) : (
                          <div className="video-placeholder-cover">
                            <Film size={52} />
                          </div>
                        )}
                        <div className="video-play-overlay">
                          <div className="video-play-circle">
                            <Play size={28} fill="#fff" />
                          </div>
                        </div>
                      </button>
                    </div>
                    <div className="book-card-footer">
                      <span className="book-card-title">{video.displayTitle}</span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
