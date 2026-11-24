import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/auth")({
  beforeLoad: () => { throw redirect({ to: "/" }); },
  head: () => ({ meta: [
    { title: "Autentikasi — SOHOBARBER" },
    { name: "description", content: "Autentikasi akun SOHOBARBER." },
    { property: "og:title", content: "Autentikasi — SOHOBARBER" },
    { property: "og:description", content: "Autentikasi akun SOHOBARBER." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
});