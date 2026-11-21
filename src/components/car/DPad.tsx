import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Square } from "lucide-react";
import type { ReactNode } from "react";
import { Movement } from "@/lib/car/movement";
import { Button } from "@/components/ui/button";

interface Props { onMove: (m: Movement) => void; onRelease: () => void; onStop: () => void; active: Movement }

/** Press-and-hold buttons; keepalive repeat is handled by the controller hook. */
function DirectionButton({ m, children, label, onMove, onRelease, active }: Omit<Props, "onStop"> & { m: Movement; children: ReactNode; label: string }) {
  return (
    <Button
      type="button"
      aria-label={label}
      data-active={active === m}
      className="dpad-btn"
      onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); onMove(m); }}
      onPointerMove={(e) => {
        if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
        const rect = e.currentTarget.getBoundingClientRect();
        if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) {
          e.currentTarget.releasePointerCapture(e.pointerId); onRelease();
        }
      }}
      onPointerUp={onRelease}
      onPointerCancel={onRelease}
      onPointerLeave={onRelease}
      onLostPointerCapture={onRelease}
      onContextMenu={(e) => e.preventDefault()}
    >{children}</Button>
  );
}
export function DPad({ onMove, onRelease, onStop, active }: Props) {
  const shared = { onMove, onRelease, active };
  return (
    <div className="mx-auto grid w-fit grid-cols-3 gap-2 touch-none select-none">
      <span /><DirectionButton {...shared} m={Movement.Forward} label="Forward"><ArrowUp /></DirectionButton><span />
      <DirectionButton {...shared} m={Movement.Left} label="Turn left"><ArrowLeft /></DirectionButton>
      <Button type="button" aria-label="Stop" className="dpad-btn dpad-stop" onClick={onStop}><span className="flex flex-col items-center gap-0.5 text-[10px] font-bold tracking-wider"><Square className="size-4" />STOP</span></Button>
      <DirectionButton {...shared} m={Movement.Right} label="Turn right"><ArrowRight /></DirectionButton>
      <span /><DirectionButton {...shared} m={Movement.Backward} label="Backward"><ArrowDown /></DirectionButton><span />
    </div>
  );
}
