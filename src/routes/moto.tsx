import { WalletsPage } from "@/components/wallets-page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/moto")({
  head: () => ({ meta: [
    { title: "MarIA — Carteiras" },
    { name: "description", content: "Gerencie suas carteiras e acompanhe os saldos." },
    { property: "og:title", content: "MarIA — Carteiras" },
    { property: "og:description", content: "Gerencie suas carteiras e acompanhe os saldos." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: WalletsPage,
});
