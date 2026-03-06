export {};

import type { MusicXAPI } from "../electron/preload"; 

declare global {
  interface Window {
    musicx: MusicXAPI;
  }
}