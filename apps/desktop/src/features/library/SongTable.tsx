// songTable.tsx
import { useMemo, useRef, useState, useEffect } from "react";
import type { Track } from "../../state/types";
import { useMusic } from "../../state/MusicProvider";
import { fmtTime } from "../../state/utils";

const LIBRARY_PLAYLIST_ID = "library";

function moveItem<T>(arr: T[], from: number, to: number) {
  const copy = arr.slice();
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

export function SongTable({ tracks }: { tracks: Track[] }) {
  const { state, dispatch } = useMusic();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");

  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const [ctx, setCtx] = useState<null | { x: number; y: number; trackId: string }>(null);

  const isDraggingRef = useRef(false);
  
  useEffect(() => {
    const onDown = () => setCtx(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCtx(null);
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, []);
  
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

      setEditingId(null);
      setDraftTitle("");
    } catch (e) {
      console.error("Failed to update title:", e);
    }
  };

  const displayTracks = useMemo(() => {
    const order = state.libraryOrder;
    if (!order || order.length === 0) return tracks;

    const byId: Record<string, Track> = {};
    for (const t of tracks) byId[t.id] = t;

    const ordered = order.map((id) => byId[id]).filter(Boolean);

    const inOrder = new Set(order);
    const leftovers = tracks.filter((t) => !inOrder.has(t.id));
    return ordered.concat(leftovers);
  }, [state.libraryOrder, tracks]);

  const commitDisplayReorder = async (from: number, to: number) => {
    if (from === to) return;

    const visibleIds = displayTracks.map((t) => t.id);

    const currentOrder = state.libraryOrder.length
      ? [
          ...state.libraryOrder.filter((id) => visibleIds.includes(id)),
          ...visibleIds.filter((id) => !state.libraryOrder.includes(id)),
        ]
      : visibleIds;

    if (from < 0 || to < 0 || from >= currentOrder.length || to >= currentOrder.length) return;

    const next = moveItem(currentOrder, from, to);

    // ✅ update UI immediately
    dispatch({ type: "SET_LIBRARY_ORDER", order: next });
    console.log("lib order change success");

    // ✅ persist to DB
    const res = await window.musicx.setPlaylistOrder(LIBRARY_PLAYLIST_ID, next);
    if (!res?.ok) {
      console.warn("Failed to persist order:", res?.reason);
    }
  };

  if (tracks.length === 0) {
    return <div className="songTableEmpty">No songs yet.</div>;
  }

  

  return (
    <div className="songTableCard">
      <div className="songTableHeader">
        <div />
        <div>Title</div>
        <div className="colDurationHeader">Duration</div>
        <div className="colMoreHeader" />
        <div className="colActionsHeader" />
      </div>

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
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (isDraggingRef.current) return;
              setCtx({ x: e.clientX, y: e.clientY, trackId: t.id });
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
      {ctx && (
        <div
          className="ctxMenu"
          style={{ left: ctx.x, top: ctx.y }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button
            className="ctxItem danger"
            onClick={async (e) => {
              e.stopPropagation();
              setCtx(null);

              const res = await window.musicx.deleteTrack(ctx.trackId);
              if (res.ok) {
                const items = await window.musicx.listLibraryTracks();
                const nextTracks = items.map((it) => ({
                  id: it.id,
                  title: it.title,
                  sourceUrl: `musicx://track?path=${encodeURIComponent(it.fs_path)}`,
                  addedAt: it.added_at,
                  fsPath: it.fs_path,
                }));
                dispatch({ type: "SET_TRACKS", tracks: nextTracks });
              } else {
                console.log("Delete failed:", res.reason);
              }
            }}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}