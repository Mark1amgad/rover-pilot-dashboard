import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_BASE_URL, sendMovement } from "@/lib/car/esp32-client";
import { Movement } from "@/lib/car/movement";

export type ConnStatus = "disconnected" | "checking" | "connected" | "error";
/** Re-send held movement so firmware keeps going (and a future firmware watchdog stays fed). */
const KEEPALIVE_MS = 300;

export function useCarController() {
  const [baseUrl, setBaseUrlState] = useState(DEFAULT_BASE_URL);
  const [status, setStatus] = useState<ConnStatus>("disconnected");
  const [lastError, setLastError] = useState<string | null>(null);
  const [latency, setLatency] = useState<number | null>(null);
  const [movement, setMovement] = useState<Movement>(Movement.Stop);
  const [lastSent, setLastSent] = useState<Movement | null>(null);

  const baseRef = useRef(baseUrl);
  const currentRef = useRef<Movement>(Movement.Stop);
  const inflight = useRef<AbortController | null>(null);
  const busy = useRef(false);
  const keepalive = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("esp32-base-url");
    if (saved) { setBaseUrlState(saved); baseRef.current = saved; }
  }, []);

  const setBaseUrl = (u: string) => {
    setBaseUrlState(u); baseRef.current = u;
    localStorage.setItem("esp32-base-url", u);
    setStatus("disconnected");
  };

  const report = (m: Movement, r: Awaited<ReturnType<typeof sendMovement>>) => {
    if (r.ok) { setStatus("connected"); setLatency(r.ms); setLastError(null); setLastSent(m); }
    else if (r.error !== "superseded") { setStatus("error"); setLastError(r.error); }
  };

  /** Send now; a newer command aborts the older one so stale moves never queue. */
  const dispatch = useCallback(async (m: Movement) => {
    inflight.current?.abort();
    const ctrl = new AbortController();
    inflight.current = ctrl;
    busy.current = true;
    const r = await sendMovement(baseRef.current, m, ctrl.signal);
    if (inflight.current === ctrl) { busy.current = false; inflight.current = null; }
    report(m, r);
  }, []);

  const stopKeepalive = () => {
    if (keepalive.current) clearInterval(keepalive.current);
    keepalive.current = null;
  };

  const drive = useCallback((m: Movement) => {
    if (m === currentRef.current) return; // dedupe
    currentRef.current = m;
    setMovement(m);
    stopKeepalive();
    void dispatch(m);
    if (m !== Movement.Stop) {
      keepalive.current = setInterval(() => {
        if (!busy.current) void dispatch(currentRef.current); // skip if previous still pending
      }, KEEPALIVE_MS);
    }
  }, [dispatch]);

  /** Always sends /S, even if already stopped. */
  const stop = useCallback(() => {
    stopKeepalive();
    currentRef.current = Movement.Stop;
    setMovement(Movement.Stop);
    void dispatch(Movement.Stop);
  }, [dispatch]);

  const release = useCallback(() => {
    if (currentRef.current !== Movement.Stop) stop();
  }, [stop]);

  const testConnection = useCallback(async () => {
    setStatus("checking");
    stop();
  }, [stop]);

  // Loss of control focus → stop.
  useEffect(() => {
    const onVis = () => { if (document.visibilityState === "hidden") release(); };
    window.addEventListener("blur", release);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("blur", release);
      document.removeEventListener("visibilitychange", onVis);
      release();
      stopKeepalive();
    };
  }, [release]);

  return { baseUrl, setBaseUrl, status, lastError, latency, movement, lastSent, drive, stop, release, testConnection };
}
