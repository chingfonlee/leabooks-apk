import rawBooks from "./books.generated.json";
import type { TvBook } from "../types";

export const TV_BOOKS: TvBook[] = rawBooks as TvBook[];

export function getBookBySlug(slug: string): TvBook | undefined {
  return TV_BOOKS.find((book) => book.slug === slug);
}

/**
 * Normalize a book title or filename for forgiving automatic matching:
 * strips file extension, leading numbering (e.g. "01-"), punctuation, and whitespace.
 */
export function normalizeMatchKey(input: string): string {
  return input
    .replace(/\.[^.]+$/, "")
    .replace(/^\d+[\s._-]+/, "")
    .replace(/[《》「」『』【】()（）,，、。！？!?：:；;—\-_\s]+/g, "")
    .toLowerCase()
    .trim();
}

export function matchBookByFileName(fileName: string): TvBook | undefined {
  const baseName = fileName.replace(/\.[^.]+$/, "");
  const normalizedFile = normalizeMatchKey(baseName);
  if (!normalizedFile) return undefined;

  for (const book of TV_BOOKS) {
    const candidates = [
      book.title,
      book.sourceName,
      book.slug,
      book.titleEn,
    ]
      .filter(Boolean)
      .map(normalizeMatchKey);

    if (
      candidates.some(
        (c) => c === normalizedFile || (c.length >= 2 && normalizedFile.includes(c)),
      )
    ) {
      return book;
    }
  }
  return undefined;
}
