// Sidebar.tsx
import { useState, useEffect, useMemo, useRef } from "react";
import { useMusic } from "../../state/MusicProvider";
import "../../css/sidebar.css";



const LIBRARY_PLAYLIST_ID = "library";

type PlaylistRow = {
  id: string;
  name: string;
  created_at: number;
};

type CtxMenuState =
  | null
  | {
      x: number;
      y: number;
      playlist: PlaylistRow;
    };

export function Sidebar() {
  const { state, dispatch } = useMusic();

  const [showCreate, setShowCreate] = useState(false);
  const [playlistName, setPlaylistName] = useState("");

  const [loadingPlaylists, setLoadingPlaylists] = useState(false);
  const [playlists, setPlaylists] = useState<PlaylistRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [ctxMenu, setCtxMenu] = useState<CtxMenuState>(null);
  const ctxRef = useRef<HTMLDivElement | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PlaylistRow | null>(null);


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
    dispatch({
      type: "NAVIGATE",
      view: { kind: "playlist", playlistId: r.playlist.id },
    });
  };


  const goPlaylist = (id: string) => {
    dispatch({ type: "NAVIGATE", view: { kind: "playlist", playlistId: id } });
  };

  const playlistActive = (id: string) =>
    state.view.kind === "playlist" && state.view.playlistId === id;


  // ---- Context menu handlers ----
  const openCtxMenu = (e: React.MouseEvent, playlist: PlaylistRow) => {
    e.preventDefault();
    e.stopPropagation();

    // Prevent deleting library (even though DB protects it)
    if (playlist.id === LIBRARY_PLAYLIST_ID) return;

    // Use viewport coords; menu is position: fixed
    setCtxMenu({ x: e.clientX, y: e.clientY, playlist });
  };

  const closeCtxMenu = () => setCtxMenu(null);

  useEffect(() => {
    if (!ctxMenu) return;

    const onMouseDown = (ev: MouseEvent) => {
      // close on outside click
      if (!ctxRef.current) return closeCtxMenu();
      if (!ctxRef.current.contains(ev.target as Node)) closeCtxMenu();
    };

    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") closeCtxMenu();
    };

    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [ctxMenu]);

  const requestDeletePlaylist = (playlist: PlaylistRow) => {
  closeCtxMenu();
  setDeleteTarget(playlist);
  };

  const closeDelete = () => setDeleteTarget(null);

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    const id = deleteTarget.id;
    setDeleteTarget(null);

    const r = await window.musicx.deletePlaylist(id);
    if (r.ok === false) return;

    if (state.view.kind === "playlist" && state.view.playlistId === id) {
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
                className={`navBtn playlistBtn ${playlistActive(p.id) ? "active" : ""}`}
                onClick={() => goPlaylist(p.id)}
                onContextMenu={(e) => openCtxMenu(e, p)}
                title={p.name}
              >
                {p.name}
              </button>
            ))}
          </div>
        )}

        <div className="tip">Tip: Pick files to add them to your library.</div>
      </div>
      {/* Context menu */}
      {ctxMenu && (
        <div
          ref={ctxRef}
          className="ctxMenu"
          style={{ left: ctxMenu.x, top: ctxMenu.y }}
          role="menu"
        >
          <button
            className="ctxItem danger"
            onClick={() => requestDeletePlaylist(ctxMenu.playlist)}
          >
            Delete
          </button>
        </div>
      )}
      
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