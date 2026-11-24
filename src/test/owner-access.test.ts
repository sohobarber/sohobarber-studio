import { describe, expect, it } from "vitest";
import { canAccessOwnerDashboard } from "@/lib/owner-access";

const profile = { id: "user-id", full_name: "User", is_active: true };

describe("OWNER access", () => {
  it("allows lowercase owner", () => {
    expect(canAccessOwnerDashboard({ ...profile, role: "owner" })).toBe(true);
  });
  it("denies cashier", () => {
    expect(canAccessOwnerDashboard({ ...profile, role: "cashier" })).toBe(false);
  });
  it("denies an inactive owner", () => {
    expect(canAccessOwnerDashboard({ ...profile, role: "owner", is_active: false })).toBe(false);
  });
  it("denies barber", () => {
    expect(canAccessOwnerDashboard({ ...profile, role: "barber" })).toBe(false);
  });
  it("denies missing profiles", () => {
    expect(canAccessOwnerDashboard(null)).toBe(false);
  });
  it("does not normalize an invalid uppercase role", () => {
    expect(canAccessOwnerDashboard({ ...profile, role: "OWNER" })).toBe(false);
  });
});
