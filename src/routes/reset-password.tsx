import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Nova senha — Finanças" }, { name: "description", content: "Crie uma nova senha para sua conta." }] }),
  component: () => null,
});
