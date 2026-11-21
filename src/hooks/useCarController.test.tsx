import { act, cleanup, fireEvent, render, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCarController, statusForResult } from "./useCarController";
import { Movement } from "@/lib/car/movement";
import { DEFAULT_BASE_URL, SPEED_DEBOUNCE_MS } from "@/lib/car/esp32-client";
import { DPad } from "@/components/car/DPad";
import { Joystick } from "@/components/car/Joystick";

const fetchMock = vi.fn();
const flush = async () => { await act(async () => { await Promise.resolve(); }); };
beforeEach(() => {
  localStorage.clear(); vi.useFakeTimers(); fetchMock.mockReset();
  fetchMock.mockResolvedValue({ type: "opaque" }); vi.stubGlobal("fetch", fetchMock);
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(true);
  HTMLElement.prototype.releasePointerCapture = vi.fn();
});
afterEach(async () => { cleanup(); await flush(); vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("controller safety and PWM", () => {
  it("starts with selected speed 180 without auto-sending commands", () => {
    const { result } = renderHook(useCarController);
    expect(result.current.speed).toBe(180); expect(fetchMock).not.toHaveBeenCalled();
  });
  it("debounces speed dragging to the latest selected value", async () => {
    const { result } = renderHook(useCarController);
    act(() => { result.current.setSpeed(50); result.current.setSpeed(100); result.current.setSpeed(255); });
    expect(result.current.speed).toBe(255); expect(fetchMock).not.toHaveBeenCalled();
    await act(async () => { await vi.advanceTimersByTimeAsync(SPEED_DEBOUNCE_MS); });
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(`${DEFAULT_BASE_URL}/speed?v=255`, expect.any(Object));
  });
  it("release sends /stop and ends movement keepalive", async () => {
    const { result } = renderHook(useCarController);
    act(() => result.current.drive(Movement.Forward)); await flush();
    await act(async () => { await vi.advanceTimersByTimeAsync(300); });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    act(() => result.current.release()); await flush();
    expect(fetchMock).toHaveBeenLastCalledWith(`${DEFAULT_BASE_URL}/stop`, expect.any(Object));
    expect(result.current.movement).toBe(Movement.Stop);
    await act(async () => { await vi.advanceTimersByTimeAsync(900); });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
  it("stop cancels pending speed changes", async () => {
    const { result } = renderHook(useCarController);
    act(() => { result.current.setSpeed(0); result.current.stop(); });
    await act(async () => { await vi.advanceTimersByTimeAsync(500); });
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(`${DEFAULT_BASE_URL}/stop`, expect.any(Object));
  });
  it("window blur issues /stop", async () => {
    const { result } = renderHook(useCarController);
    act(() => result.current.drive(Movement.Left)); await flush();
    act(() => window.dispatchEvent(new Event("blur"))); await flush();
    expect(fetchMock).toHaveBeenLastCalledWith(`${DEFAULT_BASE_URL}/stop`, expect.any(Object));
  });
  it("hidden visibility issues /stop", async () => {
    const { result } = renderHook(useCarController);
    act(() => result.current.drive(Movement.Right)); await flush();
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
    act(() => document.dispatchEvent(new Event("visibilitychange"))); await flush();
    expect(fetchMock).toHaveBeenLastCalledWith(`${DEFAULT_BASE_URL}/stop`, expect.any(Object));
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
  });
  it("explicit connection test probes / rather than a motor route", async () => {
    const { result } = renderHook(useCarController);
    await act(async () => { await result.current.testConnection(); });
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(`${DEFAULT_BASE_URL}/`, expect.objectContaining({ mode: "cors" }));
    expect(result.current.status).toBe("dispatched"); expect(result.current.lastVerified).toBeNull(); expect(result.current.latency).toBeNull();
  });
  it("does not let stale movement replies overwrite stop status", async () => {
    let resolveOld: ((value: object) => void) | undefined;
    fetchMock.mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; }));
    const { result } = renderHook(useCarController);
    act(() => result.current.drive(Movement.Forward));
    act(() => { void result.current.stop(); }); await flush();
    resolveOld?.({ type: "basic", ok: true, text: async () => "OK" }); await flush();
    expect(result.current.status).toBe("dispatched"); expect(result.current.lastRequest).toBe("/stop");
  });
  it("maps opaque to dispatched, not verified", () => expect(statusForResult({ kind: "dispatched" })).toBe("dispatched"));
  it("maps verified HTTP to verified status", () => expect(statusForResult({ kind: "verified", ms: 12 })).toBe("verified"));
  it("maps browser network failure to error status", () => expect(statusForResult({ kind: "error", code: "network", error: "blocked" })).toBe("error"));
});

function Controls({ joystick = false }: { joystick?: boolean }) {
  const car = useCarController();
  return joystick ? <Joystick active={car.movement} onMove={car.drive} onRelease={car.release} /> : <DPad active={car.movement} onMove={car.drive} onRelease={car.release} onStop={car.stop} />;
}
describe("pointer safety", () => {
  it.each(["pointerUp", "pointerCancel", "pointerLeave", "lostPointerCapture"] as const)("D-pad %s requests stop", async event => {
    const view = render(<Controls />); const button = view.getByRole("button", { name: /^Forward$/ });
    fireEvent.pointerDown(button, { pointerId: 1 }); await flush();
    fireEvent[event](button, { pointerId: 1 }); await flush();
    expect(fetchMock).toHaveBeenLastCalledWith(`${DEFAULT_BASE_URL}/stop`, expect.any(Object));
  });
  it.each(["pointerUp", "pointerCancel", "pointerLeave", "lostPointerCapture"] as const)("joystick %s requests stop", async event => {
    const view = render(<Controls joystick />); const joystick = view.getByRole("application");
    vi.spyOn(joystick, "getBoundingClientRect").mockReturnValue({ left: 0, top: 0, right: 300, bottom: 300, width: 300, height: 300, x: 0, y: 0, toJSON: () => ({}) });
    fireEvent.pointerDown(joystick, { pointerId: 1, clientX: 150, clientY: 30 }); await flush();
    fireEvent[event](joystick, { pointerId: 1 }); await flush();
    expect(fetchMock).toHaveBeenLastCalledWith(`${DEFAULT_BASE_URL}/stop`, expect.any(Object));
  });
});
