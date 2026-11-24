import { describe, expect, it } from "vitest";
import { businessDay, completedRevenue } from "@/lib/dashboard-data";

describe("dashboard data", () => {
  it("shows zero revenue with no transactions", () => {
    expect(completedRevenue([])).toBe(0);
  });
  it("sums only completed transactions", () => {
    expect(completedRevenue([{ total_amount: 75000, status: "completed" }, { total_amount: 25000, status: "completed" }, { total_amount: 90000, status: "cancelled" }])).toBe(100000);
  });
  it("uses the barbershop day instead of the UTC date", () => {
    expect(businessDay(new Date("2026-11-24T20:33:00Z"), "Asia/Jakarta")).toEqual({ date: "2026-11-25", start: "2026-11-24T17:00:00.000Z", end: "2026-11-25T17:00:00.000Z" });
  });
});