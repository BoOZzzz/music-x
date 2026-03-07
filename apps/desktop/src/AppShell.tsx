import { useMusic } from "./state/MusicProvider";
import { LibraryPage } from "./features/library/LibraryPage";
import { NowPlayingBar } from "./player/NowPlayingBar";
import { QueuePanel } from "./features/queue/QueuePanel";
import { Sidebar } from "./features/sidebar/Sidebar";
import { PlaylistPage } from "./features/library/PlaylistPage";

export function AppShell() {

  const { state, dispatch } = useMusic();
  const queueOpen = state.player.showQueue;
  return (
    <div className="appShell">
      <div className={`appTop ${queueOpen ? "withQueue" : ""}`}>
        <Sidebar />

        <main className="main">
          <div className="mainInner">

            {state.view.kind === "library" && <LibraryPage />}

            {state.view.kind === "playlist" && (
              <PlaylistPage playlistId={state.view.playlistId} />
            )}

            {state.view.kind === "playlists" && <div>Playlists UI next.</div>}
          </div>
        </main>

        <aside className="rightPanel">
          <QueuePanel
            open={queueOpen}
            queue={state.player.queue}
            queueIndex={state.player.queueIndex}
            tracksById={state.tracks}
            onSelect={(idx) => {
              dispatch({
                type: "SET_QUEUE",
                queue: state.player.queue,
                queueIndex: idx,
              });
            }}
            onPlay={(idx) => {
              const queue = state.player.queue;
              const id = queue[idx];
              if (!id) return;

              dispatch({ type: "SET_QUEUE", queue, queueIndex: idx });
              dispatch({ type: "PLAY_TRACK", trackId: id });
            }}
            onRemove={(idx) =>
              dispatch({ type: "REMOVE_FROM_QUEUE", index: idx })
            }
            onPause={() => {
              dispatch({ type: "SET_PLAYING", isPlaying: false });
            }}
            currentTrackId={state.player.currentTrackId}
            isPlaying={state.player.isPlaying}
            
          />
        </aside>
      </div>

      <footer className="playerBar">
        <NowPlayingBar />
      </footer>
    </div>
  );
}
