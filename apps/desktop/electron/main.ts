import { app, BrowserWindow, protocol, shell } from 'electron'
import { pathToFileURL, fileURLToPath } from "node:url";
import { ipcMain, dialog } from "electron";
import fs from "node:fs";
import path from 'node:path'
import { registerLibraryIpc } from "./library";
import { closeDb } from "./db";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

(globalThis as any).__filename = __filename;
(globalThis as any).__dirname = __dirname;

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..')

const LIBRARY_DIR = path.join(app.getPath("music"), "Music-X Library");

function ensureLibraryDir() {
  fs.mkdirSync(LIBRARY_DIR, { recursive: true });
  console.log("[musicx] Library dir:", LIBRARY_DIR);
}


// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  })

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(createWindow)

app.whenReady().then(() => {
  ensureLibraryDir(); 
  registerLibraryIpc(() => LIBRARY_DIR);
});

app.whenReady().then(() => {
  protocol.registerFileProtocol("musicx", (request, callback) => {
    try {
      const u = new URL(request.url);
      const raw = u.searchParams.get("path");
      if (!raw) return callback({ error: -6 });

      // undo double-encoding safely (%25 -> %)
      const fileUrl = raw.replace(/%25/g, "%");

      let fsPath: string;
      if (fileUrl.startsWith("file://")) fsPath = fileURLToPath(fileUrl);
      else fsPath = process.platform === "win32" ? fileUrl.replace(/^\//, "") : fileUrl;

      callback({ path: fsPath });
    } catch {
      callback({ error: -6 });
    }
  });
});

ipcMain.handle("musicx:pickAudioFile", async () => {
  const res = await dialog.showOpenDialog({
    title: "Pick an audio file",
    properties: ["openFile"],
    filters: [{ name: "Audio", extensions: ["mp3", "wav", "m4a", "ogg", "flac"] }]
  });

  if (res.canceled || res.filePaths.length === 0) return null;

  const filePath = res.filePaths[0];
  return pathToFileURL(filePath).toString(); // ✅ encoded URL
});



ipcMain.handle("musicx:deleteFromDisk", async (_evt, fsPath: string) => {
  if (!fsPath) return { ok: false, reason: "missing path" };
  if (!fsPath.startsWith(LIBRARY_DIR)) {
    return { ok: false, reason: "refusing to delete outside library folder" };
  }
  if (!fs.existsSync(fsPath)) return { ok: false, reason: "not found" };

  const { response } = await dialog.showMessageBox({
    type: "warning",
    buttons: ["Cancel", "Delete"],
    defaultId: 0,
    cancelId: 0,
    message: "Delete this file from disk?",
    detail: fsPath,
  });

  if (response !== 1) return { ok: false, reason: "canceled" };

  fs.unlinkSync(fsPath);
  return { ok: true };
});

ipcMain.handle("musicx:getLibraryDir", async () => {
  ensureLibraryDir();
  return LIBRARY_DIR;
});

ipcMain.handle("musicx:openLibraryDir", async () => {
  ensureLibraryDir();
  await shell.openPath(LIBRARY_DIR);
  return true;
});



app.on("will-quit", () => {
  closeDb();
});