import { describe, expect, it } from "vitest";
import { updateSchedule } from "../src/lib/sm2";

describe("updateSchedule", () => {
  it("resets interval to 1 on again", () => {
    const result = updateSchedule(2.5, 5, 0);
    expect(result.interval).toBe(1);
    expect(result.ease).toBeGreaterThanOrEqual(1.3);
  });

  it("boosts interval on easy", () => {
    const result = updateSchedule(2.5, 3, 5);
    expect(result.interval).toBeGreaterThan(3);
    expect(result.ease).toBeGreaterThan(2.5);
  });

  it("handles initial reviews", () => {
    const first = updateSchedule(2.5, 0, 4);
    expect(first.interval).toBe(1);

    const second = updateSchedule(first.ease, first.interval, 4);
    expect(second.interval).toBe(3);
  });
});
