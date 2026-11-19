import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Square } from "lucide-react";
import type { ReactNode } from "react";
import { Movement } from "@/lib/car/movement";

interface Props { onMove: (m: Movement) => void; onRelease: () => void; onStop: () => void; active: Movement }

/** Press-and-hold buttons; keepalive repeat is handled by the controller hook. */
export function DPad({ onMove, onRelease, onStop, active }: Props) {
  const Btn = ({ m, children, label }: { m: Movement; children: ReactNode; label: string }) => (
    <button
      type="button"
      aria-label={label}
      data-active={active === m}
      className="dpad-btn"
      onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); onMove(m); }}
      onPointerUp={onRelease}
      onPointerCancel={onRelease}
      onLostPointerCapture={onRelease}
      onContextMenu={(e) => e.preventDefault()}
    >{children}</button>
  );
  return (
    <div className="mx-auto grid w-fit grid-cols-3 gap-2 touch-none select-none">
      <span /><Btn m={Movement.Forward} label="Forward"><ArrowUp /></Btn><span />
      <Btn m={Movement.Left} label="Turn left"><ArrowLeft /></Btn>
      <button type="button" aria-label="Stop" className="dpad-btn dpad-stop" onClick={onStop}><Square className="size-4" /></button>
      <Btn m={Movement.Right} label="Turn right"><ArrowRight /></Btn>
      <span /><Btn m={Movement.Backward} label="Backward"><ArrowDown /></Btn><span />
    </div>
  );
}
