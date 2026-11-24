import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import type { Database } from "@/integrations/supabase/types";
import { ownerSummary } from "@/lib/owner.server";

function emptyClient(failing = false) {
  return createClient<Database>("https://unit-test.invalid", "unit-test-publishable-key", {
    auth: { persistSession: false, autoRefreshToken: false, storageKey: failing ? "failed-summary-test" : "empty-summary-test" },
    global: { fetch: async (_input, init) => {
      if (failing) return new Response(JSON.stringify({ message: "access denied" }), { status: 403, headers: { "content-type": "application/json" } });
      return new Response(init?.method === "HEAD" ? null : "[]", {
        status: 200,
        headers: { "content-type": "application/json", "content-range": "*/0" },
      });
    } },
  });
}

describe("empty real-data responses", () => {
  it("shows zero for all four dashboard metrics when the tables are empty", async () => {
    const summary = await ownerSummary(emptyClient());
    expect(summary.revenue).toBe(0);
    expect(summary.transactions).toBe(0);
    expect(summary.bookings).toBe(0);
    expect(summary.customers).toBe(0);
    expect(summary.upcoming).toEqual([]);
    expect(summary.recent).toEqual([]);
  });
  it("does not turn a failed read into invented zero data", async () => {
    await expect(ownerSummary(emptyClient(true))).rejects.toThrow();
  });
});