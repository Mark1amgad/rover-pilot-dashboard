/** Direct browser → ESP32 only. Join Electric-Car in OS Wi-Fi settings first.
 * Firmware has no CORS headers. no-cors cannot bypass mixed-content or local-network
 * restrictions, and an opaque response does NOT verify delivery or motor acceptance.
 */
import { MOVEMENT_ROUTE, Movement } from "./movement";

export const DEFAULT_BASE_URL = "http://192.168.4.1";
export const WIFI_SSID = "Electric-Car";
export const WIFI_PASSWORD = "car12345";
export const DEFAULT_SPEED = 180;
export const REQUEST_TIMEOUT_MS = 1500;
export const SPEED_DEBOUNCE_MS = 200;
export type SendResult =
  | { kind: "verified"; ms: number }
  | { kind: "dispatched" }
  | { kind: "error"; code: "timeout" | "superseded" | "network" | "http" | "response" | "invalid-url"; error: string };

export function normalizeBaseUrl(url: string): string {
  const trimmed = url.trim().replace(/\/+$/, "");
  return /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
}
export function normalizeSpeed(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.min(255, Math.round(value))) : DEFAULT_SPEED;
}
export function speedRoute(value: number): string {
  return `/speed?v=${normalizeSpeed(value)}`;
}

export const NETWORK_GUIDANCE = "Join Electric-Car using password car12345 in OS Wi-Fi settings, then open http://192.168.4.1 directly to check the car. This hosted HTTPS controller may be unable to reach the local HTTP ESP32 because of mixed-content, private-network permissions, or CORS. no-cors does not bypass these restrictions. If the device page opens but this controller fails, use the ESP32's own HTTP page or serve this controller locally over HTTP; cross-origin replies may still remain unverified.";

async function request(baseUrl: string, path: string, mode: RequestMode, command: boolean, signal?: AbortSignal): Promise<SendResult> {
  let url: URL;
  try {
    url = new URL(normalizeBaseUrl(baseUrl) + path);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) throw new Error("Invalid address");
  } catch {
    return { kind: "error", code: "invalid-url", error: "Enter an HTTP or HTTPS device address, such as http://192.168.4.1." };
  }
  const ctrl = new AbortController();
  const onAbort = () => ctrl.abort("superseded");
  signal?.addEventListener("abort", onAbort, { once: true });
  if (signal?.aborted) onAbort();
  const timer = setTimeout(() => ctrl.abort("timeout"), REQUEST_TIMEOUT_MS);
  const start = performance.now();
  try {
    const response = await fetch(url.toString(), { method: "GET", mode, cache: "no-store", credentials: "omit", redirect: "error", signal: ctrl.signal });
    if (response.type === "opaque") return { kind: "dispatched" };
    if (!response.ok) return { kind: "error", code: "http", error: `Device returned HTTP ${response.status}; check the address and firmware routes.` };
    if (command && (await response.text()).trim() !== "OK") {
      return { kind: "error", code: "response", error: "The HTTP reply was not the firmware's expected OK. Check that the address belongs to your ESP32." };
    }
    return { kind: "verified", ms: Math.round(performance.now() - start) };
  } catch {
    if (ctrl.signal.reason === "superseded") return { kind: "error", code: "superseded", error: "superseded" };
    if (ctrl.signal.reason === "timeout") return { kind: "error", code: "timeout", error: `Request timed out. ${NETWORK_GUIDANCE}` };
    return { kind: "error", code: "network", error: `Browser blocked the request or the device is unreachable. ${NETWORK_GUIDANCE}` };
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
}

export function sendMovement(baseUrl: string, movement: Movement, signal?: AbortSignal): Promise<SendResult> {
  return request(baseUrl, MOVEMENT_ROUTE[movement], "no-cors", true, signal);
}
export function sendSpeed(baseUrl: string, value: number, signal?: AbortSignal): Promise<SendResult> {
  return request(baseUrl, speedRoute(value), "no-cors", true, signal);
}
/** Only GET / tests the connection. A CORS-readable response is verified HTTP,
 * not proof of device identity. On CORS failure, an opaque probe stays unverified.
 */
export async function probeConnection(baseUrl: string, signal?: AbortSignal): Promise<SendResult> {
  const result = await request(baseUrl, "/", "cors", false, signal);
  if (result.kind === "error" && result.code === "network") return request(baseUrl, "/", "no-cors", false, signal);
  return result;
}
