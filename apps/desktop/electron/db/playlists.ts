// db/playlists.ts
import { getDb } from "./index";
import { randomUUID } from "node:crypto";

export type PlaylistRow = {
  id: string;
  name: string;
  created_at: number;
};

export const LIBRARY_PLAYLIST_ID = "library";

export function listPlaylists(): PlaylistRow[] {
  return getDb()
    .prepare(`SELECT id, name, created_at FROM playlists ORDER BY created_at ASC`)
    .all() as PlaylistRow[];
}

export function createPlaylist(name: string): PlaylistRow {
  const id = randomUUID();
  const created_at = Date.now();

  getDb()
    .prepare(`INSERT INTO playlists (id, name, created_at) VALUES (?, ?, ?)`)
    .run(id, name, created_at);

  return { id, name, created_at };
}

export function renamePlaylist(id: string, name: string) {
  return getDb().prepare(`UPDATE playlists SET name = ? WHERE id = ?`).run(name, id);
}

export function deletePlaylist(id: string) {
  // protect library
  if (id === LIBRARY_PLAYLIST_ID) return { changes: 0 };
  return getDb().prepare(`DELETE FROM playlists WHERE id = ?`).run(id);
}