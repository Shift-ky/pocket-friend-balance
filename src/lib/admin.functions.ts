import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { contaProtegida, eProprietario } from "@/lib/admin-permissions";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type Ctx = { supabase: SupabaseClient<Database>; userId: string };

async function exigirAdmin(context: Ctx) {
  const { data, error } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (error || !data) throw new Error("Acesso negado");
}

async function exigirProprietario(context: Ctx) {
  await exigirAdmin(context);
  const { data, error } = await context.supabase.auth.getUser();
  if (error || data.user?.id !== context.userId || !eProprietario(data.user)) {
    throw new Error("Somente o proprietário pode acessar a administração de contas.");
  }
}

export const possoAcessarAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: admin, error: roleError } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (roleError || !admin) return false;
    const { data, error } = await context.supabase.auth.getUser();
    return !error && data.user?.id === context.userId && eProprietario(data.user);
  });

export const souAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    return !!data;
  });

export const listarUsuarios = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await exigirProprietario(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    if (error) throw new Error(error.message);
    const { data: roles, error: rolesError } = await supabaseAdmin.from("user_roles").select("user_id").eq("role", "admin");
    if (rolesError) throw new Error("Não foi possível consultar as permissões.");
    const admins = new Set(roles.map((r) => r.user_id));
    return data.users.map((u) => ({
      id: u.id,
      email: u.email ?? "",
      criado: u.created_at,
      confirmado: !!u.email_confirmed_at,
      ultimoAcesso: u.last_sign_in_at ?? null,
      administrador: admins.has(u.id),
      protegido: contaProtegida(u),
    }));
  });

export const excluirUsuario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => {
    if (typeof d?.id !== "string" || d.id.length < 10) throw new Error("ID inválido");
    return d;
  })
  .handler(async ({ data, context }) => {
    await exigirProprietario(context);
    if (data.id === context.userId) throw new Error("Você não pode excluir a própria conta.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: target, error: targetError } = await supabaseAdmin.auth.admin.getUserById(data.id);
    if (targetError || !target.user) throw new Error("Conta não encontrada.");
    if (contaProtegida(target.user)) throw new Error("A conta proprietária não pode ser excluída.");
    const { error: membrosError } = await supabaseAdmin.from("grupo_membros").delete().eq("user_id", data.id);
    if (membrosError) throw new Error("Não foi possível remover a conta do grupo.");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const possoGerenciarAdministradores = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await exigirAdmin(context);
    const { data, error } = await context.supabase.auth.getUser();
    return !error && data.user?.id === context.userId && eProprietario(data.user);
  });

export const alterarAdministrador = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; administrador: boolean }) => {
    if (!d || typeof d.id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(d.id)
      || typeof d.administrador !== "boolean") throw new Error("Permissão inválida.");
    return d;
  })
  .handler(async ({ data, context }) => {
    await exigirProprietario(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: target, error: targetError } = await supabaseAdmin.auth.admin.getUserById(data.id);
    if (targetError || !target.user) throw new Error("Conta não encontrada.");
    if (contaProtegida(target.user)) throw new Error("As permissões da conta proprietária não podem ser alteradas.");
    if (data.administrador && !target.user.email_confirmed_at) throw new Error("A pessoa precisa confirmar o e-mail antes de se tornar administradora.");
    if (data.administrador) {
      const { data: role, error: readError } = await supabaseAdmin.from("user_roles").select("id").eq("user_id", data.id).eq("role", "admin").limit(1);
      if (readError) throw new Error("Não foi possível consultar a permissão.");
      if (!role.length) {
        const { error } = await supabaseAdmin.from("user_roles").insert({ user_id: data.id, role: "admin" });
        if (error && error.code !== "23505") throw new Error("Não foi possível conceder a permissão.");
      }
    } else {
      const { error } = await supabaseAdmin.from("user_roles").delete().eq("user_id", data.id).eq("role", "admin");
      if (error) throw new Error("Não foi possível remover a permissão.");
    }
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
    await exigirProprietario(context);
    const { error } = await context.supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${data.origem}/reset-password`,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
