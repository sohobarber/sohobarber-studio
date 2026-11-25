import { describe, expect, it } from "vitest";
import { isDuplicateServiceName, parsePrice, serviceInput } from "@/lib/service-rules";

describe("service rules", () => {
  it("parses Rupiah text to integer", () => expect(parsePrice("Rp 35.000")).toBe(35000));
  it("rejects empty name", () => expect(serviceInput.safeParse({ name: "  ", price: 1000 }).success).toBe(false));
  it("rejects negative price", () => expect(serviceInput.safeParse({ name: "Cukur", price: -1 }).success).toBe(false));
  it("accepts valid service", () => expect(serviceInput.safeParse({ name: "Cukur", price: 35000 }).success).toBe(true));
  it("identifies 23505 only for the services_name_key constraint", () => {
    expect(isDuplicateServiceName({ code: "23505", message: 'duplicate key value violates unique constraint "services_name_key"' })).toBe(true);
    expect(isDuplicateServiceName({ code: "23505", message: "duplicate key", details: "services_name_key" })).toBe(true);
    expect(isDuplicateServiceName({ code: "23505", message: "duplicate key", constraint: "services_name_key" })).toBe(true);
    expect(isDuplicateServiceName({ code: "42501", message: "services_name_key" })).toBe(false);
    expect(isDuplicateServiceName({ code: "23505", message: 'duplicate key value violates unique constraint "services_pkey"' })).toBe(false);
    expect(isDuplicateServiceName({ code: "23505", message: "services_name_key_other" })).toBe(false);
  });
});
