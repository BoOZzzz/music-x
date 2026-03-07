//LibraryPage.tsx
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

    await refresh();
  };

  const trackList = Object.values(state.tracks);

  useEffect(() => {
    void rescanAndRefresh();
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
        <SongTable
          tracks={trackList}
          playlistId={LIBRARY_PLAYLIST_ID}
          onRefresh={refresh}
        />
      </div>
    </div>
  );
}