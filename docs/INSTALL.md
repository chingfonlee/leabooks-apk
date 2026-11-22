# Lea Books TV — 86 吋 Android 14 白板安裝與維護說明

## 1. 首次安裝至 PERSONA 盛源 86 吋白板（完全離線）

1. 將編譯產出的 APK 檔案複製到 USB 隨身碟：
   * 檔案位置：`release/LeaBook-TV-debug.apk`
2. 將隨身碟插入 86 吋螢幕的 USB 孔。
3. 在白板 Android 14 系統中開啟「檔案管理」，點選 `LeaBook-TV-debug.apk` 進行安裝（若提示「允許安裝未知來源應用程式」，請開啟該權限後繼續）。
4. 安裝完成後，點擊桌面上的 **Lea Books TV** 圖示即可離線使用全部 11 本中文繪本。

---

## 2. 設定本機「繪本影片」資料夾（只需設定一次）

1. 在白板本機空間建立資料夾（建議路徑：`Movies/LeaBookVideos`），將影片檔（`.mp4`）透過隨身碟複製進去。
2. 影片檔名與繪本名稱對應規則（**完全自動，不需手動綁定**）：
   * 直接用中文書名：`六歲的生日蛋糕.mp4`、`蹦蹦跳跳的我.mp4`
   * 或帶編號：`01-六歲的生日蛋糕.mp4`
   * 或英文代稱：`the-sixth-birthday-cake.mp4`
   * 未在繪本清單內的新影片也會自動列出，並以檔名作為標題播放。
3. 開啟 **Lea Books TV** → 切換至上方 **「繪本影片」** 頁籤 → 點擊 **「選擇本機影片資料夾」**，選取剛剛建立的資料夾並按「允許存取」。
4. 系統會永久記住此授權；日後重開機或拷貝新影片進入該資料夾，開啟 App 或點一下「重新掃描」即會自動讀取。

---

## 3. 日後新增繪本或更換音樂時如何重新打包 APK

1. 在來源專案 `C:\Users\user\claudecode\LeaQRbook` 更新繪本資料或替換各書的 `music.mp3`。
2. 在本專案目錄（`c:\Users\user\claudecode\lea-book-TV`）依序執行：
   ```powershell
   npm run import:books
   npm run build:apk
   ```
3. 取得新產出的 `release/LeaBook-TV-debug.apk`，用隨身碟在白板上直接覆蓋安裝即可（不影響已授權的影片資料夾與設定）。

---

## 4. 在 Windows 電腦上快速預覽（開發測試）

```powershell
npm run dev
```
開啟瀏覽器後即可測試繪本閱讀器、電影式分段字幕、15 秒自動翻頁、60 秒閒置恢復與本機影片資料夾選取功能。
