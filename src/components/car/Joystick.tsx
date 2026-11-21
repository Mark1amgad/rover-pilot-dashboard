import { useEffect, useRef, useState } from "react";
import { Movement, vectorToMovement } from "@/lib/car/movement";

interface Props { onMove: (m: Movement) => void; onRelease: () => void; active: Movement }

/** Analog-style joystick that outputs cardinal commands only (dominant axis, dead zone). */
export function Joystick({ onMove, onRelease, active }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const dragging = useRef(false);

  const update = (cx: number, cy: number) => {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const radius = r.width / 2 - 36;
    let dx = cx - (r.left + r.width / 2), dy = cy - (r.top + r.height / 2);
    const d = Math.hypot(dx, dy);
    if (d > radius) { dx = (dx / d) * radius; dy = (dy / d) * radius; }
    setPos({ x: dx, y: dy });
    onMove(vectorToMovement(dx / radius, dy / radius));
  };
  const end = () => {
    if (!dragging.current) return;
    dragging.current = false; setPos({ x: 0, y: 0 }); onRelease();
  };
  useEffect(() => () => { if (dragging.current) onRelease(); }, [onRelease]);

  const arrow = (m: Movement, cls: string, ch: string) => (
    <span className={`absolute text-xs font-mono font-bold ${cls} ${active === m ? "text-primary" : "text-muted-foreground/60"}`}>{ch}</span>
  );

  return (
    <div
      ref={ref}
      role="application"
      aria-label="Drive joystick"
      className="joystick-track relative mx-auto aspect-square w-full max-w-[300px] touch-none select-none rounded-full"
      onPointerDown={(e) => { dragging.current = true; e.currentTarget.setPointerCapture(e.pointerId); update(e.clientX, e.clientY); }}
      onPointerMove={(e) => {
        if (!dragging.current) return;
        const rect = e.currentTarget.getBoundingClientRect();
        if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) {
          end();
          if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
          return;
        }
        update(e.clientX, e.clientY);
      }}
      onPointerUp={end}
      onPointerCancel={end}
      onPointerLeave={end}
      onLostPointerCapture={end}
    >
      <div className="absolute inset-[18%] rounded-full border border-border/60" />
      <div className="absolute left-1/2 top-4 bottom-4 w-px -translate-x-1/2 bg-border/50" />
      <div className="absolute top-1/2 left-4 right-4 h-px -translate-y-1/2 bg-border/50" />
      {arrow(Movement.Forward, "top-3 left-1/2 -translate-x-1/2", "F")}
      {arrow(Movement.Backward, "bottom-3 left-1/2 -translate-x-1/2", "B")}
      {arrow(Movement.Left, "left-3 top-1/2 -translate-y-1/2", "L")}
      {arrow(Movement.Right, "right-3 top-1/2 -translate-y-1/2", "R")}
      <div
        className={`joystick-thumb absolute left-1/2 top-1/2 h-[72px] w-[72px] rounded-full ${active !== Movement.Stop ? "is-active" : ""}`}
        style={{ transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px))`, transition: dragging.current ? "none" : "transform 180ms ease-out" }}
      />
    </div>
  );
}
