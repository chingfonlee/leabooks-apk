import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

const sourceRoot = process.env.LEAQRBOOK_ROOT
  ? path.resolve(process.env.LEAQRBOOK_ROOT)
  : path.resolve(projectRoot, "..", "LeaQRbook");

const sourceBooksTs = path.join(sourceRoot, "src", "data", "books.ts");
const sourceAssetsRoot = fs.existsSync(path.join(sourceRoot, "public", "books"))
  ? path.join(sourceRoot, "public", "books")
  : path.join(sourceRoot, "dist", "books");

const targetPublicBooks = path.join(projectRoot, "public", "books");
const targetSharedAudio = path.join(targetPublicBooks, "_shared");
const targetJsonPath = path.join(projectRoot, "src", "data", "books.generated.json");

if (!fs.existsSync(sourceBooksTs)) {
  console.error(`Source books.ts not found: ${sourceBooksTs}`);
  process.exit(1);
}
if (!fs.existsSync(sourceAssetsRoot)) {
  console.error(`Source book assets directory not found: ${sourceAssetsRoot}`);
  process.exit(1);
}

const rawTs = fs.readFileSync(sourceBooksTs, "utf8");
const match = rawTs.match(/export const books = (\[[\s\S]*?\]) satisfies Book\[\];/);
if (!match) {
  console.error("Failed to parse books array from source books.ts");
  process.exit(1);
}

const sourceBooks = JSON.parse(match[1]);

// Sort naturally by sourceName (01-..., 02-..., ..., 11-...)
sourceBooks.sort((a, b) =>
  String(a.sourceName || a.slug).localeCompare(String(b.sourceName || b.slug), "zh-Hant", {
    numeric: true,
  }),
);

// Clean previous generated assets
fs.rmSync(targetPublicBooks, { recursive: true, force: true });
fs.mkdirSync(targetSharedAudio, { recursive: true });
fs.mkdirSync(path.dirname(targetJsonPath), { recursive: true });

// Deduplicate identical audio files by SHA-256 while preserving per-book musicSrc
const audioHashToPath = new Map();
let totalCopiedImages = 0;
let totalCopiedAudio = 0;

const tvBooks = sourceBooks.map((book, index) => {
  const slug = book.slug;
  const srcBookDir = path.join(sourceAssetsRoot, slug);
  const dstBookDir = path.join(targetPublicBooks, slug);
  fs.mkdirSync(dstBookDir, { recursive: true });

  // Copy page images
  const pages = book.pages.map((p) => {
    const fileName = path.basename(p.image);
    const srcImg = path.join(srcBookDir, fileName);
    const dstImg = path.join(dstBookDir, fileName);
    if (!fs.existsSync(srcImg)) {
      throw new Error(`Missing image file: ${srcImg}`);
    }
    fs.copyFileSync(srcImg, dstImg);
    totalCopiedImages += 1;
    return {
      page: p.page,
      image: `./books/${slug}/${fileName}`,
      text: (p.text?.zh ?? "").trim(),
    };
  });

  // Copy/deduplicate background music
  let musicSrc = undefined;
  if (book.musicSrc) {
    const audioFileName = path.basename(book.musicSrc);
    const srcAudio = path.join(srcBookDir, audioFileName);
    if (fs.existsSync(srcAudio)) {
      const audioBuf = fs.readFileSync(srcAudio);
      const hash = crypto.createHash("sha256").update(audioBuf).digest("hex").slice(0, 12);
      if (!audioHashToPath.has(hash)) {
        const ext = path.extname(audioFileName) || ".mp3";
        const sharedName = `music-${hash}${ext}`;
        fs.writeFileSync(path.join(targetSharedAudio, sharedName), audioBuf);
        audioHashToPath.set(hash, `./books/_shared/${sharedName}`);
        totalCopiedAudio += 1;
      }
      musicSrc = audioHashToPath.get(hash);
    }
  }

  const coverFileName = path.basename(book.coverImage || pages[0]?.image || "page-01.webp");

  return {
    order: index + 1,
    slug,
    sourceName: book.sourceName,
    title: book.title?.zh ?? book.sourceName,
    titleEn: book.title?.en ?? "",
    backCoverText: (book.backCoverText?.zh ?? "").trim(),
    coverImage: `./books/${slug}/${coverFileName}`,
    musicSrc,
    pageCount: pages.length,
    pages,
  };
});

fs.writeFileSync(targetJsonPath, JSON.stringify(tvBooks, null, 2) + "\n", "utf8");

console.log(
  `Imported ${tvBooks.length} books (${totalCopiedImages} images, ${totalCopiedAudio} unique audio file(s)) from ${sourceRoot}`,
);
