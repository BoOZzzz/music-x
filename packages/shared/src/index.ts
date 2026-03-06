export type TrackSource = "local" | "youtube";

export type Track = {
  id: string;              // stable ID you define (uuid)
  title: string;
  artist?: string;
  album?: string;
  durationSec?: number;
  source: TrackSource;

  // local
  filePath?: string;

  // youtube
  youtubeVideoId?: string;
};
