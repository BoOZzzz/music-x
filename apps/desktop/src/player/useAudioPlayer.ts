import { useEffect, useMemo, useRef } from "react";
import { useMusic } from "../state/MusicProvider";

export function useAudioPlayer() {
  const { state, dispatch } = useMusic();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const loadedTrackIdRef = useRef<string | null>(null);

  const currentTrack = useMemo(() => {
    const id = state.player.currentTrackId;
    return id ? state.tracks[id] : null;
  }, [state.player.currentTrackId, state.tracks]);

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Create the audio element once
  useEffect(() => {
    const a = new Audio();
    a.preload = "metadata";
    audioRef.current = a;

    const onTime = () => {
      dispatch({
        type: "SET_TIME",
        positionSec: a.currentTime || 0,
        durationSec: isFinite(a.duration) ? a.duration : 0,
      });
    };

    const onLoaded = () => {
      const s = stateRef.current;
      const trackId = s.player.currentTrackId;
      if (trackId && isFinite(a.duration)) {
        dispatch({ type: "SET_TRACK_DURATION", trackId, durationSec: a.duration });
      }
      onTime();
    };

    const onEnded = () => {
      const s = stateRef.current;
      const { queue, queueIndex, repeatMode } = s.player;

      if (repeatMode === "all" && queue.length === 1) {
        a.currentTime = 0;

        dispatch({
          type: "SET_TIME",
          positionSec: 0,
          durationSec: isFinite(a.duration) ? a.duration : 0,
        });
        dispatch({ type: "SET_PLAYING", isPlaying: true });

        a.play().catch(() => dispatch({ type: "SET_PLAYING", isPlaying: false }));
        return;
      }
      // Loop current song
      if (repeatMode === "one") {
        // Restart the *audio element* directly (don’t rely on trackId change)
        a.currentTime = 0;

        // Keep UI in sync
        dispatch({ type: "SET_TIME", positionSec: 0, durationSec: isFinite(a.duration) ? a.duration : 0 });
        dispatch({ type: "SET_PLAYING", isPlaying: true });

        a.play().catch(() => {
          // If play fails for any reason, reflect it in state
          dispatch({ type: "SET_PLAYING", isPlaying: false });
        });

        return;
      }

      // Otherwise try go next
      const nextIndex = queueIndex + 1;

      if (nextIndex < queue.length) {
        dispatch({ type: "SET_QUEUE", queue, queueIndex: nextIndex });
        dispatch({ type: "PLAY_TRACK", trackId: queue[nextIndex] });
        return;
      }

      // End of queue
      if (repeatMode === "all" && queue.length > 0) {
        dispatch({ type: "SET_QUEUE", queue, queueIndex: 0 });
        dispatch({ type: "PLAY_TRACK", trackId: queue[0] });
      } else {
        dispatch({ type: "SET_PLAYING", isPlaying: false });
      }
    };

    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onLoaded);
    a.addEventListener("ended", onEnded);

    return () => {
      a.pause();
      a.src = "";
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onLoaded);
      a.removeEventListener("ended", onEnded);
      audioRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When current track changes, set src and play
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    const trackId = state.player.currentTrackId;

    if (!currentTrack || !trackId) {
      a.pause();
      a.src = "";
      loadedTrackIdRef.current = null;
      dispatch({ type: "SET_PLAYING", isPlaying: false });
      return;
    }

    // ✅ Only (re)load audio when the track actually changes
    const isNewTrack = loadedTrackIdRef.current !== trackId;
    if (isNewTrack) {
      loadedTrackIdRef.current = trackId;
      a.src = currentTrack.sourceUrl;
      a.currentTime = 0; // new track starts at beginning
      // no need to call load(); setting src is enough in most cases
    }

  // ✅ Play/pause handled by a separate effect below
  }, [currentTrack, state.player.currentTrackId, dispatch]);

  // Keep playback state in sync WITHOUT reloading the source
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    if (!currentTrack) return;

    if (state.player.isPlaying) {
      a.play().catch(() => dispatch({ type: "SET_PLAYING", isPlaying: false }));
    } else {
      a.pause();
    }
  }, [state.player.isPlaying, currentTrack, dispatch]);


  // Keep volume synced
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    a.volume = Math.max(0, Math.min(1, state.player.volume));
  }, [state.player.volume]);


  function shuffleArray<T>(arr: T[]) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
    return a;
  }

  const restartCurrent = () => {
    const a = audioRef.current;
    const s = stateRef.current;
    if (!a) return;
    if (!s.player.currentTrackId) return;

    a.currentTime = 0;

    dispatch({
      type: "SET_TIME",
      positionSec: 0,
      durationSec: isFinite(a.duration) ? a.duration : 0,
    });

    // "Next/Prev restarts" usually implies it keeps playing
    dispatch({ type: "SET_PLAYING", isPlaying: true });
    a.play().catch(() => dispatch({ type: "SET_PLAYING", isPlaying: false }));
  };

  const controls = {
    play: async () => {
      const a = audioRef.current;
      if (!a) return;
      dispatch({ type: "SET_PLAYING", isPlaying: true });
      try {
        await a.play();
      } catch {
        dispatch({ type: "SET_PLAYING", isPlaying: false });
      }
    },
    pause: () => {
      const a = audioRef.current;
      if (!a) return;
      a.pause();
      dispatch({ type: "SET_PLAYING", isPlaying: false });
    },
    toggle: async () => {
      if (state.player.isPlaying) controls.pause();
      else await controls.play();
    },
    seek: (sec: number) => {
      const a = audioRef.current;
      if (!a) return;
      a.currentTime = Math.max(0, sec);
    },
    next: () => {
      const s = stateRef.current;
      const { queue, queueIndex, repeatMode } = s.player;

      
      if (!queue.length) return;
      if (queue.length === 1) {
        restartCurrent();
        return;
      }
      const nextIndex = queueIndex + 1;

      // normal forward
      if (nextIndex < queue.length) {
        dispatch({ type: "SET_QUEUE", queue, queueIndex: nextIndex });
        dispatch({ type: "PLAY_TRACK", trackId: queue[nextIndex] });
        return;
      }

      // wrap if looping the list
      if (repeatMode === "all") {
        dispatch({ type: "SET_QUEUE", queue, queueIndex: 0 });
        dispatch({ type: "PLAY_TRACK", trackId: queue[0] });
      }
    },
    prev: () => {
      const s = stateRef.current;
      const { queue, queueIndex, repeatMode } = s.player;

      if (!queue.length) return;

      if (queue.length === 1) {
        restartCurrent();
        return;
      }
      const prevIndex = queueIndex - 1;

      // normal backward
      if (prevIndex >= 0) {
        dispatch({ type: "SET_QUEUE", queue, queueIndex: prevIndex });
        dispatch({ type: "PLAY_TRACK", trackId: queue[prevIndex] });
        return;
      }

      // wrap if looping the list
      if (repeatMode === "all") {
        const last = queue.length - 1;
        dispatch({ type: "SET_QUEUE", queue, queueIndex: last });
        dispatch({ type: "PLAY_TRACK", trackId: queue[last] });
        return;
      }

      // otherwise restart current track
      controls.seek(0);
    },
    toggleShuffle: () => {
      const s = stateRef.current;
      const { shuffleOn, baseQueue, queue, currentTrackId } = s.player;

      // Turn shuffle ON
      if (!shuffleOn) {
        const srcBase = baseQueue.length ? baseQueue : queue;
        if (srcBase.length === 0) return;

        // pin current track first (if any)
        const cur = currentTrackId;
        const rest = cur ? srcBase.filter((id) => id !== cur) : srcBase.slice();
        const shuffled = cur ? [cur, ...shuffleArray(rest)] : shuffleArray(rest);

        dispatch({ type: "SET_BASE_QUEUE", baseQueue: srcBase });
        dispatch({ type: "SET_SHUFFLE", shuffleOn: true });

        const newIndex = cur ? 0 : 0;
        dispatch({ type: "SET_QUEUE", queue: shuffled, queueIndex: newIndex });

        return;
      }

      // Turn shuffle OFF (restore base)
      const restore = baseQueue.length ? baseQueue : queue;
      if (restore.length === 0) {
        dispatch({ type: "SET_SHUFFLE", shuffleOn: false });
        return;
      }

      const cur = currentTrackId;
      const idx = cur ? restore.indexOf(cur) : 0;

      dispatch({ type: "SET_SHUFFLE", shuffleOn: false });
      dispatch({ type: "SET_QUEUE", queue: restore, queueIndex: Math.max(0, idx) });
    },
  };

  return { currentTrack, controls, audioRef };
}
