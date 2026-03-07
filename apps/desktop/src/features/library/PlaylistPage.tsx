// features/library/PlaylistPage.tsx
import { useEffect, useMemo, useState } from "react";
import type { Track } from "../../state/types";
import { useMusic } from "../../state/MusicProvider"; 
import { SongTable } from "./SongTable";

type PlaylistPageProps = {
  playlistId: string;
};

export function PlaylistPage({ playlistId }: PlaylistPageProps) {
  const { state, dispatch } = useMusic();

  const [playlistName, setPlaylistName] = useState("Playlist");
  const [loading, setLoading] = useState(true);
  const [playlistTrackIds, setPlaylistTrackIds] = useState<string[]>([]);

  async function refresh() {
    setLoading(true);
    try {
        if (Object.keys(state.tracks).length === 0) {
        const items = await window.musicx.listLibraryTracks();
        const tracks: Track[] = items.map((it) => ({
            id: it.id,
            title: it.title,
            sourceUrl: `musicx://track?path=${encodeURIComponent(it.fs_path)}`,
            addedAt: it.added_at,
            fsPath: it.fs_path,
        }));
        dispatch({ type: "SET_TRACKS", tracks });
        }

        const playlists = await window.musicx.listPlaylists();
        const current = Array.isArray(playlists)
        ? playlists.find((p) => p.id === playlistId)
        : null;

        setPlaylistName(current?.name ?? "Playlist");

        const ids = await window.musicx.getPlaylistTrackIds(playlistId);
        setPlaylistTrackIds(ids ?? []);
    } finally {
        setLoading(false);
    }
    }

  useEffect(() => {
    void refresh();
  }, [playlistId]);

  const tracks = useMemo(() => {
    return playlistTrackIds
      .map((id) => state.tracks[id])
      .filter((t): t is Track => t !== undefined);
  }, [playlistTrackIds, state.tracks]);

  return (
    <div className="libraryPage">
      <div className="libraryContent">
        <div className="libraryHeader">
          <h2 className="libraryTitle">{playlistName}</h2>
        </div>

        {loading ? (
          <div className="songTableEmpty">Loading…</div>
        ) : (
          <SongTable
            tracks={tracks}
            playlistId={playlistId}
            onRefresh={refresh}
          />
        )}
      </div>
    </div>
  );
}