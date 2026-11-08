import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ownerEmail = "nosborx.costa@gmail.com";

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

function fail(message: string, status = 400) {
  return response({ error: message }, status);
}

function validUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (request.method !== "POST") return fail("Método não permitido.", 405);

  const url = Deno.env.get("SUPABASE_URL");
  const publishableKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !publishableKey || !serviceKey) return fail("Configuração do Supabase incompleta.", 500);

  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return fail("Não autenticado.", 401);

  const supabase = createClient(url, publishableKey, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } });
  const { data: identity, error: authError } = await supabase.auth.getUser();
  if (authError || !identity.user) return fail("Sessão inválida.", 401);
  const user = identity.user;
  const userId = user.id;
  const supabaseAdmin = createClient(url, serviceKey, { auth: { persistSession: false } });

  let payload: { action?: string; data?: Record<string, unknown> };
  try { payload = await request.json(); } catch { return fail("Solicitação inválida."); }
  const action = payload.action;
  const data = payload.data ?? {};

  const isOwner = user.email?.toLowerCase() === ownerEmail && Boolean(user.email_confirmed_at);
  const hasAdminRole = async () => {
    const { data: admin, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    return !error && Boolean(admin);
  };
  const requireOwner = async () => isOwner && await hasAdminRole();
  const claimBackupGroup = async () => {
    if (!user.email || !user.email_confirmed_at) return;
    const { data: pending } = await supabaseAdmin.from("grupo_membros").select("grupo_id,user_id,email").ilike("email", user.email).neq("user_id", userId).maybeSingle();
    if (!pending) return;
    const { error: addError } = await supabaseAdmin.from("grupo_membros").upsert({ grupo_id: pending.grupo_id, user_id: userId, email: user.email }, { onConflict: "grupo_id,user_id" });
    if (addError) throw addError;
    await supabaseAdmin.from("grupo_membros").delete().eq("grupo_id", pending.grupo_id).eq("user_id", pending.user_id);
    if (isOwner) {
      await supabaseAdmin.from("grupos").update({ criado_por: userId }).eq("id", pending.grupo_id);
      await supabaseAdmin.from("user_access").upsert({ user_id: userId, financas: true, moto: true, feira: true, estoque: true });
      await supabaseAdmin.from("user_roles").upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" });
    }
  };

  try {
    switch (action) {
      case "meusAcessos": {
        await claimBackupGroup();
        if (isOwner) return response({ financas: true, moto: true, feira: true, estoque: true });
        const { data: access, error } = await supabase.from("user_access").select("financas,moto,feira,estoque").eq("user_id", userId).maybeSingle();
        if (error) return fail("Não foi possível consultar os acessos.", 500);
        return response(access ?? { financas: true, moto: true, feira: true, estoque: true });
      }
      case "souAdmin": return response(await hasAdminRole());
      case "possoAcessarAdmin": return response(await requireOwner());
      case "possoGerenciarAdministradores": return response(await requireOwner());
      case "alterarAcessos": {
        const id = data.id;
        const access = data.acessos as Record<string, unknown> | undefined;
        if (!await requireOwner()) return fail("Acesso negado.", 403);
        if (!validUuid(id) || !access || !["financas", "moto", "feira", "estoque"].every((key) => typeof access[key] === "boolean")) return fail("Acessos inválidos.");
        const { data: target, error: targetError } = await supabaseAdmin.auth.admin.getUserById(id);
        if (targetError || !target.user) return fail("Conta não encontrada.", 404);
        if (target.user.email?.toLowerCase() === ownerEmail) return fail("Os acessos do proprietário não podem ser alterados.");
        const { error } = await supabaseAdmin.from("user_access").upsert({ user_id: id, financas: access.financas, moto: access.moto, feira: access.feira, estoque: access.estoque });
        if (error) return fail("Não foi possível salvar os acessos.", 500);
        return response({ ok: true });
      }
      case "listarUsuarios": {
        if (!await requireOwner()) return fail("Acesso negado.", 403);
        const [{ data: users, error }, { data: roles, error: rolesError }, { data: accessRows, error: accessError }] = await Promise.all([
          supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }),
          supabaseAdmin.from("user_roles").select("user_id").eq("role", "admin"),
          supabaseAdmin.from("user_access").select("*"),
        ]);
        if (error) return fail(error.message, 500);
        if (rolesError || accessError) return fail("Não foi possível consultar as permissões.", 500);
        const admins = new Set((roles ?? []).map((r) => r.user_id));
        const rows = accessRows ?? [];
        return response((users?.users ?? []).map((u) => ({ id: u.id, email: u.email ?? "", criado: u.created_at, confirmado: !!u.email_confirmed_at, ultimoAcesso: u.last_sign_in_at ?? null, administrador: admins.has(u.id), protegido: u.email?.toLowerCase() === ownerEmail, acessos: u.email?.toLowerCase() === ownerEmail ? { financas: true, moto: true, feira: true, estoque: true } : rows.find((r) => r.user_id === u.id) ?? { financas: true, moto: true, feira: true, estoque: true } })));
      }
      case "excluirUsuario": {
        if (!await requireOwner()) return fail("Acesso negado.", 403);
        if (!validUuid(data.id) || data.id === userId) return fail("ID inválido.");
        const { data: target, error } = await supabaseAdmin.auth.admin.getUserById(data.id);
        if (error || !target.user) return fail("Conta não encontrada.", 404);
        if (target.user.email?.toLowerCase() === ownerEmail) return fail("A conta proprietária não pode ser excluída.", 403);
        const { error: memberError } = await supabaseAdmin.from("grupo_membros").delete().eq("user_id", data.id);
        if (memberError) return fail("Não foi possível remover a conta do grupo.", 500);
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(data.id);
        if (deleteError) return fail(deleteError.message, 500);
        return response({ ok: true });
      }
      case "alterarAdministrador": {
        if (!await requireOwner()) return fail("Acesso negado.", 403);
        if (!validUuid(data.id) || typeof data.administrador !== "boolean") return fail("Permissão inválida.");
        const { data: target, error } = await supabaseAdmin.auth.admin.getUserById(data.id);
        if (error || !target.user) return fail("Conta não encontrada.", 404);
        if (target.user.email?.toLowerCase() === ownerEmail) return fail("As permissões da conta proprietária não podem ser alteradas.", 403);
        if (data.administrador && !target.user.email_confirmed_at) return fail("A pessoa precisa confirmar o e-mail antes de se tornar administradora.");
        if (data.administrador) {
          const { error: insertError } = await supabaseAdmin.from("user_roles").upsert({ user_id: data.id, role: "admin" }, { onConflict: "user_id,role" });
          if (insertError) return fail("Não foi possível conceder a permissão.", 500);
        } else {
          const { error: deleteError } = await supabaseAdmin.from("user_roles").delete().eq("user_id", data.id).eq("role", "admin");
          if (deleteError) return fail("Não foi possível remover a permissão.", 500);
        }
        return response({ ok: true });
      }
      case "enviarRedefinicao": {
        if (!await requireOwner()) return fail("Acesso negado.", 403);
        if (typeof data.email !== "string" || !data.email.includes("@") || typeof data.origem !== "string" || !/^https?:\/\//.test(data.origem)) return fail("E-mail ou origem inválidos.");
        const { error } = await supabase.auth.resetPasswordForEmail(data.email, { redirectTo: `${data.origem}/reset-password` });
        if (error) return fail(error.message, 500);
        return response({ ok: true });
      }
      case "atualizarCotacoes": {
        const { data: cache, error } = await supabase.from("cotacoes").select("*");
        if (error) return fail("Não foi possível consultar as cotações.", 500);
        const today = new Date().toISOString().slice(0, 10);
        if (cache?.length === 2 && cache.every((r) => r.consultado_em.slice(0, 10) === today)) return response(cache);
        const updates = await Promise.all(["USD", "EUR"].map(async (currency) => {
          try {
            const res = await fetch(`https://api.frankfurter.dev/v1/latest?base=${currency}&symbols=BRL`, { signal: AbortSignal.timeout(10000) });
            if (!res.ok) return null;
            const body = await res.json();
            const rate = Number(body?.rates?.BRL);
            if (!body?.date || !Number.isFinite(rate) || rate <= 0) return null;
            return { moeda: currency, valor_brl: rate, data: body.date, consultado_em: new Date().toISOString() };
          } catch { return null; }
        }));
        const valid = updates.filter((row): row is NonNullable<typeof row> => row !== null);
        if (valid.length) await supabaseAdmin.from("cotacoes").upsert(valid);
        return response(["USD", "EUR"].flatMap((currency) => valid.find((r) => r.moeda === currency) ?? cache?.find((r) => r.moeda === currency) ?? []));
      }
      case "linkTelegram": {
        if (!validUuid(data.grupo)) return fail("Grupo inválido.");
        const bytes = crypto.getRandomValues(new Uint8Array(24));
        const code = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
        const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(code));
        const codeHash = Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("");
        const { error } = await supabase.from("telegram_links").upsert({ user_id: userId, grupo_id: data.grupo, telegram_user_id: null, chat_id: null, code_hash: codeHash, code_expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() });
        if (error) return fail(error.message, 500);
        return response({ url: `https://t.me/Nosborx_bot?start=${code}` });
      }
      case "listTelegramReviews": {
        if (!validUuid(data.grupo)) return fail("Grupo inválido.");
        const [{ data: rows, error }, { data: link }] = await Promise.all([
          supabase.from("telegram_reviews").select("*").eq("grupo_id", data.grupo).order("created_at", { ascending: false }).limit(100),
          supabase.from("telegram_links").select("telegram_user_id").eq("user_id", userId).eq("grupo_id", data.grupo).maybeSingle(),
        ]);
        if (error) return fail(error.message, 500);
        return response({ rows: rows ?? [], linked: Boolean(link?.telegram_user_id) });
      }
      case "telegramFile": {
        if (!validUuid(data.id)) return fail("ID inválido.");
        const { data: row, error } = await supabase.from("telegram_reviews").select("file_path").eq("id", data.id).single();
        if (error || !row?.file_path) return fail("Arquivo indisponível.", 404);
        const { data: signed, error: signError } = await supabase.storage.from("telegram-documents").createSignedUrl(row.file_path, 300);
        if (signError) return fail(signError.message, 500);
        return response({ url: signed.signedUrl });
      }
      case "receiptOptions": {
        if (!validUuid(data.grupo)) return fail("Grupo inválido.");
        const [stock, links] = await Promise.all([
          supabase.from("estoque").select("id,nome").eq("grupo_id", data.grupo).order("nome"),
          supabase.from("telegram_product_links").select("nome_cupom,estoque_id").eq("grupo_id", data.grupo),
        ]);
        if (stock.error || links.error) return fail("Não foi possível consultar os produtos do estoque.", 500);
        return response({ stock: stock.data ?? [], links: links.data ?? [] });
      }
      case "reviewTelegram": {
        const allowed = ["salvar", "aprovar", "descartar"];
        if (!validUuid(data.id) || !allowed.includes(String(data.action))) return fail("Ação inválida.");
        const { data: id, error } = await supabase.rpc("telegram_review_action", { _id: data.id, _action: data.action, ...(data.valor === null ? {} : { _valor: data.valor }), ...(data.data === null ? {} : { _data: data.data }), _descricao: data.descricao, _conta: data.conta, _categoria: data.categoria, _pago: data.pago });
        if (error) return fail(error.message, 400);
        return response({ id });
      }
      case "reviewTelegramProducts": {
        if (!validUuid(data.id) || !["salvar", "feira", "estoque"].includes(String(data.action)) || !Array.isArray(data.produtos)) return fail("Ação inválida.");
        const { data: destino, error } = await supabase.rpc("telegram_products_action", { _id: data.id, _action: data.action, _produtos: data.produtos });
        if (error) return fail(error.message, 400);
        return response({ destino });
      }
      case "reviewTelegramReceipt": {
        if (!validUuid(data.id) || !["salvar", "aprovar"].includes(String(data.action)) || !Array.isArray(data.produtos)) return fail("Ação inválida.");
        const { data: id, error } = await supabase.rpc("telegram_receipt_action", { _id: data.id, _action: data.action, _valor: data.valor, _data: data.data, _descricao: data.descricao, _local: data.local, _conta: data.conta, _categoria: data.categoria, _produtos: data.produtos });
        if (error) return fail(error.message, 400);
        return response({ id });
      }
      default: return fail("Ação desconhecida.", 404);
    }
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Erro inesperado.", 500);
  }
});
