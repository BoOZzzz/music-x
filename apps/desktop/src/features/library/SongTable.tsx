// songTable.tsx
import { useMemo, useRef, useState } from "react";
import type { Track } from "../../state/types";
import { useMusic } from "../../state/MusicProvider";
import { fmtTime } from "../../state/utils";
import { ContextMenuItem } from "../ctxmenu/ContextMenu";
import { useGlobalContextMenu } from "../ctxmenu/GlobalContextMenu";


const LIBRARY_PLAYLIST_ID = "library";

type PlaylistRow = {
  id: string;
  name: string;
  created_at: number;
};

type SongTableProps = {
  tracks: Track[];
  playlistId?: string; // defaults to library
  onRefresh?: () => Promise<void>;
};


function moveItem<T>(arr: T[], from: number, to: number) {
  const copy = arr.slice();
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

export function SongTable({
  tracks,
  playlistId = LIBRARY_PLAYLIST_ID,
  onRefresh,
}: SongTableProps) {
  const { state, dispatch } = useMusic();
  const { showContextMenu } = useGlobalContextMenu();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);


  const playlistsRef = useRef<PlaylistRow[]>([]);
  const isDraggingRef = useRef(false);


  
  const startEdit = (t: Track) => {
    if (isDraggingRef.current) return;
    setEditingId(t.id);
    setDraftTitle(t.title ?? "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraftTitle("");
  };

  const saveEdit = async () => {
    if (!editingId) return;

    const next = draftTitle.trim();
    if (!next) return;

    try {
      await window.musicx.updateTrackTitle(editingId, next);
      dispatch({ type: "UPDATE_TRACK", trackId: editingId, patch: { title: next } });
      await onRefresh?.();
      setEditingId(null);
      setDraftTitle("");
    } catch (e) {
      console.error("Failed to update title:", e);
    }
  };

  const displayTracks = useMemo(() => {
    return tracks;
  }, [tracks]);

  const commitDisplayReorder = async (from: number, to: number) => {
    if (from === to) return;

    const ids = displayTracks.map((t) => t.id);
    if (from < 0 || to < 0 || from >= ids.length || to >= ids.length) return;

    const next = moveItem(ids, from, to);

    const res = await window.musicx.setPlaylistOrder(playlistId, next);
    if (!res?.ok) {
      console.warn("Failed to persist order:", res?.reason);
      return;
    }

    if (onRefresh) {
      await onRefresh();
    }
  };

  const buildMenu = async (trackId: string): Promise<ContextMenuItem[]> => {
    if (playlistsRef.current.length === 0) {
      const playlists = await window.musicx.listPlaylists();
      playlistsRef.current = playlists.filter(p => p.id !== LIBRARY_PLAYLIST_ID);
    }

    const visible = playlistsRef.current;

    if (playlistId === LIBRARY_PLAYLIST_ID) {
      return [
        {
          label: "Add to playlist",
          submenu: visible.map((p) => ({
            label: p.name,
            onClick: async () => {
              const res = await window.musicx.addTrackToPlaylist(p.id, trackId);

              if (!res?.ok) {
                console.log("Add to playlist failed:", res?.reason);
              }
            },
          })),
        },
        {
          label: "Delete",
          danger: true,
          onClick: async () => {
            const res = await window.musicx.deleteTrack(trackId);

            if (res.ok) {
              await onRefresh?.();
            } else {
              console.log("Delete failed:", res?.reason);
            }
          },
        }
      ];
    }

    return [
      {
        label: "Remove from playlist",
        danger: true,
        onClick: async () => {
          const res = await window.musicx.removeTrackFromPlaylist(
            playlistId,
            trackId
          );

          if (res.ok) await onRefresh?.();
        }
      }
    ];
  };

  return (
    <div className="songTableCard">
      <div className="songTableHeader">
        <div />
        <div>Title</div>
        <div className="colDurationHeader">Duration</div>
        <div className="colMoreHeader" />
        <div className="colActionsHeader" />
      </div>

      {displayTracks.length === 0 && (
        <div className="songTableEmpty">
          This playlist has no songs.
        </div>
      )}

      {displayTracks.map((t, i) => {
        const isCurrent = state.player.currentTrackId === t.id;
        const isEditing = editingId === t.id;
        const isDropTarget = overIndex === i && dragIndex !== null && dragIndex !== i;

        return (
          <div
            key={t.id}
            className={[
              "songRow",
              isCurrent ? "isCurrent" : "",
              isDropTarget ? "dropTarget" : "",
              dragIndex === i ? "dragging" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onDragOver={(e) => {
              if (dragIndex === null) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              if (overIndex !== i) setOverIndex(i);
            }}
            onDrop={(e) => {
              e.preventDefault();
              const from = dragIndex ?? Number(e.dataTransfer.getData("text/plain"));
              const to = i;

              setDragIndex(null);
              setOverIndex(null);
              document.body.style.cursor = "";
              queueMicrotask(() => (isDraggingRef.current = false));

              if (Number.isFinite(from) && Number.isFinite(to)) {
                void commitDisplayReorder(from, to);
              }
            }}
            onDoubleClick={() => {
              if (isDraggingRef.current) return;

              const queue = displayTracks.map((x) => x.id);
              const idx = queue.indexOf(t.id);
              dispatch({ type: "SET_QUEUE", queue, queueIndex: Math.max(0, idx) });
              dispatch({ type: "PLAY_TRACK", trackId: t.id });
            }}
            onContextMenu={async (e) => {
              e.preventDefault();
              e.stopPropagation();
              if (isDraggingRef.current) return;

              const items = await buildMenu(t.id);   
              showContextMenu({
                x: e.clientX,
                y: e.clientY,
                items,
              });
            }}
          >
            <span
              className={`dragHandle ${isEditing ? "disabled" : ""}`}
              draggable={!isEditing}
              onDragStart={(e) => {
                if (isEditing) return;
                isDraggingRef.current = true;
                setDragIndex(i);
                setOverIndex(i);
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", String(i));
                document.body.style.cursor = "grabbing";
              }}
              onDragEnd={() => {
                setDragIndex(null);
                setOverIndex(null);
                document.body.style.cursor = "";
                queueMicrotask(() => (isDraggingRef.current = false));
              }}
              onMouseDown={(e) => e.stopPropagation()}
              title="Drag to reorder"
              aria-label="Drag to reorder"
            >
              ⋮⋮
            </span>

            <div className="titleCell">
              {isEditing ? (
                <input
                  className="titleInput"
                  autoFocus
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveEdit();
                    if (e.key === "Escape") cancelEdit();
                  }}
                  onBlur={saveEdit}
                />
              ) : (
                <div
                  className="titleText"
                  title={t.title}
                  onMouseDown={(e) => e.stopPropagation()}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    startEdit(t);
                  }}
                >
                  {t.title}
                </div>
              )}
            </div>

            <div className="colDuration">{t.durationSec ? fmtTime(t.durationSec) : "—"}</div>

          </div>
        );
      })}
      
    </div>
  );
}