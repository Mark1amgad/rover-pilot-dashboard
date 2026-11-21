/** Browser → ESP32 client. On the ESP32-hosted page, API calls are same-origin
 * relative requests: no internet, CORS, mixed-content or cross-origin permission is needed.
 * The cloud preview remains useful for UI review but may not control the local ESP32.
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

export const NETWORK_GUIDANCE =
  "For reliable offline control, join Electric-Car (password car12345) and open http://192.168.4.1. The Lovable/Vercel preview is hosted on HTTPS and may be blocked from reaching the car's local HTTP address.";

async function request(baseUrl: string, path: string, mode: RequestMode, command: boolean, signal?: AbortSignal): Promise<SendResult> {
  let url: URL;
  try {
    url = new URL(normalizeBaseUrl(baseUrl) + path);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) throw new Error("Invalid address");
  } catch {
    return { kind: "error", code: "invalid-url", error: "Enter an HTTP or HTTPS device address, such as http://192.168.4.1." };
  }
  const sameOrigin = typeof window !== "undefined" && url.origin === window.location.origin;
  const target = sameOrigin ? path : url.toString();
  const ctrl = new AbortController();
  const onAbort = () => ctrl.abort("superseded");
  signal?.addEventListener("abort", onAbort, { once: true });
  if (signal?.aborted) onAbort();
  const timer = setTimeout(() => ctrl.abort("timeout"), REQUEST_TIMEOUT_MS);
  const start = performance.now();
  try {
    const response = await fetch(target, {
      method: "GET",
      mode: sameOrigin ? "same-origin" : mode,
      cache: "no-store",
      credentials: "omit",
      redirect: "error",
      signal: ctrl.signal,
    });
    if (response.type === "opaque") return { kind: "dispatched" };
    if (!response.ok) return { kind: "error", code: "http", error: `Device returned HTTP ${response.status}; check the address and firmware routes.` };
    if (command && (await response.text()).trim() !== "OK") {
      return { kind: "error", code: "response", error: "The device did not return the expected OK response." };
    }
    return { kind: "verified", ms: Math.round(performance.now() - start) };
  } catch {
    if (ctrl.signal.reason === "superseded") return { kind: "error", code: "superseded", error: "superseded" };
    if (ctrl.signal.reason === "timeout") return { kind: "error", code: "timeout", error: "The ESP32 did not respond before the request timed out." };
    return { kind: "error", code: "network", error: sameOrigin
      ? "Cannot reach the ESP32 page. Check that you joined Electric-Car and that the firmware and LittleFS files are installed."
      : `Browser blocked the cross-origin request or the device is unreachable. ${NETWORK_GUIDANCE}` };
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
export async function probeConnection(baseUrl: string, signal?: AbortSignal): Promise<SendResult> {
  const result = await request(baseUrl, "/", "cors", false, signal);
  if (result.kind === "error" && result.code === "network") return request(baseUrl, "/", "no-cors", false, signal);
  return result;
}
