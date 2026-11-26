import { describe, expect, it } from "vitest";
import { availableSlots, depositFor } from "@/lib/booking-rules";

describe("booking rules", () => {
  it("deposit is 50% of service price", () => expect(depositFor(80000)).toBe(40000));
  it("60-minute slots run from 10:00 with the last starting 21:00", () => {
    const s = availableSlots(60, []);
    expect(s[0]).toBe("10:00"); expect(s.at(-1)).toBe("21:00"); expect(s).toHaveLength(12);
  });
  it("slot length follows service duration", () => expect(availableSlots(90, [])).toEqual(["10:00", "11:30", "13:00", "14:30", "16:00", "17:30", "19:00", "20:30"]));
  it("excludes slots that clash with existing bookings", () => {
    const s = availableSlots(60, [{ start_time: "12:30:00", end_time: "13:30:00" }]);
    expect(s).not.toContain("12:00"); expect(s).not.toContain("13:00"); expect(s).toContain("14:00");
  });
});
