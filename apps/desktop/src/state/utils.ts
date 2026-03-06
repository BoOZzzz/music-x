export function uid() {
  return crypto.randomUUID();
}

export function basenameFromUrl(url: string) {
  try {
    // handles file:///C:/... and musicx://... paths
    const u = new URL(url);
    if (u.protocol === "file:") {
      const parts = u.pathname.split("/").filter(Boolean);
      return decodeURIComponent(parts[parts.length - 1] ?? "Unknown");
    }
    // musicx://track?path=...
    const p = u.searchParams.get("path");
    if (p) {
      // could be file://... or raw path depending on your implementation
      const pp = p.split(/[\\/]/);
      return decodeURIComponent(pp[pp.length - 1] ?? "Unknown");
    }
    return "Unknown";
  } catch {
    // fallback: try splitting raw strings
    const parts = url.split(/[\\/]/);
    return decodeURIComponent(parts[parts.length - 1] ?? "Unknown");
  }
}

export function fmtTime(sec: number) {
  if (!isFinite(sec) || sec < 0) return "0:00";
  const s = Math.floor(sec % 60);
  const m = Math.floor(sec / 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
