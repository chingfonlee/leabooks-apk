export interface SubtitleSegment {
  text: string;
  startMs: number;
  endMs: number;
}

const MAX_SEGMENT_CHARS = 58;
const MIN_SEGMENT_DURATION_MS = 2200;

/**
 * Split Traditional Chinese picture-book page text into cinema-style 2-3 line chunks
 * and allocate display timing across `totalDurationMs` (default 15,000 ms).
 */
export function buildSubtitleSegments(
  rawText: string,
  totalDurationMs: number,
): SubtitleSegment[] {
  const cleaned = rawText.replace(/\r\n/g, "\n").trim();
  if (!cleaned) return [];

  // 1. Split by newlines first, then by sentence-ending punctuation
  const paragraphs = cleaned
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  const sentences: string[] = [];
  for (const para of paragraphs) {
    const parts = para.match(/[^。！？!?；;…]+(?:[。！？!?；;…]+[」』”"）)]*)?/g);
    if (!parts) {
      sentences.push(para);
      continue;
    }
    for (const part of parts) {
      const s = part.trim();
      if (!s) continue;
      if (s.length <= MAX_SEGMENT_CHARS) {
        sentences.push(s);
      } else {
        // Further split long sentences at commas/colons
        const subParts = s.match(/[^，、,：:]+(?:[，、,：:]+)?/g) ?? [s];
        let acc = "";
        for (const sub of subParts) {
          if (acc && acc.length + sub.length > MAX_SEGMENT_CHARS) {
            sentences.push(acc.trim());
            acc = sub;
          } else {
            acc += sub;
          }
        }
        if (acc.trim()) sentences.push(acc.trim());
      }
    }
  }

  // 2. Merge adjacent short sentences into comfortable 2-3 line cinema subtitle chunks
  const chunks: string[] = [];
  let current = "";
  for (const sentence of sentences) {
    if (!current) {
      current = sentence;
    } else if (current.length + sentence.length + 1 <= MAX_SEGMENT_CHARS) {
      current = `${current} ${sentence}`;
    } else {
      chunks.push(current);
      current = sentence;
    }
  }
  if (current) chunks.push(current);

  if (chunks.length === 0) return [];
  if (chunks.length === 1) {
    return [{ text: chunks[0], startMs: 0, endMs: totalDurationMs }];
  }

  // 3. Allocate time proportionally to character count with a floor per chunk
  const weights = chunks.map((c) => Math.max(c.length, 8));
  const totalWeight = weights.reduce((a, b) => a + b, 0);

  const rawDurations = weights.map((w) => (w / totalWeight) * totalDurationMs);
  const effectiveMin = Math.min(MIN_SEGMENT_DURATION_MS, totalDurationMs / chunks.length);

  // Clamp minimums and normalize so sum === totalDurationMs
  const clamped = rawDurations.map((d) => Math.max(d, effectiveMin));
  const clampedSum = clamped.reduce((a, b) => a + b, 0);
  const scale = totalDurationMs / clampedSum;

  const segments: SubtitleSegment[] = [];
  let cursor = 0;
  for (let i = 0; i < chunks.length; i++) {
    const dur = clamped[i] * scale;
    const end = i === chunks.length - 1 ? totalDurationMs : Math.round(cursor + dur);
    segments.push({
      text: chunks[i],
      startMs: Math.round(cursor),
      endMs: end,
    });
    cursor = end;
  }

  return segments;
}

export function getSegmentIndexAtTime(
  segments: SubtitleSegment[],
  elapsedMs: number,
): number {
  if (segments.length <= 1) return 0;
  for (let i = 0; i < segments.length; i++) {
    if (elapsedMs < segments[i].endMs) return i;
  }
  return segments.length - 1;
}
