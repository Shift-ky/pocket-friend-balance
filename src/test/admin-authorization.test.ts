import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder = {
      middleware: () => builder,
      inputValidator: () => builder,
      handler: (handler: unknown) => handler,
    };
    return builder;
  },
}));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
const mocks = vi.hoisted(() => ({ getUserById: vi.fn(), from: vi.fn() }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { auth: { admin: { getUserById: mocks.getUserById } }, from: mocks.from } }));
import { alterarAdministrador, excluirUsuario, listarUsuarios, enviarRedefinicao, possoAcessarAdmin, souAdmin } from "@/lib/admin.functions";

type Handler = (input: { data: { id: string; administrador?: boolean }; context: unknown }) => Promise<unknown>;
const alterar = alterarAdministrador as unknown as Handler;
const excluir = excluirUsuario as unknown as Handler;
const owner = { id: "3f3f6b62-d686-4451-b75f-a108adfb813d", email: "robson-costa@outlook.com.br", email_confirmed_at: "2026-10-18" };
const other = { id: "6106a84c-f28f-49cd-a62d-499ebc4aeafb", email: "outro@example.com", email_confirmed_at: "2026-10-18" };
const context = (user = owner, admin = true) => ({ userId: user.id, supabase: { rpc: vi.fn().mockResolvedValue({ data: admin }), auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) } } });

describe("Autorização das operações de administrador", () => {
  beforeEach(() => { vi.clearAllMocks(); });
  it("nega concessão e remoção para outro administrador", async () => {
    for (const administrador of [true, false]) {
      await expect(alterar({ data: { id: other.id, administrador }, context: context(other) })).rejects.toThrow("Somente o proprietário");
    }
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("nega alteração para usuário sem papel de administrador", async () => {
    await expect(alterar({ data: { id: other.id, administrador: true }, context: context(owner, false) })).rejects.toThrow("Acesso negado");
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("não concede administrador para e-mail não confirmado", async () => {
    mocks.getUserById.mockResolvedValue({ data: { user: { ...other, email_confirmed_at: null } } });
    await expect(alterar({ data: { id: other.id, administrador: true }, context: context() })).rejects.toThrow("confirmar o e-mail");
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("bloqueia remoção das permissões da conta proprietária", async () => {
    mocks.getUserById.mockResolvedValue({ data: { user: owner } });
    await expect(alterar({ data: { id: owner.id, administrador: false }, context: context() })).rejects.toThrow("não podem ser alteradas");
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("impede outro administrador de excluir o proprietário", async () => {
    mocks.getUserById.mockResolvedValue({ data: { user: owner } });
    await expect(excluir({ data: { id: owner.id }, context: context(other) })).rejects.toThrow("Somente o proprietário");
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("permite acesso à página Admin somente para a conta proprietária verificada", async () => {
    const acesso = possoAcessarAdmin as unknown as (input: { context: unknown }) => Promise<boolean>;
    expect(await acesso({ context: context() })).toBe(true);
    expect(await acesso({ context: context(other) })).toBe(false);
    expect(await acesso({ context: context({ ...owner, email_confirmed_at: null } as unknown as typeof owner) })).toBe(false);
    expect(await acesso({ context: context(owner, false) })).toBe(false);
  });
  it("bloqueia listagem, exclusão e redefinição de senha para outros administradores", async () => {
    const listar = listarUsuarios as unknown as (input: { context: unknown }) => Promise<unknown>;
    const redefinir = enviarRedefinicao as unknown as (input: { data: { email: string; origem: string }; context: unknown }) => Promise<unknown>;
    await expect(listar({ context: context(other) })).rejects.toThrow("Somente o proprietário");
    await expect(excluir({ data: { id: owner.id }, context: context(other) })).rejects.toThrow("Somente o proprietário");
    await expect(redefinir({ data: { email: owner.email, origem: "https://pocket-friend-balance.lovable.app" }, context: context(other) })).rejects.toThrow("Somente o proprietário");
    expect(mocks.getUserById).not.toHaveBeenCalled();
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("preserva o papel dos demais administradores fora da página Admin", async () => {
    const verificar = souAdmin as unknown as (input: { context: unknown }) => Promise<boolean>;
    expect(await verificar({ context: context(other) })).toBe(true);
  });
});