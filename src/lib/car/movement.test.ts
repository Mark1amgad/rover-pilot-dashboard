import { describe, expect, it } from "vitest";
import { Movement, MOVEMENT_ROUTE, vectorToMovement } from "./movement";

describe("joystick mapping", () => {
  it("inside dead zone is stop", () => expect(vectorToMovement(0.1, 0.1)).toBe(Movement.Stop));
  it("up is forward", () => expect(vectorToMovement(0, -0.9)).toBe(Movement.Forward));
  it("down is backward", () => expect(vectorToMovement(0, 0.9)).toBe(Movement.Backward));
  it("diagonal picks dominant axis", () => expect(vectorToMovement(0.8, -0.5)).toBe(Movement.Right));
  it("routes match firmware", () =>
    expect(MOVEMENT_ROUTE).toEqual({ F: "/forward", B: "/backward", L: "/left", R: "/right", S: "/stop" }));
});
