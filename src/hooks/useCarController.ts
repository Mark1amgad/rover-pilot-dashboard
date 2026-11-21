import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_BASE_URL, DEFAULT_SPEED, normalizeSpeed, probeConnection, sendMovement, sendSpeed, SPEED_DEBOUNCE_MS, type SendResult } from "@/lib/car/esp32-client";
import { Movement, MOVEMENT_ROUTE } from "@/lib/car/movement";

export type ConnStatus = "disconnected" | "checking" | "verified" | "dispatched" | "error";
const KEEPALIVE_MS = 300;
export function statusForResult(result: SendResult): Exclude<ConnStatus, "disconnected" | "checking"> {
  return result.kind === "error" ? "error" : result.kind;
}

export function useCarController() {
  const [baseUrl, setBaseUrlState] = useState(DEFAULT_BASE_URL);
  const [status, setStatus] = useState<ConnStatus>("disconnected");
  const [lastError, setLastError] = useState<string | null>(null);
  const [latency, setLatency] = useState<number | null>(null);
  const [movement, setMovement] = useState<Movement>(Movement.Stop);
  const [speed, setSpeedState] = useState(DEFAULT_SPEED);
  const [lastRequest, setLastRequest] = useState<string | null>(null);
  const [lastVerified, setLastVerified] = useState<string | null>(null);
  const baseRef = useRef(baseUrl);
  const currentRef = useRef<Movement>(Movement.Stop);
  const inflight = useRef<AbortController | null>(null);
  const speedInflight = useRef<AbortController | null>(null);
  const probeInflight = useRef<AbortController | null>(null);
  const keepalive = useRef<ReturnType<typeof setInterval> | null>(null);
  const speedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const generation = useRef(0);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("esp32-base-url");
      if (saved) { setBaseUrlState(saved); baseRef.current = saved; }
    } catch { /* Storage is optional on restricted browsers. */ }
  }, []);

  const report = useCallback((path: string, result: SendResult) => {
    if (result.kind === "error" && result.code === "superseded") return;
    setStatus(statusForResult(result));
    setLastRequest(path);
    setLatency(result.kind === "verified" ? result.ms : null);
    setLastError(result.kind === "error" ? result.error : null);
    if (result.kind === "verified") setLastVerified(path);
  }, []);

  const stopKeepalive = useCallback(() => {
    if (keepalive.current) clearInterval(keepalive.current);
    keepalive.current = null;
  }, []);
  const cancelSpeed = useCallback(() => {
    if (speedTimer.current) clearTimeout(speedTimer.current);
    speedTimer.current = null;
    speedInflight.current?.abort();
    speedInflight.current = null;
  }, []);

  const dispatch = useCallback(async (m: Movement) => {
    probeInflight.current?.abort();
    inflight.current?.abort();
    const ctrl = new AbortController();
    inflight.current = ctrl;
    const result = await sendMovement(baseRef.current, m, ctrl.signal);
    if (inflight.current !== ctrl) return;
    inflight.current = null;
    report(MOVEMENT_ROUTE[m], result);
  }, [report]);

  const drive = useCallback((m: Movement) => {
    if (m === currentRef.current) return;
    currentRef.current = m;
    setMovement(m);
    stopKeepalive();
    void dispatch(m);
    if (m !== Movement.Stop) keepalive.current = setInterval(() => {
      if (!inflight.current) void dispatch(currentRef.current);
    }, KEEPALIVE_MS);
  }, [dispatch, stopKeepalive]);

  /** Always requests /stop; aborting old requests cannot undo commands already delivered. */
  const stop = useCallback(() => {
    stopKeepalive();
    cancelSpeed();
    currentRef.current = Movement.Stop;
    setMovement(Movement.Stop);
    return dispatch(Movement.Stop);
  }, [dispatch, stopKeepalive, cancelSpeed]);
  const release = useCallback(() => { stop(); }, [stop]);

  const setSpeed = useCallback((value: number) => {
    const selected = normalizeSpeed(value);
    setSpeedState(selected);
    cancelSpeed();
    const epoch = generation.current;
    speedTimer.current = setTimeout(() => {
      speedTimer.current = null;
      const ctrl = new AbortController();
      speedInflight.current = ctrl;
      void sendSpeed(baseRef.current, selected, ctrl.signal).then((result) => {
        if (speedInflight.current !== ctrl || generation.current !== epoch) return;
        speedInflight.current = null;
        report(`/speed?v=${selected}`, result);
      });
    }, SPEED_DEBOUNCE_MS);
  }, [cancelSpeed, report]);

  const setBaseUrl = useCallback((url: string) => {
    // Stop the old device before switching the destination.
    const wasMoving = currentRef.current !== Movement.Stop;
    if (wasMoving) void stop();
    stopKeepalive();
    cancelSpeed();
    if (!wasMoving) inflight.current?.abort();
    inflight.current = null;
    probeInflight.current?.abort();
    generation.current += 1;
    baseRef.current = url;
    setBaseUrlState(url);
    try { localStorage.setItem("esp32-base-url", url); } catch { /* Optional. */ }
    setStatus("disconnected"); setLastError(null); setLatency(null);
    setLastRequest(null); setLastVerified(null);
  }, [stop, stopKeepalive, cancelSpeed]);

  const testConnection = useCallback(async () => {
    if (currentRef.current !== Movement.Stop) await stop();
    cancelSpeed();
    inflight.current?.abort(); inflight.current = null;
    probeInflight.current?.abort();
    const ctrl = new AbortController();
    probeInflight.current = ctrl;
    setStatus("checking"); setLastError(null); setLatency(null);
    const result = await probeConnection(baseRef.current, ctrl.signal);
    if (probeInflight.current !== ctrl || ctrl.signal.aborted) return;
    probeInflight.current = null;
    report("/", result);
  }, [stop, cancelSpeed, report]);

  useEffect(() => {
    const onVis = () => { if (document.visibilityState === "hidden") release(); };
    window.addEventListener("blur", release);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("blur", release);
      document.removeEventListener("visibilitychange", onVis);
      probeInflight.current?.abort();
      stop();
    };
  }, [release, stop]);

  return { baseUrl, setBaseUrl, status, lastError, latency, movement, speed, setSpeed, lastRequest, lastVerified, drive, stop, release, testConnection };
}
