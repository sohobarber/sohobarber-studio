import { describe, expect, it } from "vitest";
import { parsePrice, serviceInput } from "@/lib/service-rules";

describe("service rules", () => {
  it("parses Rupiah text to integer", () => expect(parsePrice("Rp 35.000")).toBe(35000));
  it("rejects empty name", () => expect(serviceInput.safeParse({ name: "  ", price: 1000 }).success).toBe(false));
  it("rejects negative price", () => expect(serviceInput.safeParse({ name: "Cukur", price: -1 }).success).toBe(false));
  it("accepts valid service", () => expect(serviceInput.safeParse({ name: "Cukur", price: 35000 }).success).toBe(true));
});
