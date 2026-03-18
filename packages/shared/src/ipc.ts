import type { PlaylistId, TrackId } from "./domain";

export type DbTrackRow = {
  id: TrackId;
  title: string;
  fs_path: string;
  added_at: number;
};

export type PlaylistRow = {
  id: PlaylistId;
  name: string;
  created_at: number;
};

export type DeleteTrackResult = {
  ok: boolean;
  deleted: boolean;
  reason?: string;
};

export type RescanLibraryResult = {
  ok: boolean;
  libraryDir: string;
  scanned: number;
  deleted: number;
  tracks: DbTrackRow[];
};

export type UpdateTrackTitleResult = {
  ok: boolean;
  changes: number;
  trackId: TrackId;
  title: string;
};

export type CreatePlaylistResult =
  | { ok: true; playlist: PlaylistRow }
  | { ok: false; reason: "missing_name" };

export type RenamePlaylistResult =
  | { ok: true; changes: number }
  | { ok: false; reason: "missing_id" | "missing_name" };

export type DeletePlaylistResult =
  | { ok: true; changes: number }
  | { ok: false; reason: "missing_id" };

export type SetPlaylistOrderResult =
  | { ok: true }
  | { ok: false; reason: "missing_playlist_id" | "invalid_order" };

export type AddTrackToPlaylistResult =
  | { ok: true }
  | { ok: false; reason: "missing_playlist_id" | "missing_track_id" };

export type RemoveTrackFromPlaylistResult =
  | { ok: true; changes: number }
  | { ok: false; reason: "missing_playlist_id" | "missing_track_id" };

export type MusicXAPI = {
  pickAudioFile: () => Promise<string | null>;
  listLibraryTracks: () => Promise<DbTrackRow[]>;
  importToLibrary: (fileUrl: string) => Promise<DbTrackRow>;
  deleteTrack: (id: TrackId) => Promise<DeleteTrackResult>;
  rescanLibrary?: () => Promise<RescanLibraryResult>;
  updateTrackTitle: (
    trackId: TrackId,
    title: string
  ) => Promise<UpdateTrackTitleResult>;
  listPlaylists: () => Promise<PlaylistRow[]>;
  createPlaylist: (name: string) => Promise<CreatePlaylistResult>;
  renamePlaylist: (
    id: PlaylistId,
    name: string
  ) => Promise<RenamePlaylistResult>;
  deletePlaylist: (id: PlaylistId) => Promise<DeletePlaylistResult>;
  getPlaylistTrackIds: (playlistId: PlaylistId) => Promise<TrackId[]>;
  setPlaylistOrder: (
    playlistId: PlaylistId,
    order: TrackId[]
  ) => Promise<SetPlaylistOrderResult>;
  addTrackToPlaylist: (
    playlistId: PlaylistId,
    trackId: TrackId
  ) => Promise<AddTrackToPlaylistResult>;
  removeTrackFromPlaylist: (
    playlistId: PlaylistId,
    trackId: TrackId
  ) => Promise<RemoveTrackFromPlaylistResult>;
  openLibraryFolder: () => Promise<void>;
};
