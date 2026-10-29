"use client";

import { Capacitor } from "@capacitor/core";

function blobToBase64(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

/**
 * Saves a file the way the platform allows: a download in the browser, the share sheet in the Android app
 * (WebViews ignore downloads). Resolves false if the person closes the share sheet without saving.
 */
export async function saveFile(blob: Blob, name: string, title: string): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    const [{ Filesystem, Directory }, { Share }] = await Promise.all([import("@capacitor/filesystem"), import("@capacitor/share")]);
    const { uri } = await Filesystem.writeFile({ path: name, data: await blobToBase64(blob), directory: Directory.Cache });
    try {
      await Share.share({ title, files: [uri] });
      return true;
    } catch (e) {
      if (/cancel/i.test((e as Error).message)) return false;
      throw e;
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
  return true;
}
