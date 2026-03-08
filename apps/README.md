# Music-X

Music-X is a desktop music player built with **Electron + React +
TypeScript** focused on fast local music library management, playlist
workflows, and a clean UI.

------------------------------------------------------------------------

# Features

## Library Management

-   Import and manage a local music library
-   Track metadata stored in SQLite
-   Editable song titles
-   Fast library loading
-   Persistent track database

## Playlists

-   Create playlists
-   Delete playlists
-   Rename playlists
-   Add tracks to playlists
-   Remove tracks from playlists
-   Playlist order persistence
-   Automatic refresh when playlist contents change

## Drag and Drop

Tracks can be dragged directly within the UI: - Drag tracks to reorder
playlist - Drag tracks onto playlists in the sidebar - Drop to add songs
to playlists - Visual drop indicators - Multi-track drag support

## Multi-Track Selection

Tracks support multi-selection using:

Ctrl + Click

Actions supported: - Add multiple tracks to playlists - Delete multiple
tracks - Remove multiple tracks from playlists - Drag multiple tracks to
playlists

## Context Menu System

Right-click on tracks to open a dynamic context menu.

Features: - Add track(s) to playlist - Delete track(s) - Remove track(s)
from playlist - Nested submenu for playlists

Implemented using a global context menu manager.

## Player Controls

Playback includes: - Play / Pause - Next / Previous - Seek bar - Volume
control - Repeat modes (off, repeat all, repeat one) - Shuffle toggle

## Song Table

Interactive track table with: - Inline title editing - Drag reorder -
Current track highlighting - Duration display - Context menu support -
Multi-select support

------------------------------------------------------------------------

# Persistent Storage

Music-X uses SQLite (better-sqlite3) for fast local storage.

Main tables: - tracks - playlists - playlist_tracks - meta

Features: - WAL mode enabled - Foreign key enforcement - Playlist order
persistence

------------------------------------------------------------------------

# Architecture

Electron │ ├── Main Process │ database │ filesystem │ IPC handlers │ ├──
Preload │ secure API bridge │ └── Renderer (React) UI state management
audio player

------------------------------------------------------------------------

# State Management

Global state handled by:

MusicProvider (React Context)

Responsible for: - Player state - Queue state - Selected tracks - App
navigation - Library state

------------------------------------------------------------------------

# Key Components

-   Sidebar
-   SongTable
-   NowPlayingBar
-   QueuePanel
-   LibraryPage

------------------------------------------------------------------------

# Technologies

Frontend - React - TypeScript - Vite

Desktop - Electron

Database - SQLite - better-sqlite3

------------------------------------------------------------------------

# Development

Install dependencies:

pnpm install

Run development:

pnpm run dev

------------------------------------------------------------------------

# Current Features

✔ Local library\
✔ Playlist system\
✔ Drag-drop playlist management\
✔ Multi-select tracks\
✔ Context menu system\
✔ Inline metadata editing\
✔ Playback controls\
✔ SQLite persistent database

------------------------------------------------------------------------

# Planned Features

-   Album / artist grouping
-   Metadata editing
-   Smart playlists
-   Search
-   Artwork support
-   Queue improvements
-   Audio visualization
-   Folder monitoring
-   Cloud sync

------------------------------------------------------------------------

# Motivation

Music-X was built to explore modern desktop app architecture using
Electron, React, and SQLite while creating a fast local music manager
with powerful UI workflows.
