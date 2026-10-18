type Identidade = { id: string; email?: string; email_confirmed_at?: string | null };

// Both identity and mailbox ownership are required; claims/metadata never grant this permission.
export function eProprietario(user: Identidade | null | undefined): boolean {
  return Boolean(user && user.id === "3f3f6b62-d686-4451-b75f-a108adfb813d"
    && user.email?.toLowerCase() === "robson-costa@outlook.com.br"
    && user.email_confirmed_at);
}

export function contaProtegida(user: Pick<Identidade, "id" | "email">): boolean {
  return user.id === "3f3f6b62-d686-4451-b75f-a108adfb813d"
    || user.email?.toLowerCase() === "robson-costa@outlook.com.br";
}