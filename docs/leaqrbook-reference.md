# LeaQRbook 專案參考摘要

> 來源專案路徑：`C:\Users\user\claudecode\LeaQRbook`  
> 建置輸出目錄：`C:\Users\user\claudecode\LeaQRbook\dist`  
> 線上部署網址：`https://leabooks.netlify.app`

---

## 1. 專案定位與核心功能

**LeaQRbook**（品牌名稱：**Lea Books** / **GATE STORY**，套件名 `leabook`）是一個 **QR Code 多語系互動繪本網頁平台**。

* **使用情境**：實體繪本印製專屬 QR Code，讀者掃描後進入該書的固定網址（`/books/<slug>/`），選擇語言後即可使用互動式網頁閱讀器觀看圖文並聆聽背景音樂。
* **支援語系**：
  * `zh`：繁體中文
  * `en`：English
  * `cs`：Čeština（捷克文）

---

## 2. 技術棧與開發工具

依據 `package.json`、`astro.config.mjs` 與 `netlify.toml`：

* **框架**：Astro 5 (`^5.11.0`) + React 19 (`^19.0.0`) + TypeScript (`^5.6.0`)
* **UI 與動畫**：`framer-motion` (`^12.23.0`)、`lucide-react` (`^0.468.0`)
* **部署平台**：Netlify（建置指令 `npm run build`，發布目錄 `dist`，Node.js 22）
* **輔助工具與測試**：
  * `@playwright/test`（端對端測試）
  * `sharp` + `jsqr`（QR Code 圖片處理與掃描驗證）

### 主要 NPM 指令
* `npm run dev`：`astro dev`
* `npm run build`：`astro check && astro build`
* `npm run preview`：`astro preview`
* `npm run import:books`：`node scripts/import-books.mjs`
* `npm run validate:books`：`node scripts/validate-books.mjs`
* `npm run validate:qrcodes`：`node scripts/validate-qrcodes.mjs`

---

## 3. 原始碼與資料結構

### 主要原始碼（`src/`）
* `src/data/books.ts`：定義 `LanguageCode`、`BookPage`、`Book` 型別與完整 11 本書的多語系文字與資源路徑。
* `src/data/languages.ts`：語系設定。
* `src/data/about/`：`loader.ts`、`localeNotes.ts`（About 頁面多語系資料）。
* `src/components/PictureBookReader.tsx`：React 互動繪本閱讀器元件（圖文翻頁、背景音樂播放、字體／排版設定）。
* `src/pages/`：
  * `index.astro`：首頁
  * `about/index.astro`、`about/[lang].astro`：專案／品牌介紹頁
  * `books/[bookSlug]/index.astro`：繪本語系選擇入口頁
  * `books/[bookSlug]/[lang].astro`：各語系繪本閱讀頁

### `Book` 資料模型（擷取自 `src/data/books.ts`）
```ts
export type LanguageCode = "zh" | "en" | "cs";

export type BookPage = {
  page: number;
  image: string; // e.g. "/books/<slug>/page-01.webp"
  text: Record<LanguageCode, string>;
};

export type Book = {
  slug: string;
  sourceName: string;
  title: Record<LanguageCode, string>;
  languageLabels: Record<LanguageCode, string>;
  backCoverText: Record<LanguageCode, string>;
  coverImage: string; // e.g. "/books/<slug>/page-01.webp"
  musicSrc?: string;  // e.g. "/books/<slug>/music.mp3"
  pages: BookPage[];
};
```

---

## 4. `dist/` 建置輸出結構分析

`dist/` 為純靜態網站輸出，共 **264 個檔案**，總大小約 **57.61 MB**。

```text
dist/
├── index.html                  # 首頁 (Lea Books)
├── favicon.svg
├── _astro/                     # 打包後的 JS 與 CSS（5 個檔案，約 0.35 MB）
│   ├── client.*.js
│   ├── index.*.js
│   ├── PictureBookReader.*.js
│   ├── index.*.css
│   └── _lang_.*.css
├── about/                      # 多語系介紹頁（4 個 HTML，約 0.04 MB）
│   ├── index.html
│   ├── zh/index.html
│   ├── en/index.html
│   └── cs/index.html
└── books/                      # 11 本繪本靜態頁面與媒體（253 個檔案，57.21 MB）
    └── <bookSlug>/
        ├── index.html          # 語言選擇頁（QR Code 指向的固定網址）
        ├── zh/index.html       # 繁體中文閱讀頁
        ├── en/index.html       # 英文閱讀頁
        ├── cs/index.html       # 捷克文閱讀頁
        ├── page-01.webp ~ page-18.webp  # 18 頁 WebP 插圖
        └── music.mp3           # 背景音樂（每本約 3.46 MB，佔 dist 總容量大宗）
```

---

## 5. 收錄繪本清單（共 11 本，每本皆為 18 頁）

| 編號來源 (`sourceName`) | URL Slug (`slug`) | 繁體中文 (`zh`) | 英文 (`en`) | 捷克文 (`cs`) |
| --- | --- | --- | --- | --- |
| `01-六歲的生日蛋糕` | `the-sixth-birthday-cake` | 六歲的生日蛋糕 | The Sixth Birthday Cake | Dort k šestým narozeninám |
| `02-小時候` | `when-i-was-little` | 小時候 | When I Was Little | Když jsem byl malý |
| `03-想長大的小企鵝` | `the-little-penguin-who-wanted-to-grow-up` | 想長大的小企鵝 | The Little Penguin Who Wanted to Grow Up | Tučňáček, který chtěl vyrůst |
| `04-如果` | `if-normals-story` | 如果 | If | Kdyby |
| `05-我愛的人我愛的歌` | `the-people-i-love-the-songs-i-love` | 我愛的人我愛的歌 | The People I Love, the Songs I Love | Lidé, které miluji, písně, které miluji |
| `06-蹦蹦跳跳的我` | `bouncing-jumping-me` | 蹦蹦跳跳的我 | Bouncing, Jumping Me | Skáču a poskakuju |
| `07-親愛的小楊桃` | `dear-xiao-yangtao` | 親愛的小楊桃 | Dear Xiao Yangtao | Milá Xiao Yangtao |
| `08-像魚一樣跳躍：Wei Wei 的尋光練習` | `leap-like-a-fish` | 像魚一樣跳躍 | Leap Like a Fish | Skákat jako ryba |
| `09-想回去的地方不叫家` | `the-place-i-want-to-go-back-to-isnt-called-home` | 想回去的地方，不叫家 | The Place I Want to Go Back to Isn't Called Home | Místo, kam se chci vrátit, se nejmenuje domov |
| `10-在陽光中歌唱` | `singing-in-the-sunshine` | 在陽光中歌唱 | Singing in the Sunshine | Zpívání ve slunečním svitu |
| `11-我不是壞小孩` | `im-not-a-bad-kid` | 我不是壞小孩 | I'm Not a Bad Kid | Nejsem špatné dítě |
