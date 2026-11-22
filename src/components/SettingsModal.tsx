import { useRef } from "react";
import { Volume2, VolumeX, X } from "lucide-react";
import type { AppSettings } from "../types";
import { useSpatialNavigation } from "../utils/tvNavigation";

interface SettingsModalProps {
  settings: AppSettings;
  onChange: (next: AppSettings) => void;
  onClose: () => void;
}

const PAGE_DURATIONS = [10, 15, 20, 30];
const IDLE_OPTIONS = [
  { label: "30 秒", value: 30 },
  { label: "60 秒", value: 60 },
  { label: "90 秒", value: 90 },
  { label: "關閉", value: 0 },
];

export function SettingsModal({
  settings,
  onChange,
  onClose,
}: SettingsModalProps) {
  const modalRef = useRef<HTMLDivElement | null>(null);
  useSpatialNavigation(modalRef, true, onClose);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-panel"
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>播放與顯示設定</h2>
          <button className="action-btn" onClick={onClose} aria-label="關閉">
            <X size={24} />
          </button>
        </div>

        <div className="modal-body">
          <div className="setting-row">
            <div className="setting-info">
              <h3>自動翻頁秒數</h3>
              <p>自動播放時，每一頁停留的時間（預設 15 秒）</p>
            </div>
            <div className="option-pills">
              {PAGE_DURATIONS.map((sec) => (
                <button
                  key={sec}
                  className={`option-pill ${settings.pageDurationSec === sec ? "active" : ""}`}
                  onClick={() => onChange({ ...settings, pageDurationSec: sec })}
                >
                  {sec} 秒
                </button>
              ))}
            </div>
          </div>

          <div className="setting-row">
            <div className="setting-info">
              <h3>閒置自動恢復秒數</h3>
              <p>觸控暫停自動播放後，無人操作多久自動恢復輪播（預設 60 秒）</p>
            </div>
            <div className="option-pills">
              {IDLE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  className={`option-pill ${settings.idleResumeSec === opt.value ? "active" : ""}`}
                  onClick={() => onChange({ ...settings, idleResumeSec: opt.value })}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="setting-row">
            <div className="setting-info">
              <h3>繪本背景音樂</h3>
              <p>閱讀繪本時播放配樂，切換至影片時會自動暫停</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <button
                className={`option-pill ${!settings.musicMuted ? "active" : ""}`}
                onClick={() =>
                  onChange({ ...settings, musicMuted: !settings.musicMuted })
                }
                style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
              >
                {settings.musicMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                {settings.musicMuted ? "已靜音" : "開啟中"}
              </button>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(settings.musicVolume * 100)}
                onChange={(e) =>
                  onChange({
                    ...settings,
                    musicVolume: Number(e.target.value) / 100,
                    musicMuted: false,
                  })
                }
                style={{ width: 160, accentColor: "var(--accent)" }}
              />
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button
            className="action-btn primary"
            data-autofocus="true"
            onClick={onClose}
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
}
