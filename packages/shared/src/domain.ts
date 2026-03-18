export type TrackSource = "local" | "youtube";

export type TrackId = string;
export type PlaylistId = string;
export type RepeatMode = "off" | "one" | "all";

export type Track = {
  id: TrackId;
  title: string;
  source: TrackSource;
  sourceUrl: string;
  addedAt: number;
  durationSec?: number;
  fsPath?: string;
  artist?: string;
  album?: string;
  youtubeVideoId?: string;
};

export type PlaylistSummary = {
  id: PlaylistId;
  name: string;
  createdAt: number;
};

export type Playlist = PlaylistSummary & {
  trackIds: TrackId[];
};

export type View =
  | { kind: "library" }
  | { kind: "playlists" }
  | { kind: "playlist"; playlistId: PlaylistId };

export type PlayerState = {
  currentTrackId: TrackId | null;
  isPlaying: boolean;
  volume: number;
  positionSec: number;
  durationSec: number;
  queue: TrackId[];
  queueIndex: number;
  repeatMode: RepeatMode;
  shuffleOn: boolean;
  baseQueue: TrackId[];
  showQueue: boolean;
};

export type MusicState = {
  tracks: Record<TrackId, Track>;
  playlists: Record<PlaylistId, Playlist>;
  view: View;
  player: PlayerState;
  libraryOrder: TrackId[];
  selectedTrackIds: TrackId[];
};
