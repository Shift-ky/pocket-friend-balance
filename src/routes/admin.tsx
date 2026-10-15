import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { souAdmin, listarUsuarios, excluirUsuario, enviarRedefinicao } from "@/lib/admin.functions";
import { useGrupo } from "@/lib/grupo";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Administração — Finanças" },
      { name: "description", content: "Gerencie as contas cadastradas no app." },
      { property: "og:title", content: "Administração — Finanças" },
      { property: "og:description", content: "Gerencie as contas cadastradas no app." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Admin,
});

function Admin() {
  const { session } = useGrupo();
  const qc = useQueryClient();
  const checar = useServerFn(souAdmin);
  const listar = useServerFn(listarUsuarios);
  const excluir = useServerFn(excluirUsuario);
  const redefinir = useServerFn(enviarRedefinicao);
  const [msg, setMsg] = useState("");

  const admin = useQuery({ queryKey: ["souAdmin"], queryFn: () => checar() });
  const usuarios = useQuery({ queryKey: ["usuarios"], queryFn: () => listar(), enabled: admin.data === true });

  if (admin.isLoading) return <p className="py-20 text-center text-muted-foreground">Carregando…</p>;
  if (!admin.data) return <p className="py-20 text-center text-muted-foreground">Esta página é só para o administrador.</p>;

  async function onExcluir(id: string, email: string) {
    if (!confirm(`Excluir a conta ${email}? Isso não pode ser desfeito.`)) return;
    try { await excluir({ data: { id } }); setMsg(`Conta ${email} excluída.`); qc.invalidateQueries({ queryKey: ["usuarios"] }); }
    catch (e) { setMsg((e as Error).message); }
  }
  async function onRedefinir(email: string) {
    try { await redefinir({ data: { email, origem: window.location.origin } }); setMsg(`Link de nova senha enviado para ${email}.`); }
    catch (e) { setMsg((e as Error).message); }
  }

  return (
    <main className="mx-auto max-w-3xl px-5 py-8">
      <h1 className="mb-2 font-display text-4xl">Administração</h1>
      <p className="mb-6 text-sm text-muted-foreground">Contas cadastradas no app. A redefinição envia um link para a própria pessoa criar uma nova senha.</p>
      {msg && <p className="mb-4 rounded-lg border bg-card p-3 text-sm">{msg}</p>}
      {usuarios.isLoading && <p className="text-muted-foreground">Carregando contas…</p>}
      {usuarios.error && <p className="text-debit">{(usuarios.error as Error).message}</p>}
      <ul className="space-y-3">
        {usuarios.data?.map((u) => (
          <li key={u.id} className="rounded-xl border bg-card p-4">
            <p className="break-all font-semibold">{u.email}{u.id === session.user.id && " (você)"}</p>
            <p className="text-xs text-muted-foreground">
              Cadastro: {new Date(u.criado).toLocaleDateString("pt-BR")} · {u.confirmado ? "Confirmado" : "Não confirmado"}
              {u.ultimoAcesso && ` · Último acesso: ${new Date(u.ultimoAcesso).toLocaleDateString("pt-BR")}`}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={() => onRedefinir(u.email)} className="rounded-lg border px-3 py-1.5 text-sm font-semibold">Enviar nova senha</button>
              {u.id !== session.user.id && (
                <button onClick={() => onExcluir(u.id, u.email)} className="rounded-lg border border-debit px-3 py-1.5 text-sm font-semibold text-debit">Excluir</button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
