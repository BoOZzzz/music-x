// songTable.tsx
import { useMemo, useRef, useState } from "react";
import type { Track } from "../../state/types";
import { useMusic } from "../../state/MusicProvider";
import { fmtTime } from "../../state/utils";
import type { ContextMenuItem } from "../ctxmenu/ContextMenu";
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

  const dragPayloadFor = (trackIds: string[]) =>
    JSON.stringify({
      trackIds,
      fromPlaylistId: playlistId,
  });

  const isSelected = (trackId: string) =>
    state.selectedTrackIds.includes(trackId);

  const getTargetTrackIds = (trackId: string) => {
    return isSelected(trackId) ? state.selectedTrackIds : [trackId];
  };

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

  const buildMenu = async (trackIds: string[]): Promise<ContextMenuItem[]> => {
    if (playlistsRef.current.length === 0) {
      const playlists = await window.musicx.listPlaylists();
      playlistsRef.current = playlists.filter(p => p.id !== LIBRARY_PLAYLIST_ID);
    }

    const visible = playlistsRef.current;
    const count = trackIds.length;

    if (playlistId === LIBRARY_PLAYLIST_ID) {
      return [
        {
          label: count > 1 ? `Add ${count} to playlist` : "Add to playlist",
          submenu: visible.map((p) => ({
            label: p.name,
            onClick: async () => {
              for (const trackId of trackIds) {
                const res = await window.musicx.addTrackToPlaylist(p.id, trackId);
                if (!res?.ok) {
                  console.log("Add to playlist failed:", trackId, res?.reason);
                }
              }
            },
          })),
        },
        {
          label: count > 1 ? `Delete ${count} tracks` : "Delete",
          danger: true,
          onClick: async () => {
            for (const trackId of trackIds) {
              const res = await window.musicx.deleteTrack(trackId);

              if (!res.ok) {
                console.log("Delete failed:", trackId, res?.reason);
              }
            }

            await onRefresh?.();
            dispatch({ type: "CLEAR_SELECTED_TRACKS" });
          },
        },
      ];
    }

    return [
      {
        label: count > 1 ? `Remove ${count} from playlist` : "Remove from playlist",
        danger: true,
        onClick: async () => {
          for (const trackId of trackIds) {
            const res = await window.musicx.removeTrackFromPlaylist(playlistId, trackId);

            if (!res.ok) {
              console.log("Remove failed:", trackId, res?.reason);
            }
          }

          await onRefresh?.();
          dispatch({ type: "CLEAR_SELECTED_TRACKS" });
        },
      },
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
        const rowSelected = isSelected(t.id);
        return (
          <div
            key={t.id}
            className={[
              "songRow",
              isCurrent ? "isCurrent" : "",
              rowSelected ? "isSelected" : "",
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

              const targetIds = getTargetTrackIds(t.id);

              // if right-clicking an unselected row, make it the active selection
              if (!isSelected(t.id)) {
                dispatch({ type: "SET_SELECTED_TRACKS", trackIds: [t.id] });
              }

              const items = await buildMenu(targetIds);

              showContextMenu({
                x: e.clientX,
                y: e.clientY,
                items,
              });
            }}
            onClick={(e) => {
              if (isDraggingRef.current) return;

              if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                e.stopPropagation();
                dispatch({ type: "TOGGLE_SELECTED_TRACK", trackId: t.id });
                return;
              }

              // optional: normal click makes this the only selected row
              dispatch({ type: "SET_SELECTED_TRACKS", trackIds: [t.id] });
            }}
          >
            <span
              className={`dragHandle ${isEditing ? "disabled" : ""}`}
              draggable={!isEditing}
              onDragStart={(e) => {
                if (isEditing) return;
                const targetIds = getTargetTrackIds(t.id);
                isDraggingRef.current = true;
                setDragIndex(i);
                setOverIndex(i);
                e.dataTransfer.effectAllowed = "copyMove";
                e.dataTransfer.setData("text/plain", String(i));
                e.dataTransfer.setData(
                  "application/x-musicx-track",
                  dragPayloadFor(targetIds)
                );
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