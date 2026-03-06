// --------- preload.ts ---------

import { ipcRenderer, contextBridge } from 'electron'

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld('ipcRenderer', {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args
    return ipcRenderer.on(channel, (event, ...args) => listener(event, ...args))
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args
    return ipcRenderer.off(channel, ...omit)
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args
    return ipcRenderer.send(channel, ...omit)
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args
    return ipcRenderer.invoke(channel, ...omit)
  },

  // You can expose other APTs you need here.
  // ...
})

contextBridge.exposeInMainWorld("musicx", {
  pickAudioFile: () => ipcRenderer.invoke("musicx:pickAudioFile"),
  listLibraryTracks: () => ipcRenderer.invoke("musicx:listLibraryTracks"),
  importToLibrary: (fileUrl: string) => ipcRenderer.invoke("musicx:importToLibrary", fileUrl),
  deleteTrack: (id: string) => ipcRenderer.invoke("musicx:deleteTrack", id),
  rescanLibrary: () => ipcRenderer.invoke("musicx:rescanLibrary"),
  updateTrackTitle: (trackId: string, title: string) => ipcRenderer.invoke("musicx:updateTrackTitle", { trackId, title }),
  listPlaylists: () => ipcRenderer.invoke("musicx:listPlaylists"),
  createPlaylist: (name: string) => ipcRenderer.invoke("musicx:createPlaylist", name),
  renamePlaylist: (id: string, name: string) => ipcRenderer.invoke("musicx:renamePlaylist", id, name),
  deletePlaylist: (id: string) => ipcRenderer.invoke("musicx:deletePlaylist", id),
  getPlaylistTrackIds: (playlistId: string) => ipcRenderer.invoke("musicx:getPlaylistTrackIds", playlistId),
  setPlaylistOrder: (playlistId: string, order: string[]) =>
    ipcRenderer.invoke("musicx:setPlaylistOrder", playlistId, order),
  addTrackToPlaylist: (playlistId: string, trackId: string) =>
    ipcRenderer.invoke("musicx:addTrackToPlaylist", playlistId, trackId),
  removeTrackFromPlaylist: (playlistId: string, trackId: string) =>
    ipcRenderer.invoke("musicx:removeTrackFromPlaylist", playlistId, trackId),
  openLibraryFolder: () => ipcRenderer.invoke("musicx:openLibraryDir"),
});

export type DbTrackRow = {
  id: string;
  title: string;
  fs_path: string;
  added_at: number;
};

export type PlaylistRow = {
  id: string;
  name: string;
  created_at: number;
};

export type MusicXAPI = {
  pickAudioFile: () => Promise<string | null>;
  listLibraryTracks: () => Promise<DbTrackRow[]>;
  importToLibrary: (fileUrl: string) => Promise<DbTrackRow>;
  deleteTrack: (id: string) => Promise<{ ok: boolean; deleted: boolean; reason?: string }>;
  rescanLibrary?: () => Promise<{
    ok: boolean;
    libraryDir: string;
    scanned: number;
    deleted: number;
    tracks: DbTrackRow[];
  }>;

  updateTrackTitle: (
    trackId: string,
    title: string
  ) => Promise<{ ok: boolean; changes: number; trackId: string; title: string }>;

  listPlaylists: () => Promise<PlaylistRow[]>;

  createPlaylist: (name: string) => Promise<
    | { ok: true; playlist: PlaylistRow }
    | { ok: false; reason: "missing_name" }
  >;

  renamePlaylist: (id: string, name: string) => Promise<
    | { ok: true; changes: number }
    | { ok: false; reason: "missing_id" | "missing_name" }
  >;

  deletePlaylist: (id: string) => Promise<
    | { ok: true; changes: number }
    | { ok: false; reason: "missing_id" }
  >;

  getPlaylistTrackIds: (playlistId: string) => Promise<string[]>;

  setPlaylistOrder: (playlistId: string, order: string[]) => Promise<
    | { ok: true }
    | { ok: false; reason: "missing_playlist_id" | "invalid_order" }
  >;

  addTrackToPlaylist: (playlistId: string, trackId: string) => Promise<
    | { ok: true }
    | { ok: false; reason: "missing_playlist_id" | "missing_track_id" }
  >;

  removeTrackFromPlaylist: (playlistId: string, trackId: string) => Promise<
    | { ok: true; changes: number }
    | { ok: false; reason: "missing_playlist_id" | "missing_track_id" }
  >;
  openLibraryFolder: () => Promise<void>;
};
