export {};

import type { MusicXAPI } from "@music-x/shared";

declare global {
  interface Window {
    musicx: MusicXAPI;
  }
}
