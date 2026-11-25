import type { ComponentType, ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  update: vi.fn(),
  invalidate: vi.fn(),
  service: { id: "81fcef33-32bd-40e6-ad73-b7c87d0ceb41", name: "Haircut", price: 40000, duration_minutes: 60, is_active: true },
}));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: object) => ({
    options,
    useLoaderData: () => ({ profile: { id: "owner", full_name: "Owner", role: "owner", is_active: true }, services: [mocks.service] }),
  }),
  useRouter: () => ({ invalidate: mocks.invalidate }),
  redirect: vi.fn(),
}));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/lib/services.functions", () => ({
  createService: vi.fn(), listServices: vi.fn(), setServiceActive: vi.fn(), updateService: mocks.update,
}));
vi.mock("@/components/owner-shell", () => ({
  OwnerShell: ({ children }: { children: ReactNode }) => <>{children}</>,
  OwnerError: () => null,
  OwnerNotFound: () => null,
}));

import { Route } from "@/routes/_authenticated/owner_.layanan";

describe("editing an existing service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.update.mockResolvedValue({ ok: true });
    mocks.invalidate.mockResolvedValue(undefined);
  });

  it("pencil editing updates the selected service ID and reads fresh values when reopened", async () => {
    const Page = Route.options.component as ComponentType;
    render(<Page />);
    fireEvent.click(screen.getByRole("button", { name: "Ubah layanan" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Harga", exact: true }), { target: { value: "45.000" } });
    fireEvent.click(screen.getByRole("button", { name: "Simpan", exact: true }));
    await waitFor(() => expect(mocks.update).toHaveBeenCalledWith({
      data: { id: "81fcef33-32bd-40e6-ad73-b7c87d0ceb41", name: "Haircut", price: 45000 },
    }));
    await waitFor(() => expect(mocks.invalidate).toHaveBeenCalledWith({ sync: true }));
    await waitFor(() => expect(screen.queryByRole("button", { name: "Simpan", exact: true })).toBeNull());
    fireEvent.click(screen.getByRole("button", { name: "Ubah layanan" }));
    expect(screen.getByRole("textbox", { name: "Harga", exact: true })).toHaveValue("40000");
  });
});