import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { souAdmin } from "@/lib/admin.functions";

export function useSouAdmin(): boolean {
  const checar = useServerFn(souAdmin);
  const { data } = useQuery({ queryKey: ["souAdmin"], queryFn: () => checar() });
  return Boolean(data);
}
