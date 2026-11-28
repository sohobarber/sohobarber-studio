import { createFileRoute, redirect } from "@tanstack/react-router";
import { OwnerError, OwnerShell } from "@/components/owner-shell";
import { CashierWorkspace } from "@/components/cashier-workspace";
import { getCashierWorkspace } from "@/lib/cashier.functions";
import { dashboardHead } from "@/lib/dashboard-data";

export const Route = createFileRoute("/_authenticated/owner_/kasir")({
  loader: async () => {
    const data = await getCashierWorkspace();
    if (data.profile.role !== "owner") throw redirect({ to: "/" });
    return data;
  },
  head: () => dashboardHead("Kasir"),
  errorComponent: OwnerError,
  component: () => {
    const data = Route.useLoaderData();
    return <OwnerShell profile={data.profile} active="kasir"><CashierWorkspace data={data} /></OwnerShell>;
  },
});
