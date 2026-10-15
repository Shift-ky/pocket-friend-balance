import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Ctx = { supabase: any; userId: string };

async function exigirAdmin(context: Ctx) {
  const { data, error } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (error || !data) throw new Error("Acesso negado");
}

export const souAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    return !!data;
  });

export const listarUsuarios = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await exigirAdmin(context as Ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    if (error) throw new Error(error.message);
    return data.users.map((u) => ({
      id: u.id,
      email: u.email ?? "",
      criado: u.created_at,
      confirmado: !!u.email_confirmed_at,
      ultimoAcesso: u.last_sign_in_at ?? null,
    }));
  });

export const excluirUsuario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => {
    if (typeof d?.id !== "string" || d.id.length < 10) throw new Error("ID inválido");
    return d;
  })
  .handler(async ({ data, context }) => {
    await exigirAdmin(context as Ctx);
    if (data.id === context.userId) throw new Error("Você não pode excluir a própria conta.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("grupo_membros").delete().eq("user_id", data.id);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const enviarRedefinicao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { email: string; origem: string }) => {
    if (typeof d?.email !== "string" || !d.email.includes("@")) throw new Error("E-mail inválido");
    if (typeof d?.origem !== "string" || !/^https?:\/\//.test(d.origem)) throw new Error("Origem inválida");
    return d;
  })
  .handler(async ({ data, context }) => {
    await exigirAdmin(context as Ctx);
    const { error } = await context.supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${data.origem}/reset-password`,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
