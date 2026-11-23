---
name: web-book-to-tv-apk
description: >-
  End-to-end workflow for converting a web picture-book project (e.g. Astro/React static books
  with WebP spreads, text data, and MP3 music) into an offline Android 14 large-screen
  touch + TV remote (D-Pad) Capacitor APK, with optional local-folder MP4 video playback.
  Use whenever converting web picture books into an offline Android TV / interactive whiteboard
  APK, updating/adding books and rebuilding the APK, or implementing D-Pad + touch dual control
  and Android 14 SAF local video playback.
---

# Web Picture Book to Offline Android TV / Whiteboard APK

Convert a web picture-book repository into a lightweight, 100% offline Android 14 APK tailored for large 16:9 interactive touch displays and TV remote controls (D-Pad ↑↓←→, OK, Back).

## Core Architecture Rules

1. **Hybrid Storage Split (Keep APK Lightweight)**
   - **Picture books (All-in-APK)**: Bundle WebP spreads, text JSON, and deduplicated MP3 music inside the APK (`~20–80 MB`).
   - **Large videos (External Local Folder)**: Never bundle gigabytes of MP4s into the APK. Read videos from an Android local/USB folder via Android 14 SAF (`ACTION_OPEN_DOCUMENT_TREE` + persisted URI permission) and stream via a loopback-only `127.0.0.1` HTTP Range server.
2. **Audio Deduplication + Optional TV-Only Override**
   - Deduplicate identical MP3 files by SHA-256 into `public/books/_shared/music-<hash>.mp3`, while keeping an independent `musicSrc` field on every book.
   - Support an optional `custom-music/<slug>.mp3` (or `<title>.mp3`) override directory so TV-specific tracks can replace web tracks without editing the source web repo.
3. **Dual Input (Touch + TV Remote D-Pad) & TV Launcher Compatibility**
   - Support both touch (swipe, edge tap, large ≥56px targets) and TV remote (2D spatial D-Pad navigation, high-visibility focus ring, `KEYCODE_DPAD_CENTER` → `KEYCODE_ENTER` normalization, Back button handling).
   - Declare optional touchscreen & Leanback features in `AndroidManifest.xml` so the app installs and appears cleanly on both interactive whiteboards and Android TV launchers.
4. **Signing Consistency & Branding**
   - For production / multi-machine maintenance, configure a persistent signing keystore (avoid relying on machine-local debug keystores, which break `adb install -r` / overwrite-installs across machines and wipe persisted SAF folder permissions).
   - Replace default Capacitor launcher icons (`mipmap-*`) before exhibition deployment.

---

## Workflow A: Updating Existing Books & Rebuilding APK

When the target TV APK project already exists:

1. **Sync books read-only from the web source project** (plus any `custom-music/` overrides):
   ```powershell
   npm run import:books
   ```
   Verify output reports the expected book count, image count, and unique audio file count.
2. **Typecheck, build web bundle, sync Capacitor, and compile APK**:
   ```powershell
   npm run build:apk
   ```
   Ensure Gradle runs with `--no-daemon` on Windows so PowerShell exits immediately after `BUILD SUCCESSFUL`.
3. **Verify output**:
   - Confirm `release/<AppName>-debug.apk` (or signed release APK) exists with fresh timestamp, expected size, and SHA-256.

---

## Workflow B: Creating a New Offline TV APK Project from a Web Book Repo

1. **Audit the Source Web Project First**
   - Locate the book metadata file (e.g., `src/data/books.ts` or JSON) and built/public image & audio assets.
   - Check image dimensions/aspect ratio (e.g., `1600×777` wide spreads fit 16:9 screens with natural bottom space for subtitles).
   - Check text length per page (average & max characters) to size cinema subtitle chunking appropriately.
   - Check audio file uniqueness (SHA-256) to estimate APK footprint.
2. **Scaffold Vite + React + TypeScript + Capacitor**
   - Configure `vite.config.ts` with `base: "./"`, `assetsInlineLimit: 0`, and `@vitejs/plugin-legacy` (`targets: ["chrome >= 60", "android >= 8"]`, `modernPolyfills: true`, plus `terser`) so offline Android 8 Oreo TVs with legacy System WebView (Chrome 60–69) never hit blank screens while Android 14 loads modern ES bundles.
   - Configure `capacitor.config.ts` with `server: { androidScheme: "http", cleartext: true }` and `android: { minWebViewVersion: 60 }`.
   - In CSS, avoid bare `inset: 0` (use `top/right/bottom/left: 0`), avoid `aspect-ratio` (use `height: 0; padding-top: 56.25%` + absolute image), and put a fixed `font-size` fallback before every `clamp(...)`.
3. **Write Read-Only Book Importer (`scripts/import-books.mjs`)**
   - Read source metadata without modifying the source repo.
   - Sort books naturally (`01`, `02`, ...).
   - Copy WebP pages into `public/books/<slug>/`.
   - Check `custom-music/<slug>.mp3` first before falling back to source `music.mp3`; deduplicate by SHA-256 into `public/books/_shared/`, and output `src/data/books.generated.json`.
   - Exclude `public/books/`, `src/data/books.generated.json`, `dist/`, and `release/*.apk` in `.gitignore`.
4. **Build TV-Optimized UI Components**
   - Reuse starter templates from `./resources/`:
     - [subtitles.ts](./resources/subtitles.ts) — Chinese cinema subtitle chunking & proportional timing across the 15s page window.
     - [tvNavigation.ts](./resources/tvNavigation.ts) — 2D spatial D-Pad navigation hook (`useSpatialNavigation`, `findNextFocusable`, `focusElementForTv`).
   - Build Home Shelf (4-column grid, Books/Videos tabs, Autoplay Playlist modal, Settings modal), Theater Book Reader (15s countdown bar, touch pause + 60s idle resume, always-visible cinema subtitles), and Fullscreen Video Player.
5. **Add Android Platform & Native Extensions**
   - Run `npx cap add android`.
   - Update `AndroidManifest.xml` (landscape, `usesCleartextTraffic`, Leanback & optional touchscreen — see [Android TV & Remote Patterns](./references/android-tv-patterns.md)).
   - Add `androidx.documentfile:documentfile:1.0.1` in `android/app/build.gradle`.
   - Copy and adapt native templates from `./resources/` (update `package` to match your `appId`):
     - [LocalVideoHttpServer.java](./resources/LocalVideoHttpServer.java)
     - [LocalVideoLibraryPlugin.java](./resources/LocalVideoLibraryPlugin.java)
   - Register `LocalVideoLibraryPlugin.class` in `MainActivity.java` with `FLAG_KEEP_SCREEN_ON`, immersive fullscreen, WebView focus, and `DPAD_CENTER` → `ENTER` mapping.
6. **Build & Verify APK (Cross-Machine Safe)**
   - Resolve `ANDROID_HOME` / `JAVA_HOME` dynamically in `scripts/build-apk.ps1` (never hardcode a username; see [Android TV & Remote Patterns](./references/android-tv-patterns.md)).
   - Always pass `--no-daemon` to `gradlew.bat`.
   - Copy the resulting APK to `release/` and print file size + SHA-256.

---

## Validation Checklist

- [ ] `npm run import:books` completes with 0 missing images/audio (and applies any `custom-music/` overrides).
- [ ] `npm run build` (`tsc --noEmit && vite build`) exits with code 0.
- [ ] `npx cap sync android` copies assets without plugin errors.
- [ ] `.\gradlew.bat assembleDebug --no-daemon` (or `assembleRelease`) finishes with `BUILD SUCCESSFUL` and exits promptly.
- [ ] Resulting APK is copied to `release/`, verified with updated timestamp, size, SHA-256, and `aapt2 dump badging` (`minSdkVersion`, `LEANBACK_LAUNCHER`, `touchscreen` not required, legacy JS chunks present inside APK).
- [ ] Both touch controls and D-Pad (`↑↓←→`, `OK`, `Back`) work across Shelf, Modals, Book Reader, and Video Player.
- [ ] *(Optional, when device is connected via ADB)* Verify overwrite install and remote keys:
  ```powershell
  adb install -r release/<AppName>-debug.apk
  adb shell input keyevent 20 22 23 4   # Down, Right, DPAD_CENTER, Back
  ```

---

## Keeping Workspace & Global Copies in Sync

If this skill exists in both `.agents/skills/web-book-to-tv-apk/` (workspace, higher priority) and `~/.gemini/config/skills/web-book-to-tv-apk/` (global), mirror changes after editing so they do not drift:

```powershell
Copy-Item -Recurse -Force ".agents/skills/web-book-to-tv-apk/*" "$env:USERPROFILE\.gemini\config\skills\web-book-to-tv-apk\"
```
