/**
 * Movement commands supported by the EXISTING ESP32 firmware.
 * Hardware: one L298N — Channel A drives both right motors, Channel B both left motors.
 * So only forward / backward / differential turns exist. No strafe, no diagonals.
 * PWM enable GPIO25/26 supports 8-bit speed; direction pins are GPIO16–19.
 */
export enum Movement {
  Forward = "F",
  Backward = "B",
  Left = "L",
  Right = "R",
  Stop = "S",
}

export const MOVEMENT_ROUTE: Record<Movement, string> = {
  [Movement.Forward]: "/forward",
  [Movement.Backward]: "/backward",
  [Movement.Left]: "/left",
  [Movement.Right]: "/right",
  [Movement.Stop]: "/stop",
};

export const MOVEMENT_LABEL: Record<Movement, string> = {
  [Movement.Forward]: "Forward",
  [Movement.Backward]: "Backward",
  [Movement.Left]: "Turn Left",
  [Movement.Right]: "Turn Right",
  [Movement.Stop]: "Stopped",
};

/**
 * Map a joystick offset (normalized -1..1, y positive = down) to a cardinal movement.
 * Diagonals resolve to the dominant axis only. Inside the dead zone → Stop.
 */
export function vectorToMovement(x: number, y: number, deadZone = 0.25): Movement {
  if (Math.hypot(x, y) < deadZone) return Movement.Stop;
  if (Math.abs(x) > Math.abs(y)) return x > 0 ? Movement.Right : Movement.Left;
  return y < 0 ? Movement.Forward : Movement.Backward;
}
