import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_BASE_URL, DEFAULT_SPEED, WIFI_SSID, WIFI_PASSWORD, normalizeBaseUrl, normalizeSpeed, probeConnection, sendMovement, sendSpeed, speedRoute, REQUEST_TIMEOUT_MS } from "./esp32-client";
import { Movement } from "./movement";

const opaque = () => ({ type: "opaque", status: 0, ok: false });
const readable = (status = 200, text = "OK") => ({ type: "basic", status, ok: status >= 200 && status < 300, text: async () => text });
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe("latest firmware contract", () => {
  it("uses the exact default base URL", () => expect(DEFAULT_BASE_URL).toBe("http://192.168.4.1"));
  it("uses Electric-Car Wi-Fi", () => expect(WIFI_SSID).toBe("Electric-Car"));
  it("uses the supplied AP password", () => expect(WIFI_PASSWORD).toBe("car12345"));
  it("defaults PWM speed to 180", () => expect(DEFAULT_SPEED).toBe(180));
  it("normalizes the bare device address", () => expect(normalizeBaseUrl(" 192.168.4.1/ ")).toBe(DEFAULT_BASE_URL));
  it.each([
    [Movement.Forward, "/forward"], [Movement.Backward, "/backward"],
    [Movement.Left, "/left"], [Movement.Right, "/right"], [Movement.Stop, "/stop"],
  ])("sends %s to %s with GET", async (movement, path) => {
    const fetchMock = vi.fn().mockResolvedValue(opaque()); vi.stubGlobal("fetch", fetchMock);
    await sendMovement(DEFAULT_BASE_URL, movement);
    expect(fetchMock).toHaveBeenCalledWith(DEFAULT_BASE_URL + path, expect.objectContaining({ method: "GET", mode: "no-cors" }));
  });
  it.each([0, 180, 255])("sends exact speed query for %i", async (value) => {
    const fetchMock = vi.fn().mockResolvedValue(opaque()); vi.stubGlobal("fetch", fetchMock);
    await sendSpeed(DEFAULT_BASE_URL, value);
    expect(fetchMock).toHaveBeenCalledWith(`${DEFAULT_BASE_URL}/speed?v=${value}`, expect.objectContaining({ method: "GET" }));
  });
  it("clamps speed below zero to 0", () => expect(speedRoute(-1)).toBe("/speed?v=0"));
  it("clamps speed above 255 to 255", () => expect(speedRoute(256)).toBe("/speed?v=255"));
  it("rounds to an integer PWM value", () => expect(normalizeSpeed(179.6)).toBe(180));
});

describe("honest browser response semantics", () => {
  it("never verifies an opaque command reply", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(opaque()));
    expect(await sendMovement(DEFAULT_BASE_URL, Movement.Forward)).toEqual({ kind: "dispatched" });
  });
  it("verifies readable HTTP 200 OK command replies", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(readable()));
    expect(await sendMovement(DEFAULT_BASE_URL, Movement.Stop)).toEqual({ kind: "verified", ms: expect.any(Number) });
  });
  it("does not accept a readable non-OK body", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(readable(200, "Different device")));
    expect(await sendSpeed(DEFAULT_BASE_URL, 180)).toMatchObject({ kind: "error", code: "response" });
  });
  it("reports HTTP errors instead of connected", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(readable(404)));
    expect(await sendMovement(DEFAULT_BASE_URL, Movement.Stop)).toMatchObject({ kind: "error", code: "http" });
  });
  it("tests only GET / and verifies readable HTML HTTP response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(readable(200, "<html>ESP32</html>")); vi.stubGlobal("fetch", fetchMock);
    expect(await probeConnection(DEFAULT_BASE_URL)).toMatchObject({ kind: "verified" });
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(`${DEFAULT_BASE_URL}/`, expect.objectContaining({ method: "GET", mode: "cors" }));
  });
  it("keeps opaque root fallback unverified after CORS failure", async () => {
    const fetchMock = vi.fn().mockRejectedValueOnce(new TypeError("Failed to fetch")).mockResolvedValueOnce(opaque()); vi.stubGlobal("fetch", fetchMock);
    expect(await probeConnection(DEFAULT_BASE_URL)).toEqual({ kind: "dispatched" });
    expect(fetchMock).toHaveBeenNthCalledWith(2, `${DEFAULT_BASE_URL}/`, expect.objectContaining({ mode: "no-cors" }));
  });
  it("blocked requests produce actionable network errors, not success", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    const result = await probeConnection(DEFAULT_BASE_URL);
    expect(result).toMatchObject({ kind: "error", code: "network" });
    if (result.kind !== "error") throw new Error("Must fail");
    expect(result.error).toContain("http://192.168.4.1");
    expect(result.error).toContain("HTTPS");
  });
  it("distinguishes superseded requests", async () => {
    vi.stubGlobal("fetch", vi.fn((_url, options: RequestInit) => new Promise((_resolve, reject) => {
      options.signal?.addEventListener("abort", () => reject(new Error("abort")));
    })));
    const ctrl = new AbortController(); const pending = sendMovement(DEFAULT_BASE_URL, Movement.Forward, ctrl.signal);
    ctrl.abort(); expect(await pending).toMatchObject({ kind: "error", code: "superseded" });
  });
  it("reports timeouts as errors", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn((_url, options: RequestInit) => new Promise((_resolve, reject) => {
      options.signal?.addEventListener("abort", () => reject(new Error("abort")));
    })));
    const pending = sendMovement(DEFAULT_BASE_URL, Movement.Stop);
    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS);
    expect(await pending).toMatchObject({ kind: "error", code: "timeout" });
  });
});
