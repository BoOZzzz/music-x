export type Track = {
  id: string;
  title: string;
  sourceUrl: string;     // file://... or musicx://...
  addedAt: number;
  durationSec?: number;
  fsPath?: string;
};

export type Playlist = {
  id: string;
  name: string;
  trackIds: string[];
  createdAt: number;
};

export type View =
  | { kind: "library" }
  | { kind: "playlists" }
  | { kind: "playlist"; playlistId: string };

export type PlayerState = {
  currentTrackId: string | null;
  isPlaying: boolean;
  volume: number;        // 0..1
  positionSec: number;
  durationSec: number;
  queue: string[];       // array of track IDs
  queueIndex: number;    // index into queue
  repeatMode: "off" | "one" | "all"; // off | loop song | loop list
  shuffleOn: boolean;
  baseQueue: string[];  // unshuffled queue we can restore
  showQueue: boolean;
};

export type MusicState = {
  tracks: Record<string, Track>;
  playlists: Record<string, Playlist>;
  view: View;
  player: PlayerState;
  libraryOrder: string[];
  selectedTrackIds: string[];
};
