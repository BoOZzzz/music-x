// db/tracks.ts
import { getDb } from "./index";

export type TrackRow = {
  id: string;
  title: string;
  fs_path: string;
  added_at: number;
};

export function listTracks(): TrackRow[] {
  return getDb()
    .prepare(
      `SELECT id, title, fs_path, added_at
       FROM tracks
       WHERE deleted_at IS NULL
       ORDER BY added_at DESC`
    )
    .all() as TrackRow[];
}

export function insertTrack(row: TrackRow) {
  getDb()
    .prepare(
      `INSERT INTO tracks (id, title, fs_path, added_at, deleted_at)
       VALUES (@id, @title, @fs_path, @added_at, NULL)`
    )
    .run(row);
}

export function getTrack(id: string): (TrackRow & { deleted_at: number | null }) | undefined {
  return getDb()
    .prepare(`SELECT id, title, fs_path, added_at, deleted_at FROM tracks WHERE id = ?`)
    .get(id) as any;
}

export function softDeleteTrack(id: string) {
  return getDb()
    .prepare(`UPDATE tracks SET deleted_at = ? WHERE id = ? AND deleted_at IS NULL`)
    .run(Date.now(), id);
}


// ✅ NEW: idempotent insert/update by fs_path (revives deleted rows too)
export function upsertTrackByPath(row: TrackRow) {
  getDb()
    .prepare(
      `INSERT INTO tracks (id, title, fs_path, added_at, deleted_at)
       VALUES (@id, @title, @fs_path, @added_at, NULL)
       ON CONFLICT(fs_path) DO UPDATE SET
         -- keep user's edited title
         title = tracks.title,
         deleted_at = NULL`
    )
    .run(row);
}

// ✅ NEW: soft-delete DB rows whose files no longer exist on disk
export function softDeleteTracksMissing(existingPaths: string[]) {
  const db = getDb();
  const keep = new Set(existingPaths);

  const rows = db
    .prepare(`SELECT id, fs_path FROM tracks WHERE deleted_at IS NULL`)
    .all() as { id: string; fs_path: string }[];

  const stmt = db.prepare(`UPDATE tracks SET deleted_at = ? WHERE id = ? AND deleted_at IS NULL`);

  let deleted = 0;
  const tx = db.transaction(() => {
    const now = Date.now();
    for (const r of rows) {
      if (!keep.has(r.fs_path)) {
        const res = stmt.run(now, r.id);
        deleted += res.changes ?? 0;
      }
    }
  });
  tx();

  return { deleted };
}