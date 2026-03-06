import type { Track } from "../../state/types";
import "../../css/QueuePanel.css";

type Props = {
  open: boolean;
  queue: string[];
  queueIndex: number;
  tracksById: Record<string, Track>;
  onSelect: (index: number) => void;
  onPlay: (index: number) => void;
  onRemove: (index: number) => void;
  onPause: () => void;
  currentTrackId: string | null;
  isPlaying: boolean;
};

export function QueuePanel({ open, queue, queueIndex, tracksById, onSelect, onRemove, onPlay, onPause, currentTrackId, isPlaying }: Props) {
  if (!open) return null;

  return (
    <div className="queuePanel">
      <div className="queueHeader">Queue</div>

      {queue.length === 0 ? (
        <div className="queueEmpty">Queue is empty.</div>
      ) : (
        <div className="queueList">
          {queue.map((id, idx) => {
            const t = tracksById[id];
            if (!t) return null;

            const isCurrent = idx === queueIndex;

            return (
              <div key={`${id}-${idx}`} className="queueRow">
                <button
                className={`queueItem ${isCurrent ? "isCurrent" : ""}`}
                onClick={() => onSelect(idx)}           
                onDoubleClick={() => {
                    const trackId = queue[idx];
                    if (!trackId) return;

                    // If double-clicking the currently playing track → stop
                    if (trackId === currentTrackId && isPlaying) {
                        onPause();
                        return;
                    }

                    // Otherwise play it
                    onPlay(idx);
                }}
                title={t.title}
                >
                <div className="queueItemInner">
                    <span className="queueTitle">
                    {isCurrent ? "▶ " : ""}
                    {t.title}
                    </span>
                    <span className="queueNumber">{idx + 1}</span>
                </div>
                </button>

                <button
                  className="queueRemove"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(idx);
                  }}
                  title="Remove from queue"
                  aria-label="Remove from queue"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}