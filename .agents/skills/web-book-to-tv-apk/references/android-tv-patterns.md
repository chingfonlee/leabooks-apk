# Android 14 TV / Whiteboard Implementation Patterns

Reference details for `web-book-to-tv-apk`.

## 1. AndroidManifest.xml TV & Whiteboard Compatibility

Include optional Leanback & touchscreen declarations so the APK installs cleanly on both 86-inch interactive touch whiteboards and pure D-Pad Android TV boxes, and appears in Leanback launchers:

```xml
<uses-feature android:name="android.hardware.touchscreen" android:required="false" />
<uses-feature android:name="android.software.leanback" android:required="false" />
```

On `<application>`:
- `android:usesCleartextTraffic="true"` (required for loopback `http://127.0.0.1:<port>` video streaming on Android 14).

On `<activity android:name=".MainActivity">`:
- `android:screenOrientation="sensorLandscape"`
- Add `<category android:name="android.intent.category.LEANBACK_LAUNCHER" />` alongside `LAUNCHER` inside the main `<intent-filter>`.

---

## 2. Android 14 Local Video Folder Playback (SAF + Loopback HTTP Range)

On Android 14 (Scoped Storage), WebView cannot directly play `file:///sdcard/Movies/...` or stream multi-hundred-MB `content://` files via JS bridges.

**Pattern (see reusable templates in `../resources/`):**
1. **Folder Authorization (`LocalVideoLibraryPlugin.java`)**:
   - Launch `Intent(Intent.ACTION_OPEN_DOCUMENT_TREE)` with `FLAG_GRANT_READ_URI_PERMISSION | FLAG_GRANT_PERSISTABLE_URI_PERMISSION | FLAG_GRANT_PREFIX_URI_PERMISSION`.
   - Call `contentResolver.takePersistableUriPermission(treeUri, Intent.FLAG_GRANT_READ_URI_PERMISSION)` and persist `treeUri.toString()` in `SharedPreferences`.
   - Scan files using `DocumentFile.fromTreeUri(context, treeUri)` (requires `androidx.documentfile:documentfile:1.0.1` in `android/app/build.gradle`).
2. **Loopback Streaming (`LocalVideoHttpServer.java`)**:
   - Bind `new ServerSocket(0, 16, InetAddress.getByName("127.0.0.1"))` with a random per-session query token (`?token=<uuid>`).
   - Open `ParcelFileDescriptor` via `ContentResolver.openFileDescriptor(uri, "r")` and stream via `FileInputStream` using `fis.getChannel().position(start)`.
   - Support HTTP `Range: bytes=start-end` → `206 Partial Content` with `Accept-Ranges: bytes` and `Content-Range` so HTML5 `<video>` seeking works smoothly on 2GB+ MP4 files with near-zero RAM usage.
3. **Automatic Filename-to-Book Cover Matching**:
   - Normalize filenames by stripping extension, leading digits/separators (`01-`), punctuation, and whitespace, then match against `title`, `sourceName`, `slug`, and `titleEn`. Unmatched videos still appear with their filename as title.

---

## 3. TV Remote (D-Pad) Support Patterns

### Android Layer (`MainActivity.java`)
- Keep screen awake: `getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)`.
- Immersive fullscreen (without Kiosk lock): `WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE`.
- Ensure WebView receives D-Pad keys immediately on launch/resume:
  ```java
  webView.setFocusable(true);
  webView.setFocusableInTouchMode(true);
  webView.requestFocus();
  ```
- Normalize `KEYCODE_DPAD_CENTER` (23) to `KEYCODE_ENTER` (66) inside `dispatchKeyEvent(KeyEvent)` so every TV/whiteboard remote OK button triggers focused buttons reliably.

### Web Layer (`../resources/tvNavigation.ts` + Focus CSS)
- Toggle a `body.tv-remote-mode` class on `keydown` (Arrow/Enter/Select) and remove it on `touchstart`/`pointerdown`, so touch users don't see lingering focus outlines while remote users always see a high-contrast golden focus ring (`outline: 4px solid #ffca72`).
- Scope spatial navigation to the active container (modal when open, shelf otherwise) and auto-focus `[data-autofocus='true']` on open.
- Score candidates in direction `dir` by `primaryAxisDistance + secondaryAxisDistance * 2.6` and call `scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' })`.
- Let `<input type="range">` keep native `ArrowLeft`/`ArrowRight` handling for volume/seek sliders.

### Key Bindings Summary
- **Book Reader (controls hidden)**: `←`/`→` prev/next page, `↓` next subtitle segment, `↑` or `OK` show & focus top bar, `Back` exit to shelf.
- **Book Reader (controls visible)**: `←`/`→` move across top bar buttons, `OK` activate, `↓`/`Back` hide top bar.
- **Video Player (controls hidden)**: `OK` play/pause, `←`/`→` seek ±10s, `↑`/`↓` show & focus controls, `Back` exit to video wall.

---

## 4. Cross-Machine APK Build & Signing Guidelines

### Dynamic SDK / JDK Detection (Never Hardcode Usernames)
In `scripts/build-apk.ps1` (Windows):
```powershell
$sdkPathWin = if ($env:ANDROID_HOME) { $env:ANDROID_HOME }
              elseif ($env:ANDROID_SDK_ROOT) { $env:ANDROID_SDK_ROOT }
              else { Join-Path $env:LOCALAPPDATA "Android\Sdk" }

$javaHome   = if ($env:JAVA_HOME) { $env:JAVA_HOME }
              else { "C:\Program Files\Android\Android Studio\jbr" }
```
On macOS/Linux, default `ANDROID_HOME` is typically `~/Library/Android/sdk` (macOS) or `~/Android/Sdk` (Linux), and `JAVA_HOME` points to Android Studio's embedded `jbr/Contents/Home` or system JDK 17/21.

### Gradle Daemon Hang on Windows
When invoking `.\gradlew.bat assembleDebug` via PowerShell `Start-Process -Wait`, **always pass `--no-daemon`**; otherwise the spawned Gradle Daemon holds handles open and blocks script exit even after `BUILD SUCCESSFUL`.

### Signing Consistency & App Icons
- **Consistent Keystore**: Android refuses to overwrite-install (`adb install -r` or sideloading) an APK signed with a different certificate, forcing uninstall + losing saved SAF folder permissions. For multi-machine or long-term deployments, create a dedicated release keystore (stored securely outside Git) and configure `signingConfigs.release` in `android/app/build.gradle`.
- **Launcher Icons**: Replace default Capacitor icons in `android/app/src/main/res/mipmap-*` (e.g., via `@capacitor/assets` or Android Studio Image Asset) before exhibition deployment.
