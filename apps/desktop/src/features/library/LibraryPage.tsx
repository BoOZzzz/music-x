import { useEffect } from "react";
import { useMusic } from "../../state/MusicProvider";
import type { Track } from "../../state/types";
import { SongTable } from "./SongTable";

const LIBRARY_PLAYLIST_ID = "library";

function toMusicxUrlFromFsPath(fsPath: string) {
  return `musicx://track?path=${encodeURIComponent(fsPath)}`;
}

export function LibraryPage() {
  const { state, dispatch } = useMusic();

  const isLibrarySelected = state.view.kind === "library";

  const openLibraryFolder = async () => {
    await window.musicx.openLibraryFolder();
  };

  async function refresh() {
    const items = await window.musicx.listLibraryTracks();

    const tracks: Track[] = items.map((it) => ({
      id: it.id,
      title: it.title,
      sourceUrl: toMusicxUrlFromFsPath(it.fs_path),
      addedAt: it.added_at,
      fsPath: it.fs_path,
    }));

    dispatch({ type: "SET_TRACKS", tracks });
    await loadPersistedOrder();
  }

  async function loadPersistedOrder() {
    const ids = await window.musicx.getPlaylistTrackIds(LIBRARY_PLAYLIST_ID);
    dispatch({ type: "SET_LIBRARY_ORDER", order: ids ?? [] });
  }

  
  async function rescanAndRefresh() {
    if (window.musicx.rescanLibrary) {
      await window.musicx.rescanLibrary();
    }
    await refresh();
  }

  const addSong = async () => {
    const fileUrl = await window.musicx.pickAudioFile();
    if (!fileUrl) return;

    const row = await window.musicx.importToLibrary(fileUrl);
    if (!row) {
      console.log("Import failed: unknown");
      return;
    }

    const track: Track = {
      id: row.id,
      title: row.title,
      sourceUrl: toMusicxUrlFromFsPath(row.fs_path),
      addedAt: row.added_at,
      fsPath: row.fs_path,
    };

    dispatch({ type: "ADD_TRACK", track });
    dispatch({ type: "PLAY_TRACK", trackId: track.id });

    await refresh();
    // optional: reload order so newly added track gets placed properly
    await loadPersistedOrder();
  };

  const trackList = Object.values(state.tracks);

  useEffect(() => {
    (async () => {
      await rescanAndRefresh();
      await loadPersistedOrder();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="libraryPage">
      <div className="libraryContent">
        <div className="libraryHeader">
          <h2 className="libraryTitle">Library</h2>
          <div className="libraryActions">
            {isLibrarySelected && (
              <button className="primaryBtn" onClick={openLibraryFolder}>
                Open folder
              </button>
            )}
            <button className="primaryBtn" onClick={addSong}>
              Upload songs
            </button>
          </div>
        </div>
        <SongTable tracks={trackList} />
      </div>
    </div>
  );
}