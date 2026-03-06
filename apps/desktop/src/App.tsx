import { MusicProvider } from "./state/MusicProvider";
import { AppShell } from "./AppShell";
import "./css/App.css";

export default function App() {
  return (
    <MusicProvider>
      <AppShell />
    </MusicProvider>
  );
}
