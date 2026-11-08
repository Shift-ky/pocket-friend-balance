import { useQuery } from "@tanstack/react-query";
import { souAdmin } from "@/lib/admin.functions";
import { useGrupo } from '@/lib/grupo';

export function useSouAdmin(): boolean {
  const { session } = useGrupo();
  const checar = souAdmin;
  const { data } = useQuery({ queryKey: ["souAdmin", session.user.id], queryFn: () => checar(), refetchInterval: 3000 });
  return Boolean(data);
}