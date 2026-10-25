import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "MarIA — Nova senha" }, { name: "description", content: "Crie uma nova senha para sua conta." }, { property: "og:title", content: "MarIA — Nova senha" }, { property: "og:description", content: "Recupere o acesso à sua conta de finanças." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: () => null,
});
