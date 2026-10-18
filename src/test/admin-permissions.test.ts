import { describe, expect, it } from "vitest";
import { contaProtegida, eProprietario } from "@/lib/admin-permissions";

const owner = { id: "3f3f6b62-d686-4451-b75f-a108adfb813d", email: "robson-costa@outlook.com.br", email_confirmed_at: "2026-10-18T01:00:00Z" };

describe("Permissões exclusivas do proprietário", () => {
  it("permite somente à identidade verificada de robson-costa@outlook.com.br gerenciar administradores", () => {
    expect(eProprietario(owner)).toBe(true);
    expect(eProprietario({ ...owner, email: "outro@example.com" })).toBe(false);
    expect(eProprietario({ ...owner, id: "outro-id" })).toBe(false);
    expect(eProprietario({ ...owner, email_confirmed_at: null })).toBe(false);
    expect(eProprietario(null)).toBe(false);
  });
  it("protege a conta proprietária contra exclusão ou remoção de administrador", () => {
    expect(contaProtegida(owner)).toBe(true);
    expect(contaProtegida({ ...owner, email: "email-alterado@example.com" })).toBe(true);
    expect(contaProtegida({ id: "outro-id", email: "outro@example.com" })).toBe(false);
  });
});