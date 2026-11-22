import { Capacitor, registerPlugin } from "@capacitor/core";
import { matchBookByFileName } from "../data/books";
import type { LocalVideoItem } from "../types";

interface NativeVideoEntry {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  playUrl: string;
}

interface NativeFolderResult {
  hasFolder: boolean;
  folderName: string;
}

interface NativeListResult {
  hasFolder: boolean;
  folderName: string;
  videos: NativeVideoEntry[];
}

interface LocalVideoLibraryPlugin {
  getSavedFolder(): Promise<NativeFolderResult>;
  pickVideoFolder(): Promise<NativeListResult>;
  listVideos(): Promise<NativeListResult>;
}

const NativeLocalVideoLibrary =
  registerPlugin<LocalVideoLibraryPlugin>("LocalVideoLibrary");

// Browser/dev fallback storage in memory
let webFallbackFolderName = "";
let webFallbackVideos: LocalVideoItem[] = [];

function toVideoItem(entry: {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  playUrl: string;
}): LocalVideoItem {
  const matchedBook = matchBookByFileName(entry.name);
  const cleanTitle = entry.name.replace(/\.[^.]+$/, "");
  return {
    id: entry.id,
    fileName: entry.name,
    displayTitle: matchedBook ? matchedBook.title : cleanTitle,
    playUrl: entry.playUrl,
    sizeBytes: entry.size,
    mimeType: entry.mimeType,
    matchedBookSlug: matchedBook?.slug,
    coverImage: matchedBook?.coverImage,
  };
}

export function isNativeAndroid(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
}

export async function getSavedVideoFolder(): Promise<NativeFolderResult> {
  if (isNativeAndroid()) {
    return NativeLocalVideoLibrary.getSavedFolder();
  }
  return {
    hasFolder: webFallbackVideos.length > 0,
    folderName: webFallbackFolderName,
  };
}

export async function listLocalVideos(): Promise<{
  hasFolder: boolean;
  folderName: string;
  videos: LocalVideoItem[];
}> {
  if (isNativeAndroid()) {
    const res = await NativeLocalVideoLibrary.listVideos();
    return {
      hasFolder: res.hasFolder,
      folderName: res.folderName,
      videos: res.videos.map(toVideoItem),
    };
  }
  return {
    hasFolder: webFallbackVideos.length > 0,
    folderName: webFallbackFolderName,
    videos: webFallbackVideos,
  };
}

export async function pickLocalVideoFolder(): Promise<{
  hasFolder: boolean;
  folderName: string;
  videos: LocalVideoItem[];
}> {
  if (isNativeAndroid()) {
    const res = await NativeLocalVideoLibrary.pickVideoFolder();
    return {
      hasFolder: res.hasFolder,
      folderName: res.folderName,
      videos: res.videos.map(toVideoItem),
    };
  }

  // Desktop browser preview fallback using hidden <input webkitdirectory>
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.accept = "video/mp4,video/webm,video/x-matroska,video/*";
    input.setAttribute("webkitdirectory", "");
    input.onchange = () => {
      const files = Array.from(input.files ?? []).filter((f) =>
        /\.(mp4|webm|mkv|mov)$/i.test(f.name),
      );
      // Revoke previous object URLs
      for (const old of webFallbackVideos) {
        if (old.playUrl.startsWith("blob:")) URL.revokeObjectURL(old.playUrl);
      }
      files.sort((a, b) =>
        a.name.localeCompare(b.name, "zh-Hant", { numeric: true }),
      );
      const firstRel = (files[0] as File & { webkitRelativePath?: string })
        ?.webkitRelativePath;
      webFallbackFolderName = firstRel ? firstRel.split("/")[0] : "本機預覽資料夾";
      webFallbackVideos = files.map((file, idx) =>
        toVideoItem({
          id: `web-${idx}-${file.name}`,
          name: file.name,
          size: file.size,
          mimeType: file.type || "video/mp4",
          playUrl: URL.createObjectURL(file),
        }),
      );
      resolve({
        hasFolder: webFallbackVideos.length > 0,
        folderName: webFallbackFolderName,
        videos: webFallbackVideos,
      });
    };
    input.click();
  });
}
