import { describe, expect, it } from "vitest";
import { fromZonedTime } from "date-fns-tz";
import { availableSlots, cancellationRefundEligible, depositFor, isPaymentExpired, validProofImage } from "@/lib/booking-rules";

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
  it("supports a deposit percentage from settings", () => expect(depositFor(80000, 25)).toBe(20000));
  it("expires unpaid bookings exactly after 30 minutes", () => {
    const created = "2026-11-28T04:00:00.000Z";
    expect(isPaymentExpired(created, new Date("2026-11-28T04:30:00.000Z"))).toBe(false);
    expect(isPaymentExpired(created, new Date("2026-11-28T04:30:00.001Z"))).toBe(true);
  });
  it("allows a DP refund only at least two hours before the WIB appointment", () => {
    const now = new Date("2026-11-28T02:00:00.000Z");
    expect(cancellationRefundEligible("2026-11-28", "11:00:00", "Asia/Jakarta", now, fromZonedTime)).toBe(true);
    expect(cancellationRefundEligible("2026-11-28", "10:59:59", "Asia/Jakarta", now, fromZonedTime)).toBe(false);
  });
  it("rejects files larger than 2 MB even with an image MIME type", async () => {
    const file = new File([new Uint8Array(2 * 1024 * 1024 + 1)], "proof.jpg", { type: "image/jpeg" });
    expect(await validProofImage(file)).toBe(false);
  });
});
