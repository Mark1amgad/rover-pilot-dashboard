import { useEffect, useRef, useState } from "react";
import { Movement, vectorToMovement } from "@/lib/car/movement";

interface Props { onMove: (m: Movement) => void; onRelease: () => void; active: Movement }

/** Analog-style joystick. Pointer capture keeps driving while the finger moves outside the track. */
export function Joystick({ onMove, onRelease, active }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const dragging = useRef(false);

  const update = (cx: number, cy: number) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const radius = Math.max(1, r.width / 2 - 36);
    let dx = cx - (r.left + r.width / 2);
    let dy = cy - (r.top + r.height / 2);
    const d = Math.hypot(dx, dy);
    if (d > radius) { dx = (dx / d) * radius; dy = (dy / d) * radius; }
    setPos({ x: dx, y: dy });
    onMove(vectorToMovement(dx / radius, dy / radius));
  };

  const end = () => {
    if (!dragging.current) return;
    dragging.current = false;
    setPos({ x: 0, y: 0 });
    onRelease();
  };

  useEffect(() => () => { if (dragging.current) onRelease(); }, [onRelease]);

  const arrow = (m: Movement, cls: string, ch: string) => (
    <span aria-hidden="true" className={`pointer-events-none absolute text-xs font-mono font-bold ${cls} ${active === m ? "text-primary" : "text-muted-foreground/60"}`}>{ch}</span>
  );

  return (
    <div
      ref={ref}
      role="application"
      aria-label="Drive joystick"
      className="joystick-track relative mx-auto aspect-square w-full max-w-[300px] touch-none select-none rounded-full"
      onPointerDown={(e) => {
        if (e.button !== 0 && e.pointerType === "mouse") return;
        e.preventDefault();
        dragging.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        update(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => {
        if (!dragging.current) return;
        // Do not stop at the track boundary: captured pointer events continue outside it.
        // update() clamps the stick to its circular travel radius.
        update(e.clientX, e.clientY);
      }}
      onPointerUp={end}
      onPointerCancel={end}
      onLostPointerCapture={end}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="pointer-events-none absolute inset-[18%] rounded-full border border-border/60" />
      <div className="pointer-events-none absolute left-1/2 top-4 bottom-4 w-px -translate-x-1/2 bg-border/50" />
      <div className="pointer-events-none absolute top-1/2 left-4 right-4 h-px -translate-y-1/2 bg-border/50" />
      {arrow(Movement.Forward, "top-3 left-1/2 -translate-x-1/2", "F")}
      {arrow(Movement.Backward, "bottom-3 left-1/2 -translate-x-1/2", "B")}
      {arrow(Movement.Left, "left-3 top-1/2 -translate-y-1/2", "L")}
      {arrow(Movement.Right, "right-3 top-1/2 -translate-y-1/2", "R")}
      <div
        aria-hidden="true"
        className={`joystick-thumb pointer-events-none absolute left-1/2 top-1/2 h-[72px] w-[72px] rounded-full ${active !== Movement.Stop ? "is-active" : ""}`}
        style={{ transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px))`, transition: dragging.current ? "none" : "transform 180ms ease-out" }}
      />
    </div>
  );
}
