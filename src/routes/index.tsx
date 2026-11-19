import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AlertTriangle, Cpu, Gauge, Info, Loader2, OctagonX, Plug, Radio, Wifi } from "lucide-react";
import { useCarController, type ConnStatus } from "@/hooks/useCarController";
import { Joystick } from "@/components/car/Joystick";
import { DPad } from "@/components/car/DPad";
import { MOVEMENT_LABEL, MOVEMENT_ROUTE, Movement } from "@/lib/car/movement";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Smart Car Controller — ESP32 Vehicle Control" },
      { name: "description", content: "Joystick and D-pad dashboard for driving Mark's ESP32 smart car over local Wi-Fi." },
      { property: "og:title", content: "Smart Car Controller" },
      { property: "og:description", content: "Drive an ESP32 smart car from your phone over its local Wi-Fi." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

const STATUS: Record<ConnStatus, { label: string; cls: string }> = {
  disconnected: { label: "Disconnected", cls: "badge-off" },
  checking: { label: "Checking…", cls: "badge-wait" },
  connected: { label: "Connected", cls: "badge-on" },
  error: { label: "Unreachable", cls: "badge-err" },
};

function Dashboard() {
  const car = useCarController();
  const [draft, setDraft] = useState<string | null>(null);
  const st = STATUS[car.status];

  return (
    <main className="min-h-screen bg-app px-4 py-6 sm:px-6 lg:py-10">
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-xl border border-primary/30 bg-primary/10 text-primary"><Cpu className="size-5" /></div>
            <div>
              <h1 className="font-display text-2xl font-bold tracking-[0.18em]">SMART CAR</h1>
              <p className="font-mono text-[11px] tracking-[0.3em] text-muted-foreground">ESP32 VEHICLE CONTROL</p>
            </div>
          </div>
          <span className={`status-badge ${st.cls}`}><span className="dot" />{st.label}</span>
        </header>

        <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
          <section className="panel self-start p-5 sm:p-7">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="panel-title">Drive</h2>
              <span className="font-mono text-xs text-muted-foreground">
                CMD <span className={car.movement === Movement.Stop ? "text-foreground" : "text-primary"}>{MOVEMENT_ROUTE[car.movement]}</span>
              </span>
            </div>
            <div className="grid items-center gap-8 md:grid-cols-[1fr_auto]">
              <Joystick onMove={car.drive} onRelease={car.release} active={car.movement} />
              <div className="space-y-4">
                <p className="text-center text-xs uppercase tracking-widest text-muted-foreground">Hold to drive</p>
                <DPad onMove={car.drive} onRelease={car.release} onStop={car.stop} active={car.movement} />
              </div>
            </div>
            <button type="button" onClick={car.stop} className="estop mt-7 w-full">
              <OctagonX className="size-6" /> EMERGENCY STOP
            </button>
            <p className="mt-2 text-center text-[11px] text-muted-foreground">Software stop — sends <code>/S</code>. Not a physical power cutoff.</p>
          </section>

          <aside className="space-y-5">
            <section className="panel p-5">
              <h2 className="panel-title mb-4">Status</h2>
              <dl className="space-y-3 text-sm">
                <Row k="Link" v={st.label} />
                <Row k="Movement" v={MOVEMENT_LABEL[car.movement]} accent={car.movement !== Movement.Stop} />
                <Row k="Last acknowledged" v={car.lastSent ? MOVEMENT_ROUTE[car.lastSent] : "—"} />
                <Row k="Round trip" v={car.latency != null && car.status === "connected" ? `${car.latency} ms` : "—"} />
              </dl>
              {car.lastError && <p className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">{car.lastError}</p>}
            </section>

            <section className="panel p-5">
              <h2 className="panel-title mb-4 flex items-center gap-2"><Plug className="size-4" />Connection</h2>
              <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (draft != null) car.setBaseUrl(draft); setDraft(null); void car.testConnection(); }}>
                <input
                  aria-label="ESP32 base URL"
                  className="h-10 min-w-0 flex-1 rounded-lg border border-input bg-background/60 px-3 font-mono text-sm outline-none focus:border-primary"
                  value={draft ?? car.baseUrl}
                  onChange={(e) => setDraft(e.target.value)}
                />
                <button className="btn-primary" type="submit" disabled={car.status === "checking"}>
                  {car.status === "checking" ? <Loader2 className="size-4 animate-spin" /> : <Radio className="size-4" />} Test
                </button>
              </form>
              <p className="mt-3 flex gap-2 text-xs text-muted-foreground">
                <Wifi className="mt-0.5 size-3.5 shrink-0" />
                <span>Join Wi-Fi <b className="text-foreground">ESP32-Motors</b> (password <code>12345678</code>) first. Browsers may block an HTTPS page from reaching a local HTTP device; if tests fail, that may be why. Test sends a harmless <code>/S</code>.</span>
              </p>
            </section>

            <section className="panel p-5 opacity-80">
              <div className="flex items-center justify-between">
                <h2 className="panel-title flex items-center gap-2"><Gauge className="size-4" />Speed control</h2>
                <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">Coming soon</span>
              </div>
              <input type="range" disabled aria-label="Speed (disabled)" className="mt-4 w-full cursor-not-allowed opacity-40" />
              <p className="mt-2 text-xs text-muted-foreground">Firmware has no PWM yet — motors run at full speed. This slider does nothing.</p>
            </section>
          </aside>
        </div>

        <section className="grid gap-3 md:grid-cols-2">
          <Note icon={<Info className="size-4" />} title="Hardware limits">One L298N: channel A drives both right motors, channel B both left. Forward, reverse and differential turns only — no strafe or diagonal moves.</Note>
          <Note icon={<AlertTriangle className="size-4" />} title="Safety">Releasing controls, leaving the tab or losing focus sends <code>/S</code>, but dropped Wi-Fi can't be caught here. Add a firmware timeout that stops motors if no command arrives.</Note>
        </section>
      </div>
    </main>
  );
}

function Row({ k, v, accent }: { k: string; v: string; accent?: boolean }) {
  return <div className="flex justify-between border-b border-border/50 pb-2 last:border-0"><dt className="text-muted-foreground">{k}</dt><dd className={`font-mono ${accent ? "text-primary" : ""}`}>{v}</dd></div>;
}
function Note({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return <div className="panel flex gap-3 p-4 text-xs text-muted-foreground"><span className="text-primary">{icon}</span><div><p className="mb-1 font-semibold text-foreground">{title}</p>{children}</div></div>;
}
