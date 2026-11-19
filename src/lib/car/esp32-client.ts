/**
 * Direct browser → ESP32 HTTP client.
 * The ESP32 runs its own Wi-Fi AP ("ESP32-Motors"); the phone/laptop must join that
 * network for http://192.168.4.1 to be reachable. Nothing is proxied through a server.
 * Note: an HTTPS-hosted page may be blocked from calling plain-HTTP local addresses
 * (mixed content / private network access). Errors are surfaced, never hidden.
 */
import { MOVEMENT_ROUTE, Movement } from "./movement";

export const DEFAULT_BASE_URL = "http://192.168.4.1";
export const REQUEST_TIMEOUT_MS = 1500;

export type SendResult = { ok: true; ms: number } | { ok: false; error: string };

export function normalizeBaseUrl(url: string): string {
  const t = url.trim().replace(/\/+$/, "");
  return /^https?:\/\//i.test(t) ? t : `http://${t}`;
}

export async function sendMovement(
  baseUrl: string,
  movement: Movement,
  signal?: AbortSignal,
): Promise<SendResult> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort("timeout"), REQUEST_TIMEOUT_MS);
  signal?.addEventListener("abort", () => ctrl.abort("superseded"));
  const start = performance.now();
  try {
    // Firmware may not send CORS headers; "no-cors" still delivers the GET.
    // An opaque response means the request reached a host that answered.
    await fetch(normalizeBaseUrl(baseUrl) + MOVEMENT_ROUTE[movement], {
      method: "GET",
      mode: "no-cors",
      cache: "no-store",
      signal: ctrl.signal,
    });
    return { ok: true, ms: Math.round(performance.now() - start) };
  } catch (e) {
    const reason = ctrl.signal.reason;
    if (reason === "timeout") return { ok: false, error: "Request timed out" };
    if (reason === "superseded") return { ok: false, error: "superseded" };
    return {
      ok: false,
      error: e instanceof Error ? `Network error: ${e.message}` : "Network error",
    };
  } finally {
    clearTimeout(timer);
  }
}
