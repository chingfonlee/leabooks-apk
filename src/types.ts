export interface TvBookPage {
  page: number;
  image: string;
  text: string;
}

export interface TvBook {
  order: number;
  slug: string;
  sourceName: string;
  title: string;
  titleEn: string;
  backCoverText: string;
  coverImage: string;
  musicSrc?: string;
  pageCount: number;
  pages: TvBookPage[];
}

export interface LocalVideoItem {
  id: string;
  fileName: string;
  displayTitle: string;
  playUrl: string;
  sizeBytes: number;
  mimeType: string;
  matchedBookSlug?: string;
  coverImage?: string;
}

export interface AppSettings {
  pageDurationSec: number; // default 15
  idleResumeSec: number; // default 60 (0 = disabled)
  musicVolume: number; // 0..1, default 0.7
  musicMuted: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  pageDurationSec: 15,
  idleResumeSec: 60,
  musicVolume: 0.7,
  musicMuted: false,
};
