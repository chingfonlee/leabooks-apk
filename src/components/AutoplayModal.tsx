import { useState } from "react";
import { CheckSquare, Play, Square, X } from "lucide-react";
import type { TvBook } from "../types";

interface AutoplayModalProps {
  books: TvBook[];
  pageDurationSec: number;
  onClose: () => void;
  onStartAutoplay: (selectedSlugs: string[]) => void;
}

export function AutoplayModal({
  books,
  pageDurationSec,
  onClose,
  onStartAutoplay,
}: AutoplayModalProps) {
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>(() =>
    books.map((b) => b.slug),
  );

  const toggleSlug = (slug: string) => {
    setSelectedSlugs((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug],
    );
  };

  const selectAll = () => setSelectedSlugs(books.map((b) => b.slug));
  const clearAll = () => setSelectedSlugs([]);

  const orderedSelection = books
    .filter((b) => selectedSlugs.includes(b.slug))
    .map((b) => b.slug);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>自動輪播設定（每頁 {pageDurationSec} 秒）</h2>
          <button className="action-btn" onClick={onClose} aria-label="關閉">
            <X size={24} />
          </button>
        </div>

        <div className="modal-body">
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <button className="action-btn" onClick={selectAll}>
              全選 {books.length} 本
            </button>
            <button className="action-btn" onClick={clearAll}>
              全部取消
            </button>
            <span style={{ color: "var(--text-secondary)", fontSize: 16 }}>
              已選 {orderedSelection.length} 本（單選 1 本會循環重播該書；多選則依序連續輪播）
            </span>
          </div>

          <div className="playlist-grid">
            {books.map((book) => {
              const checked = selectedSlugs.includes(book.slug);
              return (
                <button
                  key={book.slug}
                  className={`playlist-item ${checked ? "selected" : ""}`}
                  onClick={() => toggleSlug(book.slug)}
                >
                  {checked ? (
                    <CheckSquare size={24} color="var(--accent)" />
                  ) : (
                    <Square size={24} color="var(--text-muted)" />
                  )}
                  <img
                    className="playlist-thumb"
                    src={book.coverImage}
                    alt={book.title}
                  />
                  <span className="playlist-item-title">
                    {String(book.order).padStart(2, "0")}. {book.title}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="modal-footer">
          <button className="action-btn" onClick={onClose}>
            取消
          </button>
          <button
            className="action-btn primary"
            disabled={orderedSelection.length === 0}
            style={{ opacity: orderedSelection.length === 0 ? 0.45 : 1 }}
            onClick={() => onStartAutoplay(orderedSelection)}
          >
            <Play size={22} />
            開始自動輪播（{orderedSelection.length} 本）
          </button>
        </div>
      </div>
    </div>
  );
}
