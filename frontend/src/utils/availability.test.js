import { describe, expect, it } from "vitest";

import { getNextAvailableDate, isSlotAllowed } from "./availability";

describe("availability helpers", () => {
  it("finds the next date that matches a weekday availability rule", () => {
    const nextDate = getNextAvailableDate("2026-07-11", ["monday", "wednesday", "friday"]);
    expect(nextDate).toBe("2026-07-13");
  });

  it("allows slots that fall within an availability window", () => {
    expect(isSlotAllowed("2026-07-13T10:00", ["monday:09:00-12:00"])).toBe(true);
    expect(isSlotAllowed("2026-07-13T13:00", ["monday:09:00-12:00"])).toBe(false);
  });
});
