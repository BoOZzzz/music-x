import { ipcMain } from "electron";
import path from "node:path";
import fs from "node:fs/promises";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

import { getDb } from "./db";
import {
  insertTrack,
  listTracks,
  getTrack,
  softDeleteTrack,
  upsertTrackByPath,
  softDeleteTracksMissing,
} from "./db/tracks";

import {
  listPlaylists,
  createPlaylist,
  renamePlaylist,
  deletePlaylist,
} from "./db/playlists";

import {
  getPlaylistTrackIds,
  setPlaylistOrder,
  addTrackToPlaylistEnd,
  removeTrackFromPlaylist,
  removeTrackFromAllPlaylists,
  listTracksForPlaylist,
  ensureTrackInPlaylist,
} from "./db/playlist_tracks";

export function registerLibraryIpc(getLibraryDir: () => string) {
  /* =========================
     LIBRARY TRACK HANDLERS
  ========================== */

  ipcMain.handle("musicx:listLibraryTracks", async () => {
    getDb();
    return listTracksForPlaylist("library");
  });

  ipcMain.handle("musicx:importToLibrary", async (_e, fileUrl: string) => {
    getDb();

    const libDir = getLibraryDir();
    await fs.mkdir(libDir, { recursive: true });

    const srcPath = fileURLToPathCompat(fileUrl);
    const base = safeName(path.basename(srcPath));

    const id = crypto.randomUUID();
    const added_at = Date.now();
    const title = path.parse(base).name;

    const destPath = path.join(libDir, `${id}__${base}`);

    await fs.copyFile(srcPath, destPath);

    const db = getDb();
    const tx = db.transaction(() => {
      insertTrack({ id, title, fs_path: destPath, added_at });
    });

    try {
      tx();

      // ✅ Ensure track is in Library playlist
      ensureTrackInPlaylist("library", id);
    } catch (err) {
      try { await fs.unlink(destPath); } catch {}
      throw err;
    }

    return { id, title, fs_path: destPath, added_at };
  });

  ipcMain.handle("musicx:deleteTrack", async (_e, id: string) => {
    getDb();

    const row = getTrack(id);
    if (!row || row.deleted_at) {
      return { ok: true, deleted: false, reason: "not_found" as const };
    }

    const libDir = path.resolve(getLibraryDir());
    const p = path.resolve(row.fs_path);

    if (!p.startsWith(libDir + path.sep)) {
      return { ok: false, deleted: false, reason: "outside_library" as const };
    }

    try {
      await fs.unlink(p);
    } catch (e: any) {
      if (e?.code !== "ENOENT") throw e;
    }

    softDeleteTrack(id);
    removeTrackFromPlaylist("library", id);

    return { ok: true, deleted: true };
  });

  ipcMain.handle("musicx:rescanLibrary", async () => {
    getDb();

    const libDir = getLibraryDir();
    await fs.mkdir(libDir, { recursive: true });

    const entries = await fs.readdir(libDir, { withFileTypes: true });

    const audioFiles = entries
      .filter((e) => e.isFile())
      .map((e) => path.join(libDir, e.name))
      .filter(isAudioFile);

    const now = Date.now();

    for (const p of audioFiles) {
      const { id, title } = parseLibraryFilename(path.basename(p), p);

      upsertTrackByPath({ id, title, fs_path: p, added_at: now });

      // ✅ Ensure membership in Library playlist
      ensureTrackInPlaylist("library", id);
    }

    const { deleted } = softDeleteTracksMissing(audioFiles);

    return {
      ok: true,
      libraryDir: libDir,
      scanned: audioFiles.length,
      deleted,
      tracks: listTracksForPlaylist("library"),
    };
  });

  ipcMain.handle("musicx:updateTrackTitle", (_evt, args: { trackId: string; title: string }) => {
    getDb();

    const { trackId, title } = args;
    if (!trackId) throw new Error("trackId required");

    const clean = (title ?? "").trim();
    if (!clean) throw new Error("title cannot be empty");

    const db = getDb();
    const stmt = db.prepare(`
      UPDATE tracks
      SET title = ?
      WHERE id = ?
    `);

    const info = stmt.run(clean, trackId);

    return { ok: true, changes: info.changes, trackId, title: clean };
  });

  /* =========================
        PLAYLIST HANDLERS
  ========================== */

  ipcMain.handle("musicx:listPlaylists", async () => {
    getDb();
    return listPlaylists();
  });

  ipcMain.handle("musicx:createPlaylist", async (_evt, name: string) => {
    getDb();

    const n = (name ?? "").trim();
    if (!n) return { ok: false, reason: "missing_name" as const };

    const pl = createPlaylist(n);
    return { ok: true as const, playlist: pl };
  });

  ipcMain.handle("musicx:renamePlaylist", async (_evt, id: string, name: string) => {
    getDb();

    const n = (name ?? "").trim();
    if (!id) return { ok: false, reason: "missing_id" as const };
    if (!n) return { ok: false, reason: "missing_name" as const };

    const res = renamePlaylist(id, n);
    return { ok: true as const, changes: res.changes ?? 0 };
  });

  ipcMain.handle("musicx:deletePlaylist", async (_evt, id: string) => {
    getDb();

    if (!id) return { ok: false, reason: "missing_id" as const };

    const res = deletePlaylist(id);
    return { ok: true as const, changes: res.changes ?? 0 };
  });

  ipcMain.handle("musicx:getPlaylistTrackIds", async (_evt, playlistId: string) => {
    getDb();

    if (!playlistId) return [];
    return getPlaylistTrackIds(playlistId);
  });

  ipcMain.handle("musicx:setPlaylistOrder", async (_evt, playlistId: string, order: string[]) => {
    getDb();

    if (!playlistId)
      return { ok: false, reason: "missing_playlist_id" as const };

    if (!Array.isArray(order))
      return { ok: false, reason: "invalid_order" as const };

    setPlaylistOrder(playlistId, order);

    return { ok: true as const };
  });

  ipcMain.handle("musicx:addTrackToPlaylist", async (_evt, playlistId: string, trackId: string) => {
    getDb();

    if (!playlistId)
      return { ok: false, reason: "missing_playlist_id" as const };

    if (!trackId)
      return { ok: false, reason: "missing_track_id" as const };

    addTrackToPlaylistEnd(playlistId, trackId);

    return { ok: true as const };
  });

  ipcMain.handle("musicx:removeTrackFromPlaylist", async (_evt, playlistId: string, trackId: string) => {
    getDb();

    if (!playlistId)
      return { ok: false, reason: "missing_playlist_id" as const };

    if (!trackId)
      return { ok: false, reason: "missing_track_id" as const };

    const res = removeTrackFromPlaylist(playlistId, trackId);

    return { ok: true as const, changes: res.changes ?? 0 };
  });
}

/* =========================
          HELPERS
========================== */

function fileURLToPathCompat(fileUrl: string) {
  if (fileUrl.startsWith("file://")) return fileURLToPath(fileUrl);
  return fileUrl;
}

function safeName(name: string) {
  return name.replace(/[<>:"/\\|?*\x00-\x1F]/g, "_");
}

function isAudioFile(p: string) {
  const ext = path.extname(p).toLowerCase();
  return [".mp3", ".wav", ".m4a", ".ogg", ".flac", ".aac"].includes(ext);
}

function parseLibraryFilename(filename: string, fullPath: string) {
  const i = filename.indexOf("__");
  if (i > 0) {
    const id = filename.slice(0, i);
    const base = filename.slice(i + 2);
    const title = path.parse(base).name;
    return { id, title };
  }

  const id = crypto.createHash("sha1").update(fullPath).digest("hex");
  const title = path.parse(filename).name;
  return { id, title };
}