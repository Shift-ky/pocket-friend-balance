type Identidade = { id: string; email?: string; email_confirmed_at?: string | null };

// Both identity and mailbox ownership are required; claims/metadata never grant this permission.
export function eProprietario(user: Identidade | null | undefined): boolean {
  return Boolean(user?.email?.toLowerCase() === "nosborx.costa@gmail.com" && user.email_confirmed_at);
}

export function contaProtegida(user: Pick<Identidade, "id" | "email">): boolean {
  return user.email?.toLowerCase() === "nosborx.costa@gmail.com";
}
