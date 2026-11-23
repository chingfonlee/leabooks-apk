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

## Architecture Rules

1. **Hybrid Storage Split (Keep APK Lightweight)**
   - **Picture books (All-in-APK)**: Bundle WebP spreads, text JSON, and deduplicated MP3 music inside the APK (`~20–80 MB`).
   - **Large videos (External Local Folder)**: Never bundle gigabytes of MP4s into the APK. Read videos from an Android local/USB folder via Android 14 SAF (`ACTION_OPEN_DOCUMENT_TREE` + persisted URI permission) and stream via a loopback-only `127.0.0.1` HTTP Range server.
2. **Audio Deduplication with Per-Book Flexibility**
   - Deduplicate identical MP3 files by SHA-256 into `public/books/_shared/music-<hash>.mp3`, while keeping an independent `musicSrc` field on every book so any book can be assigned its own music later.
3. **Dual Input (Touch + TV Remote D-Pad)**
   - Support both touch (swipe, edge tap, large ≥56px targets) and TV remote (2D spatial D-Pad navigation, high-visibility focus ring, `KEYCODE_DPAD_CENTER` → `KEYCODE_ENTER` normalization, Back button handling).

---

## Workflow A: Updating Existing Books & Rebuilding APK

When the target TV APK project already exists (e.g., `lea-book-TV`):

1. **Sync books read-only from the web source project**
   ```powershell
   npm run import:books
   ```
   Verify output reports the expected book count, image count, and unique audio file count.
2. **Typecheck, build web bundle, sync Capacitor, and compile APK**
   ```powershell
   npm run build:apk
   ```
   (Always ensure Gradle uses `--no-daemon` on Windows so PowerShell exits cleanly after `BUILD SUCCESSFUL`.)
3. **Verify output**
   - Confirm `release/<AppName>-debug.apk` exists, timestamp is fresh, size is reasonable, and SHA-256 is printed.

---

## Workflow B: Creating a New Offline TV APK Project from a Web Book Repo

1. **Audit the Source Web Project First**
   - Locate the book metadata file (e.g., `src/data/books.ts` or JSON) and built/public image & audio assets.
   - Check image dimensions/aspect ratio (e.g., `1600×777` wide spreads fit 16:9 screens with natural bottom space for subtitles).
   - Check text length per page (average & max characters) to size cinema subtitle chunking appropriately.
   - Check audio file uniqueness (SHA-256) to estimate APK footprint.
2. **Scaffold Vite + React + TypeScript + Capacitor**
   - Configure `vite.config.ts` with `base: "./"` and `assetsInlineLimit: 0`.
   - Configure `capacitor.config.ts` with `server: { androidScheme: "http", cleartext: true }` so loopback `http://127.0.0.1:<port>` video streaming works without mixed-content blocks on Android 14.
3. **Write Read-Only Book Importer (`scripts/import-books.mjs`)**
   - Read source metadata without modifying the source repo.
   - Sort books naturally (`01`, `02`, ...).
   - Copy WebP pages into `public/books/<slug>/`, deduplicate MP3s by SHA-256 into `public/books/_shared/`, and output `src/data/books.generated.json`.
   - Exclude `public/books/`, `src/data/books.generated.json`, `dist/`, and `release/*.apk` in `.gitignore`.
4. **Build TV-Optimized UI Components**
   - **Home Shelf**: 4-column landscape cover grid, tab switch (`繪本閱讀` / `繪本影片`), Autoplay Playlist modal (single-book loop or multi-book sequential), Settings modal (page duration default 15s, idle resume default 60s, music volume).
   - **Theater Book Reader**:
     - Centered full-width artwork with next-page image preloading.
     - Always-visible cinema bottom subtitle bar (2–3 lines, split by Chinese punctuation & proportional timing across the 15s window).
     - Touch + Autoplay coexistence: bottom countdown bar; any touch pauses autoplay and arms the idle-resume timer (60s).
   - **TV Remote Navigation**:
     - See [Android TV & Remote Patterns](./references/android-tv-patterns.md) for the 2D spatial navigation hook, focus ring CSS, and Reader/VideoPlayer D-Pad bindings.
5. **Add Android Platform & Native Extensions**
   - Run `npx cap add android`.
   - Add `android:screenOrientation="sensorLandscape"` and `android:usesCleartextTraffic="true"` in `AndroidManifest.xml`.
   - Add `androidx.documentfile:documentfile:1.0.1` in `android/app/build.gradle`.
   - Implement `LocalVideoHttpServer.java` + `LocalVideoLibraryPlugin.java` and register in `MainActivity.java` with `FLAG_KEEP_SCREEN_ON`, immersive fullscreen, WebView focus, and `DPAD_CENTER` → `ENTER` mapping (details in [Android TV & Remote Patterns](./references/android-tv-patterns.md)).
6. **Build & Verify APK on Windows**
   - Use `scripts/build-apk.ps1` with process-local `JAVA_HOME` (`C:\Program Files\Android\Android Studio\jbr`), `ANDROID_HOME` (`C:\Users\user\AppData\Local\Android\Sdk`), and `.\gradlew.bat assembleDebug --no-daemon`.
   - Copy `android\app\build\outputs\apk\debug\app-debug.apk` to `release/` and verify file size and SHA-256.

---

## Validation Checklist

- [ ] `npm run import:books` completes with 0 missing images/audio.
- [ ] `npm run build` (`tsc --noEmit && vite build`) exits with code 0.
- [ ] `npx cap sync android` copies assets without plugin errors.
- [ ] `.\gradlew.bat assembleDebug --no-daemon` finishes with `BUILD SUCCESSFUL` and exits promptly.
- [ ] Resulting APK is copied to `release/`, verified with updated timestamp, size, and SHA-256.
- [ ] Both touch controls and D-Pad (`↑↓←→`, `OK`, `Back`) work across Shelf, Modals, Book Reader, and Video Player.
