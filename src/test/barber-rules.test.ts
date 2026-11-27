import { describe, expect, it } from "vitest";
import { barberInput, FIRST_BARBER_NAME } from "@/lib/barber-rules";

describe("barberInput", () => {
  it("accepts the first barber name without phone", () => {
    expect(barberInput.parse({ full_name: FIRST_BARBER_NAME, phone: "" })).toEqual({ full_name: "SOHO BARBERSHOP", phone: null });
  });
  it("rejects an empty name", () => {
    expect(barberInput.safeParse({ full_name: "  " }).success).toBe(false);
  });
  it("rejects letters in phone", () => {
    expect(barberInput.safeParse({ full_name: "A", phone: "abc" }).success).toBe(false);
  });
});
