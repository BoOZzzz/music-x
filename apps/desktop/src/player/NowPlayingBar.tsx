import { useMusic } from "../state/MusicProvider";
import { fmtTime } from "../state/utils";
import { useAudioPlayer } from "./useAudioPlayer";
import { useEffect } from "react";

export function NowPlayingBar() {
  const { state, dispatch } = useMusic();
  const { currentTrack, controls } = useAudioPlayer();

  const { isPlaying, positionSec, durationSec, volume, repeatMode, shuffleOn } = state.player;

  const cycleRepeat = () => {
    const next = repeatMode === "off" ? "all" : repeatMode === "all" ? "one" : "off";
    dispatch({ type: "SET_REPEAT_MODE", repeatMode: next });
  };

  const repeatLabel = repeatMode === "off" ? "↻" : repeatMode === "all" ? "↻•" : "↻1";

  const disableTransport = !currentTrack;
  const disableShuffle = state.player.queue.length === 0;


  useEffect(() => {
  const onKeyDown = (e: KeyboardEvent) => {
    // Spacebar
    if (e.code !== "Space" && e.key !== " ") return;

    // Don't hijack space when typing/editing
    const el = e.target as HTMLElement | null;
    const tag = el?.tagName?.toLowerCase();
    const isTyping =
      tag === "input" || tag === "textarea" || (el && (el as any).isContentEditable);

    if (isTyping) return;
    e.preventDefault(); // prevent page scroll

    const queue = state.player.queue;
    const queueEmpty = queue.length === 0;
    const hasPlayableCurrent = !!currentTrack;

    // 1) If no queue + no current => start shuffled list (your existing logic)
    if (!hasPlayableCurrent && queueEmpty) {
      // ... your shuffle startup code ...
      return;
    }

    // ✅ 2) If queue exists but nothing loaded yet => start current queue item
    if (!hasPlayableCurrent && !queueEmpty) {
      const idx =
        state.player.queueIndex >= 0 && state.player.queueIndex < queue.length
          ? state.player.queueIndex
          : 0;

      const id = queue[idx];
      if (!id) return;

      dispatch({ type: "SET_QUEUE", queue, queueIndex: idx });
      dispatch({ type: "PLAY_TRACK", trackId: id });
      return;
    }


    if (!currentTrack) return;

    
    controls.toggle();
  };

  window.addEventListener("keydown", onKeyDown);
  return () => window.removeEventListener("keydown", onKeyDown);
  }, [controls,
      currentTrack,
      dispatch,
      state.player.currentTrackId,
      state.player.queue,
      state.libraryOrder,
      state.tracks,
  ]);

  return (
    <div className="npBar">
      {/* Track info */}
      <div className="npInfo">
        <div className="npTitle">{currentTrack ? currentTrack.title : "Nothing playing"}</div>
        <div className="npSub">
          {currentTrack ? "Local file" : "Pick a song from Library"}
        </div>
      </div>

      {/* Controls + seek */}
      <div className="npCenter">
        <div className="npControls">
          <button
            className={`npBtn ${shuffleOn ? "isActive" : ""}`}
            onClick={controls.toggleShuffle}
            disabled={disableShuffle}
            title={shuffleOn ? "Shuffle: On" : "Shuffle: Off"}
            aria-label="Toggle shuffle"
          >
            🔀
          </button>

          <button className="npBtn" onClick={controls.prev} disabled={disableTransport} aria-label="Previous">
            ⏮
          </button>

          <button className="npBtn" onClick={controls.toggle} disabled={disableTransport} aria-label="Play/Pause">
            {isPlaying ? "⏸" : "▶"}
          </button>

          <button className="npBtn" onClick={controls.next} disabled={disableTransport} aria-label="Next">
            ⏭
          </button>

          <button
            className="npBtn"
            onClick={cycleRepeat}
            disabled={disableTransport}
            title={
              repeatMode === "off"
                ? "Repeat: Off"
                : repeatMode === "all"
                ? "Repeat: List"
                : "Repeat: Song"
            }
            aria-label="Cycle repeat mode"
          >
            {repeatLabel}
          </button>
          <button
            className={`npBtn ${state.player.showQueue ? "isActive" : ""}`}
            onClick={() => dispatch({ type: "TOGGLE_QUEUE" })}
            aria-label="Toggle queue"
            title={state.player.showQueue ? "Hide queue" : "Show queue"}
          >
            ☰
          </button>
        </div>

        <div className="npSeek">
          <span className="npTime">{fmtTime(positionSec)}</span>
          <input
            className="npRange"
            type="range"
            min={0}
            max={Math.max(0, durationSec || 0)}
            value={Math.min(positionSec, durationSec || 0)}
            onChange={(e) => controls.seek(Number(e.target.value))}
            disabled={disableTransport}
            aria-label="Seek"
          />
          <span className="npTime">{fmtTime(durationSec)}</span>
        </div>
      </div>
      
      {/* Volume */}
      <div className="npVolume">
        <span className="npVolIcon" aria-hidden>
          🔊
        </span>
        <input
          className="npRange npVolRange"
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={(e) => dispatch({ type: "SET_VOLUME", volume: Number(e.target.value) })}
          aria-label="Volume"
        />
      </div>
    </div>
  );
}