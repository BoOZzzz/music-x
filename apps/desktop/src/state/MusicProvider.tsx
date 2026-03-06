import React, { createContext, useContext, useMemo, useReducer } from "react";
import type { MusicState, Track, View } from "./types";

type Action =
  | { type: "NAVIGATE"; view: View }
  | { type: "ADD_TRACK"; track: Track }
  | { type: "SET_QUEUE"; queue: string[]; queueIndex: number }
  | { type: "PLAY_TRACK"; trackId: string }
  | { type: "SET_PLAYING"; isPlaying: boolean }
  | { type: "SET_VOLUME"; volume: number }
  | { type: "SET_TIME"; positionSec: number; durationSec: number }
  | { type: "SET_TRACK_DURATION"; trackId: string; durationSec: number }
  | { type: "SET_TRACKS"; tracks: Track[] }
  | { type: "UPDATE_TRACK"; trackId: string; patch: Partial<Track> }
  | { type: "SET_REPEAT_MODE"; repeatMode: "off" | "one" | "all" }
  | { type: "SET_SHUFFLE"; shuffleOn: boolean }
  | { type: "SET_BASE_QUEUE"; baseQueue: string[] }
  | { type: "SET_LIBRARY_ORDER"; order: string[] }
  | { type: "REORDER_LIBRARY_ORDER"; from: number; to: number }
  | { type: "TOGGLE_QUEUE" }
  | { type: "REMOVE_FROM_QUEUE"; index: number };
  

const initialState: MusicState = {
  tracks: {},
  playlists: {},
  view: { kind: "library" },
  libraryOrder: [],
  player: {
    currentTrackId: null,
    isPlaying: false,
    volume: 0.9,
    positionSec: 0,
    durationSec: 0,
    queue: [],
    queueIndex: 0,
    repeatMode: "all",
    shuffleOn: false,
    baseQueue: [],
    showQueue: false,
  },
};

function reducer(state: MusicState, action: Action): MusicState {
  switch (action.type) {
    case "NAVIGATE":
      return { ...state, view: action.view };

    case "ADD_TRACK": {
      const tracks = { ...state.tracks, [action.track.id]: action.track };
      const queue = state.player.queue.length ? state.player.queue : Object.keys(tracks);

      const libraryOrder = state.libraryOrder.length
        ? (state.libraryOrder.includes(action.track.id) ? state.libraryOrder : [...state.libraryOrder, action.track.id])
        : Object.keys(tracks);

      return { ...state, tracks, libraryOrder, player: { ...state.player, queue } };
    }

    case "SET_QUEUE": {
      const player = {
        ...state.player,
        queue: action.queue,
        queueIndex: action.queueIndex,
        // If shuffle is off, treat this as the new baseQueue
        baseQueue: state.player.shuffleOn ? state.player.baseQueue : action.queue,
      };

      return { ...state, player };
    }

    case "PLAY_TRACK":
      let queue = state.player.queue;
      let idx = queue.indexOf(action.trackId);

      if (idx < 0) {
        queue = Object.keys(state.tracks);       // or whatever “library order” you want
        idx = queue.indexOf(action.trackId);
      }
      return {
        ...state,
        player: {
          ...state.player,
          queue,
          queueIndex: Math.max(0, idx),
          currentTrackId: action.trackId,
          isPlaying: true,
          positionSec: 0,
          durationSec: 0,
        },
      };

    case "SET_PLAYING":
      return { ...state, player: { ...state.player, isPlaying: action.isPlaying } };

    case "SET_VOLUME":
      return { ...state, player: { ...state.player, volume: action.volume } };

    case "SET_TIME":
      return {
        ...state,
        player: { ...state.player, positionSec: action.positionSec, durationSec: action.durationSec },
      };

    case "SET_TRACK_DURATION": {
      const t = state.tracks[action.trackId];
      if (!t) return state;
      return {
        ...state,
        tracks: { ...state.tracks, [action.trackId]: { ...t, durationSec: action.durationSec } },
      };
    }

    case "SET_TRACKS": {
        const map: Record<string, Track> = {};
        for (const t of action.tracks) map[t.id] = t;

        const incomingIds = action.tracks.map((t) => t.id);

        // Preserve existing order for items that still exist, append new ones at end
        const prev = state.libraryOrder.length ? state.libraryOrder : incomingIds;
        const inIncoming = new Set(incomingIds);

        const preserved = prev.filter((id) => inIncoming.has(id));
        const preservedSet = new Set(preserved);
        const appended = incomingIds.filter((id) => !preservedSet.has(id));

        const libraryOrder = preserved.concat(appended);

        // keep your player queue behavior as-is (you currently reset queue to all tracks)
        const queue = incomingIds;

        return {
          ...state,
          tracks: map,
          libraryOrder,
          player: { ...state.player, queue, baseQueue: queue, queueIndex: 0 },
        };
    }

    case "UPDATE_TRACK": {
      const t = state.tracks[action.trackId];
      if (!t) return state;

      return {
        ...state,
        tracks: {
          ...state.tracks,
          [action.trackId]: { ...t, ...action.patch },
        },
      };
    }

    case "SET_REPEAT_MODE":
      return { ...state, player: { ...state.player, repeatMode: action.repeatMode } };

    case "SET_SHUFFLE":
      return { ...state, player: { ...state.player, shuffleOn: action.shuffleOn } };

    case "SET_BASE_QUEUE":
      return { ...state, player: { ...state.player, baseQueue: action.baseQueue } };

    case "SET_LIBRARY_ORDER":
      return { ...state, libraryOrder: action.order };

    case "REORDER_LIBRARY_ORDER": {
      const { from, to } = action;
      const order = state.libraryOrder.slice();
      if (from < 0 || to < 0 || from >= order.length || to >= order.length) return state;

      const [id] = order.splice(from, 1);
      order.splice(to, 0, id);
      return { ...state, libraryOrder: order };
    }

    case "TOGGLE_QUEUE":{
      return {
        ...state,
        player: { ...state.player, showQueue: !state.player.showQueue },
      };
    }
    

    case "REMOVE_FROM_QUEUE": {
      const { index } = action;
      const { queue, queueIndex, currentTrackId } = state.player;

      if (index < 0 || index >= queue.length) return state;

      const newQueue = queue.slice();
      const removedId = newQueue.splice(index, 1)[0];

      let newIndex = queueIndex;

      // If removing something before current index → shift left
      if (index < queueIndex) {
        newIndex = queueIndex - 1;
      }

      // If removing the currently playing track
      if (index === queueIndex) {
        if (newQueue.length === 0) {
          return {
            ...state,
            player: {
              ...state.player,
              queue: [],
              queueIndex: 0,
              currentTrackId: null,
              isPlaying: false,
            },
          };
        }

        // If removed last item → move index back one
        if (queueIndex >= newQueue.length) {
          newIndex = newQueue.length - 1;
        }
      }

      return {
        ...state,
        player: {
          ...state.player,
          queue: newQueue,
          queueIndex: newIndex,
          currentTrackId:
            newQueue.length > 0 ? newQueue[newIndex] : null,
        },
      };
    }
    default:
      return state;
  }
}

const MusicCtx = createContext<{
  state: MusicState;
  dispatch: React.Dispatch<Action>;
} | null>(null);

export function MusicProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <MusicCtx.Provider value={value}>{children}</MusicCtx.Provider>;
}

export function useMusic() {
  const ctx = useContext(MusicCtx);
  if (!ctx) throw new Error("useMusic must be used within MusicProvider");
  return ctx;
}
