import { api } from "@/lib/api";

const STARTED_KEY = "shopmate.session_started";
const MAX_PATH_LENGTH = 200;

function hasStarted(): boolean {
  try {
    if (sessionStorage.getItem(STARTED_KEY)) return true;
    sessionStorage.setItem(STARTED_KEY, "1");
  } catch {
    // Storage may be blocked; this page load then reports once on its own.
  }
  return false;
}

function referrerHost(): string {
  try {
    // Hostname only: full URLs can carry search terms or personal data.
    return document.referrer ? new URL(document.referrer).hostname : "";
  } catch {
    return "";
  }
}

export function reportSessionStart(): void {
  if (hasStarted()) return;

  const path = window.location.pathname.slice(0, MAX_PATH_LENGTH);

  // Reporting must never affect the visitor, so failures are ignored.
  api.startSession(path, referrerHost()).catch(() => {});
}
