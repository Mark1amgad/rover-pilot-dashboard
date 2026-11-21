import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AlertTriangle, Cpu, Gauge, Info, Loader2, OctagonX, Plug, Radio, Wifi } from "lucide-react";
import { useCarController, type ConnStatus } from "@/hooks/useCarController";
import { Joystick } from "@/components/car/Joystick";
import { DPad } from "@/components/car/DPad";
import { MOVEMENT_LABEL, MOVEMENT_ROUTE, Movement } from "@/lib/car/movement";
import { NETWORK_GUIDANCE, WIFI_SSID, WIFI_PASSWORD } from "@/lib/car/esp32-client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Smart Car Controller — ESP32 Vehicle Control" },
      { name: "description", content: "Offline-capable dashboard for Mark's ESP32 smart car." },
      { property: "og:title", content: "Smart Car Controller" },
      { property: "og:description", content: "Drive an ESP32 smart car over its own Wi-Fi." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

const STATUS: Record<ConnStatus, { label: string; cls: string }> = {
  disconnected: { label: "Disconnected", cls: "badge-off" },
  checking: { label: "Checking…", cls: "badge-wait" },
  verified: { label: "HTTP verified", cls: "badge-on" },
  dispatched: { label: "Dispatched · unverified", cls: "badge-wait" },
  error: { label: "Blocked / unreachable", cls: "badge-err" },
};

function Dashboard() {
  const car = useCarController();
  const [draft, setDraft] = useState<string | null>(null);
  const st = STATUS[car.status];
  const espHosted = typeof window !== "undefined" && window.location.hostname === "192.168.4.1";

  return (
    <main className="min-h-screen bg-app px-4 py-6 sm:px-6 lg:py-10">
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-xl border border-primary/30 bg-primary/10 text-primary"><Cpu className="size-5" /></div>
            <div><h1 className="font-display text-2xl font-bold tracking-[0.18em]">SMART CAR</h1><p className="font-mono text-[11px] tracking-[0.3em] text-muted-foreground">ESP32 VEHICLE CONTROL</p></div>
          </div>
          <span className={`status-badge ${st.cls}`}><span className="dot" />{st.label}</span>
        </header>

        {!espHosted && <div className="panel border-warning/40 p-4 text-sm text-warning">
          <b>Offline control:</b> connect to <b>{WIFI_SSID}</b> (password <code>{WIFI_PASSWORD}</code>) and open <b>http://192.168.4.1</b>. This hosted preview is for design review; browsers may block it from controlling the local ESP32.
        </div>}

        <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
          <section className="panel self-start p-5 sm:p-7">
            <div className="mb-5 flex items-center justify-between"><h2 className="panel-title">Drive</h2><span className="font-mono text-xs text-muted-foreground">CMD <span className={car.movement === Movement.Stop ? "text-foreground" : "text-primary"}>{MOVEMENT_ROUTE[car.movement]}</span></span></div>
            <div className="grid items-center gap-8 md:grid-cols-[1fr_auto]">
              <Joystick onMove={car.drive} onRelease={car.release} active={car.movement} />
              <div className="space-y-4"><p className="text-center text-xs uppercase tracking-widest text-muted-foreground">Hold to drive</p><DPad onMove={car.drive} onRelease={car.release} onStop={car.stop} active={car.movement} /></div>
            </div>
            <Button type="button" onClick={car.stop} className="estop mt-7 w-full whitespace-normal text-center"><OctagonX className="size-6" /> EMERGENCY STOP</Button>
            <p className="mt-2 text-center text-[11px] text-muted-foreground">Software stop — requests <code>/stop</code>. Not a physical power cutoff.</p>
          </section>

          <aside className="space-y-5">
            <section className="panel p-5">
              <h2 className="panel-title mb-4">Status</h2>
              <dl className="space-y-3 text-sm">
                <Row k="Link" v={st.label} /><Row k="Movement" v={MOVEMENT_LABEL[car.movement]} accent={car.movement !== Movement.Stop} />
                <Row k="Last request" v={car.lastRequest ?? "—"} /><Row k="Last verified reply" v={car.lastVerified ?? "—"} />
                <Row k="Verified round trip" v={car.latency != null && car.status === "verified" ? `${car.latency} ms` : "—"} />
              </dl>
              {car.lastError && <p className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">{car.lastError}</p>}
              {car.status === "dispatched" && <p className="mt-3 text-xs text-warning">Opaque response: request dispatch is not proof that the firmware accepted the command.</p>}
              {car.status === "verified" && <p className="mt-3 text-xs text-muted-foreground">Readable HTTP response received; this does not verify physical motor movement.</p>}
            </section>

            <section className="panel p-5">
              <h2 className="panel-title mb-4 flex items-center gap-2"><Plug className="size-4" />Connection</h2>
              <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (draft != null) car.setBaseUrl(draft); setDraft(null); void car.testConnection(); }}>
                <input aria-label="ESP32 base URL" className="h-10 min-w-0 flex-1 rounded-lg border border-input bg-background/60 px-3 font-mono text-sm outline-none focus:border-primary" value={draft ?? car.baseUrl} onChange={(e) => setDraft(e.target.value)} />
                <Button className="btn-primary" type="submit" disabled={car.status === "checking"}>{car.status === "checking" ? <Loader2 className="size-4 animate-spin" /> : <Radio className="size-4" />} Test</Button>
              </form>
              <p className="mt-3 flex gap-2 text-xs text-muted-foreground"><Wifi className="mt-0.5 size-3.5 shrink-0" /><span>Join <b className="text-foreground">{WIFI_SSID}</b> using password <code>{WIFI_PASSWORD}</code>. For offline operation, open this dashboard from the ESP32 at <code>http://192.168.4.1</code>; then controls use same-origin HTTP.</span></p>
              {!espHosted && <p className="mt-3 text-xs text-muted-foreground">{NETWORK_GUIDANCE}</p>}
              <a href="http://192.168.4.1" target="_blank" rel="noreferrer" className="mt-3 inline-flex text-xs text-primary underline">Open offline ESP32 dashboard</a>
            </section>

            <section className="panel p-5">
              <div className="flex items-center justify-between"><h2 className="panel-title flex items-center gap-2"><Gauge className="size-4" />Speed control</h2><output className="font-mono text-sm text-primary" htmlFor="motor-speed">{car.speed} / 255</output></div>
              <input id="motor-speed" type="range" min={0} max={255} step={1} value={car.speed} onChange={(e) => car.setSpeed(Number(e.target.value))} aria-label="Motor speed" className="mt-4 w-full accent-primary" />
              <div className="mt-1 flex justify-between font-mono text-[11px] text-muted-foreground"><span>0</span><span>255</span></div>
              <p className="mt-2 text-xs text-muted-foreground">PWM target: {car.speed}. Default 180. Changes request <code>/speed?v={car.speed}</code>.</p>
            </section>
          </aside>
        </div>
        <section className="grid gap-3 md:grid-cols-2">
          <Note icon={<Info className="size-4" />} title="Hardware limits">One L298N: channel A drives both right motors, channel B both left. Forward, reverse and differential turns only — no strafe or diagonal moves.</Note>
          <Note icon={<AlertTriangle className="size-4" />} title="Safety">Releasing controls or losing page focus requests <code>/stop</code>. Firmware watchdog is also recommended; keep a physical power cutoff within reach.</Note>
        </section>
      </div>
    </main>
  );
}
function Row({ k, v, accent }: { k: string; v: string; accent?: boolean }) {
  return <div className="flex justify-between gap-3 border-b border-border/50 pb-2 last:border-0"><dt className="text-muted-foreground">{k}</dt><dd className={`min-w-0 break-words text-right font-mono ${accent ? "text-primary" : ""}`}>{v}</dd></div>;
}
function Note({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return <div className="panel flex gap-3 p-4 text-xs text-muted-foreground"><span className="text-primary">{icon}</span><div><p className="mb-1 font-semibold text-foreground">{title}</p>{children}</div></div>;
}
