// Sidebar.tsx
import { useState, useEffect, useMemo } from "react";
import { useMusic } from "../../state/MusicProvider";
import { useGlobalContextMenu } from "../ctxmenu/GlobalContextMenu";
import type { ContextMenuItem } from "../ctxmenu/ContextMenu";
import "../../css/sidebar.css";



const LIBRARY_PLAYLIST_ID = "library";

type PlaylistRow = {
  id: string;
  name: string;
  created_at: number;
};


export function Sidebar() {
  const { state, dispatch } = useMusic();
  const { showContextMenu } = useGlobalContextMenu();
  const [showCreate, setShowCreate] = useState(false);
  const [playlistName, setPlaylistName] = useState("");

  const [loadingPlaylists, setLoadingPlaylists] = useState(false);
  const [playlists, setPlaylists] = useState<PlaylistRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PlaylistRow | null>(null);
  const [dropTargetPlaylistId, setDropTargetPlaylistId] = useState<string | null>(null);


  const openCreate = () => {
    setPlaylistName("");
    setShowCreate(true);
  };

  

  const closeCreate = () => setShowCreate(false);

  const loadPlaylists = async () => {
    setLoadingPlaylists(true);
    setLoadError(null);
    try {
      const rows = await window.musicx.listPlaylists();
      setPlaylists(Array.isArray(rows) ? rows : []);
    } catch (e: any) {
      setLoadError(e?.message ?? "Failed to load playlists");
      setPlaylists([]);
    } finally {
      setLoadingPlaylists(false);
    }
  };

  useEffect(() => {
    void loadPlaylists();
  }, []);

  const visiblePlaylists = useMemo(() => {
    return playlists
      .filter((p) => p.id !== LIBRARY_PLAYLIST_ID)
      .slice()
      .sort((a, b) => a.created_at - b.created_at);
  }, [playlists]);

  const submitCreate = async () => {
    const name = playlistName.trim();
    if (!name) return;

    const r = await window.musicx.createPlaylist(name);
    if (r.ok === false) return;

    closeCreate();

    // refresh list so new playlist appears
    await loadPlaylists();

    // navigate directly to the created playlist
    dispatch({ type: "CLEAR_SELECTED_TRACKS" });
    dispatch({
      type: "NAVIGATE",
      view: { kind: "playlist", playlistId: r.playlist.id },
    });
  };


  const goPlaylist = (id: string) => {
    dispatch({ type: "CLEAR_SELECTED_TRACKS" });
    dispatch({ type: "NAVIGATE", view: { kind: "playlist", playlistId: id } });
  };

  const playlistActive = (id: string) =>
    state.view.kind === "playlist" && state.view.playlistId === id;

  const requestDeletePlaylist = (playlist: PlaylistRow) => {
    setDeleteTarget(playlist);
  };

  const openCtxMenu = (e: React.MouseEvent, playlist: PlaylistRow) => {
    e.preventDefault();
    e.stopPropagation();

    if (playlist.id === LIBRARY_PLAYLIST_ID) return;
    // CHANGE: still guard library from deletion

    const items: ContextMenuItem[] = [
      {
        label: "Delete",
        danger: true,
        onClick: () => {
          requestDeletePlaylist(playlist);
        },
      },
    ];

    showContextMenu({
      x: e.clientX,
      y: e.clientY,
      items,
    });
  };

  const hasDraggedTrack = (e: React.DragEvent) => {
    return Array.from(e.dataTransfer.types).includes("application/x-musicx-track");
  };

  const readDraggedTrack = (e: React.DragEvent) => {
    const raw = e.dataTransfer.getData("application/x-musicx-track");
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw) as {
        trackIds?: string[];
        fromPlaylistId?: string;
      };

      if (!Array.isArray(parsed.trackIds) || parsed.trackIds.length === 0) {
        return null;
      }

      return parsed;
    } catch {
      return null;
    }
  };

  const handlePlaylistDragOver = (e: React.DragEvent, playlistId: string) => {
    if (!hasDraggedTrack(e)) return;
    

    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setDropTargetPlaylistId(playlistId);
  };

  const handlePlaylistDragLeave = (e: React.DragEvent, playlistId: string) => {
    const related = e.relatedTarget as Node | null;
    if (related && e.currentTarget.contains(related)) return;
    // CHANGE: ignore leave events caused by moving inside the same button

    setDropTargetPlaylistId((current) =>
      current === playlistId ? null : current
    );
  };

  const handlePlaylistDrop = async (e: React.DragEvent, playlist: PlaylistRow) => {
    e.preventDefault();
    setDropTargetPlaylistId(null);
    
    const payload = readDraggedTrack(e);
    if (!payload?.trackIds?.length) return;

    if (payload.fromPlaylistId === playlist.id) return;

    for (const trackId of payload.trackIds) {
      const res = await window.musicx.addTrackToPlaylist(playlist.id, trackId);

      if (!res?.ok) {
        console.log("Add to playlist failed:", trackId, res?.reason);
      }
    }

    // Optional behavior:
    // if the target playlist is currently open, re-navigate so your existing
    // playlist page flow can refresh/reload its contents
    if (state.view.kind === "playlist" && state.view.playlistId === playlist.id) {
      dispatch({ type: "CLEAR_SELECTED_TRACKS" });
      dispatch({
        type: "NAVIGATE",
        view: { kind: "playlist", playlistId: playlist.id },
      });
    }
  };

  const closeDelete = () => setDeleteTarget(null);

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    const id = deleteTarget.id;
    setDeleteTarget(null);

    const r = await window.musicx.deletePlaylist(id);
    if (r.ok === false) return;

    if (state.view.kind === "playlist" && state.view.playlistId === id) {
      dispatch({ type: "CLEAR_SELECTED_TRACKS" });
      dispatch({ type: "NAVIGATE", view: { kind: "library" } });
    }

    await loadPlaylists();
  };
  return (
    <aside className="sidebar">
      <div className="sidebarInner">
        <div className="brandRow">
          <div className="brand">Music-X</div>
          <button className="createBtn" onClick={openCreate}>
            + Create
          </button>
        </div>

        <button
          className={`navBtn ${state.view.kind === "library" ? "active" : ""}`}
          onClick={() => dispatch({ type: "NAVIGATE", view: { kind: "library" } })}
        >
          Library
        </button>

        <div className="sectionHeaderRow">
          <div className="sectionHeader">Playlists</div>
          <button
            className="ghostMiniBtn"
            onClick={() => void loadPlaylists()}
            disabled={loadingPlaylists}
            title="Refresh playlists"
          >
            {loadingPlaylists ? "…" : "↻"}
          </button>
        </div>

        {loadError ? (
          <div className="emptyHint">{loadError}</div>
        ) : visiblePlaylists.length === 0 ? (
          <div className="emptyHint">
            {loadingPlaylists ? "Loading…" : "No playlists yet. Click + Create to add one."}
          </div>
        ) : (
          <div className="playlistList">
            {visiblePlaylists.map((p) => (
              <button
                key={p.id}
                className={`navBtn playlistBtn ${playlistActive(p.id) ? "active" : ""} ${
                  dropTargetPlaylistId === p.id ? "dropTarget" : ""
                }`}
                onClick={() => goPlaylist(p.id)}
                onContextMenu={(e) => openCtxMenu(e, p)}
                onDragOver={(e) => handlePlaylistDragOver(e, p.id)}
                // CHANGE: allows dragged songs to hover over playlists

                onDragLeave={(e) => handlePlaylistDragLeave(e, p.id)}
                // CHANGE: remove highlight when cursor leaves playlist

                onDrop={(e) => void handlePlaylistDrop(e, p)}
                // CHANGE: dropping a song here adds it to this playlist
                title={p.name}
              >
                {p.name}
              </button>
            ))}
          </div>
        )}

        <div className="tip">Tip: Pick files to add them to your library.</div>
      </div>
      
      
      {deleteTarget && (
        <div className="modalOverlay" onMouseDown={closeDelete}>
          <div className="modalCard" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modalTitle">Delete playlist</div>

            <div className="modalBody">
              Are you sure you want to delete <b>{deleteTarget.name}</b>?
              <div className="modalSubtle">
                Songs will remain in your library.
              </div>
            </div>

            <div className="modalActions">
              <button className="ghostBtn" onClick={closeDelete}>
                Cancel
              </button>
              <button className="dangerBtn" onClick={() => void confirmDelete()}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      {showCreate && (
        <div className="modalOverlay" onMouseDown={closeCreate}>
          <div className="modalCard" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modalTitle">New playlist</div>

            <input
              className="modalInput"
              autoFocus
              value={playlistName}
              placeholder="Playlist name"
              onChange={(e) => setPlaylistName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") closeCreate();
                if (e.key === "Enter") void submitCreate();
              }}
            />

            <div className="modalActions">
              <button className="ghostBtn" onClick={closeCreate}>
                Cancel
              </button>
              <button className="primaryBtn" onClick={() => void submitCreate()}>
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}