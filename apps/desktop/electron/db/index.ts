// db/index.ts
import { app } from "electron";
import path from "node:path";
import Database from "better-sqlite3";

let db: Database.Database | null = null;

export function getDb() {
  if (!db) {
    const dbPath = path.join(app.getPath("userData"), "musicx.db");
    db = new Database(dbPath);
    console.log("database directory:", db);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");

    db.exec(`
      CREATE TABLE IF NOT EXISTS meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS tracks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        fs_path TEXT NOT NULL UNIQUE,
        added_at INTEGER NOT NULL,
        deleted_at INTEGER
      );

      CREATE INDEX IF NOT EXISTS idx_tracks_added_at ON tracks(added_at);
      CREATE INDEX IF NOT EXISTS idx_tracks_deleted_at ON tracks(deleted_at);

      CREATE TABLE IF NOT EXISTS playlists (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );

      /* ✅ NEW: ordered membership */
      CREATE TABLE IF NOT EXISTS playlist_tracks (
        playlist_id TEXT NOT NULL,
        track_id TEXT NOT NULL,
        position INTEGER NOT NULL,
        added_at INTEGER NOT NULL,
        PRIMARY KEY (playlist_id, track_id),
        FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
        FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_playlist_tracks_playlist_position
        ON playlist_tracks (playlist_id, position);

      /* ✅ Ensure default Library playlist exists */
      INSERT OR IGNORE INTO playlists (id, name, created_at)
      VALUES ('library', 'Library', strftime('%s','now') * 1000);

      INSERT OR IGNORE INTO meta(key,value) VALUES ('schema_version','1');
    `);
    
  }
  
  return db;
}

export function closeDb() {
  db?.close();
  db = null;
}
