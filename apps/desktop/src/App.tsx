import { MusicProvider } from "./state/MusicProvider";
import { AppShell } from "./AppShell";
import { GlobalContextMenuProvider } from "./features/ctxmenu/GlobalContextMenu";
import "./css/App.css";

export default function App() {
  return (
    <GlobalContextMenuProvider>
      <MusicProvider>
        <AppShell />
      </MusicProvider>
    </GlobalContextMenuProvider>
  );
}
