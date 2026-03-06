// db/playlist_tracks.ts
import { getDb } from "./index";
import type { TrackRow } from "./tracks";
export function getPlaylistTrackIds(playlistId: string): string[] {
  const rows = getDb()
    .prepare(
      `SELECT pt.track_id
       FROM playlist_tracks pt
       JOIN tracks t ON t.id = pt.track_id
       WHERE pt.playlist_id = ?
         AND t.deleted_at IS NULL
       ORDER BY pt.position ASC`
    )
    .all(playlistId) as { track_id: string }[];

  return rows.map((r) => r.track_id);
}

export function listTracksForPlaylist(playlistId: string): TrackRow[] {
  return getDb()
    .prepare(
      `SELECT t.id, t.title, t.fs_path, t.added_at
       FROM playlist_tracks pt
       JOIN tracks t ON t.id = pt.track_id
       WHERE pt.playlist_id = ?
         AND t.deleted_at IS NULL
       ORDER BY pt.position ASC`
    )
    .all(playlistId) as TrackRow[];
}

export function addTrackToPlaylistEnd(playlistId: string, trackId: string) {
  const db = getDb();

  const tx = db.transaction(() => {
    // remove existing row if present (so re-add pushes it to end)
    db.prepare(`DELETE FROM playlist_tracks WHERE playlist_id = ? AND track_id = ?`)
      .run(playlistId, trackId);

    const row = db
      .prepare(`SELECT COUNT(*) AS cnt FROM playlist_tracks WHERE playlist_id = ?`)
      .get(playlistId) as { cnt: number };

    db.prepare(
      `INSERT INTO playlist_tracks (playlist_id, track_id, position, added_at)
       VALUES (?, ?, ?, ?)`
    ).run(playlistId, trackId, row.cnt, Date.now());
  });

  tx();
}

export function removeTrackFromPlaylist(playlistId: string, trackId: string) {
  const db = getDb();

  const tx = db.transaction(() => {
    const res = db
      .prepare(`DELETE FROM playlist_tracks WHERE playlist_id = ? AND track_id = ?`)
      .run(playlistId, trackId);

    normalizePlaylistPositions(playlistId);
    return res;
  });

  return tx();
}

export function setPlaylistOrder(playlistId: string, orderedTrackIds: string[]) {
  const db = getDb();

  // clean list: strings only + unique + non-empty
  const cleaned = Array.from(
    new Set(orderedTrackIds.filter((x) => typeof x === "string" && x.length > 0))
  );

  const tx = db.transaction(() => {
    db.prepare(`DELETE FROM playlist_tracks WHERE playlist_id = ?`).run(playlistId);

    const stmt = db.prepare(
      `INSERT INTO playlist_tracks (playlist_id, track_id, position, added_at)
       VALUES (?, ?, ?, ?)`
    );

    const now = Date.now();
    for (let i = 0; i < cleaned.length; i++) {
      stmt.run(playlistId, cleaned[i], i, now);
    }
  });

  tx();
}

export function removeTrackFromAllPlaylists(trackId: string) {
  const db = getDb();

  const tx = db.transaction(() => {
    const rows = db
      .prepare(
        `SELECT DISTINCT playlist_id
         FROM playlist_tracks
         WHERE track_id = ?`
      )
      .all(trackId) as { playlist_id: string }[];

    const res = db
      .prepare(`DELETE FROM playlist_tracks WHERE track_id = ?`)
      .run(trackId);

    for (const row of rows) {
      normalizePlaylistPositions(row.playlist_id);
    }

    return res;
  });

  return tx();
}

export function ensureTrackInPlaylist(playlistId: string, trackId: string) {
  const db = getDb();

  const exists = db
    .prepare(
      `SELECT 1
       FROM playlist_tracks
       WHERE playlist_id = ? AND track_id = ?`
    )
    .get(playlistId, trackId);

  if (exists) return;

  const row = db
    .prepare(`SELECT COUNT(*) AS cnt FROM playlist_tracks WHERE playlist_id = ?`)
    .get(playlistId) as { cnt: number };

  db.prepare(
    `INSERT INTO playlist_tracks (playlist_id, track_id, position, added_at)
     VALUES (?, ?, ?, ?)`
  ).run(playlistId, trackId, row.cnt, Date.now());
}

export function normalizePlaylistPositions(playlistId: string) {
  const db = getDb();

  const rows = db
    .prepare(
      `SELECT track_id
       FROM playlist_tracks
       WHERE playlist_id = ?
       ORDER BY position ASC, added_at ASC`
    )
    .all(playlistId) as { track_id: string }[];

  const updateStmt = db.prepare(
    `UPDATE playlist_tracks
     SET position = ?
     WHERE playlist_id = ? AND track_id = ?`
  );

  const tx = db.transaction(() => {
    for (let i = 0; i < rows.length; i++) {
      updateStmt.run(i, playlistId, rows[i].track_id);
    }
  });

  tx();
}