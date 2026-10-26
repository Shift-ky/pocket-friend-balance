import { useEffect, useRef, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Bike, Boxes, CalendarClock, Home, LayoutGrid, Shield, ShoppingBasket, Wallet, X } from "lucide-react";
import { possoAcessarAdmin } from "@/lib/admin.functions";
import { useGrupo } from "@/lib/grupo";
import { useAccess } from "@/lib/access-context";
import { cn } from "@/lib/utils";

type Item = { to: "/" | "/financas" | "/contas-fixas" | "/feira" | "/estoque" | "/moto" | "/admin"; label: string; icon: typeof Home };

function useItens(): Item[] {
  const access = useAccess();
  const { session } = useGrupo();
  const checar = useServerFn(possoAcessarAdmin);
  const { data: admin } = useQuery({ queryKey: ["acessoAdmin", session.user.id], queryFn: () => checar() });
  const itens: Item[] = [{ to: "/", label: "Início", icon: Home }];
  if (access.financas) itens.push({ to: "/financas", label: "Finanças", icon: Wallet }, { to: "/contas-fixas", label: "Contas fixas", icon: CalendarClock });
  if (access.feira) itens.push({ to: "/feira", label: "Feira", icon: ShoppingBasket });
  if (access.estoque) itens.push({ to: "/estoque", label: "Estoque", icon: Boxes });
  if (access.moto) itens.push({ to: "/moto", label: "Moto", icon: Bike });
  if (admin) itens.push({ to: "/admin", label: "Admin", icon: Shield });
  return itens;
}

export function DesktopPillNav() {
  const itens = useItens();
  return (
    <div className="mx-auto hidden max-w-3xl justify-center px-5 py-2 md:flex">
      <div className="flex items-center gap-0.5 rounded-full border bg-muted/60 p-1 shadow-sm">
        {itens.map(({ to, label, icon: Icon }) => (
          <Link key={to} to={to} activeOptions={{ exact: to === "/" }}
            className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors"
            activeProps={{ className: "bg-primary text-primary-foreground shadow" }}
            inactiveProps={{ className: "text-muted-foreground hover:text-foreground" }}>
            <Icon className="h-3.5 w-3.5" />{label}
          </Link>
        ))}
      </div>
    </div>
  );
}

export function FloatingOrb() {
  const itens = useItens();
  const [aberto, setAberto] = useState(false);
  const [fantasma, setFantasma] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const pathname = useRouterState({ select: s => s.location.pathname });

  useEffect(() => {
    const acordar = () => {
      setFantasma(false);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setFantasma(true), 2500);
    };
    acordar();
    const eventos = ["pointerdown", "scroll", "keydown", "touchstart"] as const;
    eventos.forEach(e => window.addEventListener(e, acordar, { passive: true }));
    return () => { clearTimeout(timer.current); eventos.forEach(e => window.removeEventListener(e, acordar)); };
  }, []);

  useEffect(() => { setAberto(false); }, [pathname]);

  return (
    <div className="md:hidden">
      {aberto && <button aria-label="Fechar menu" className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm" onClick={() => setAberto(false)} />}
      {aberto && (
        <div className="fixed bottom-24 right-5 z-50 grid w-[min(18rem,calc(100vw-2.5rem))] grid-cols-3 gap-2 rounded-3xl border bg-card p-3 shadow-2xl">
          {itens.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} activeOptions={{ exact: to === "/" }}
              className="flex flex-col items-center gap-1 rounded-2xl px-1 py-3 text-[11px] font-semibold"
              activeProps={{ className: "bg-primary text-primary-foreground" }}
              inactiveProps={{ className: "bg-muted text-foreground" }}>
              <Icon className="h-5 w-5" />{label}
            </Link>
          ))}
        </div>
      )}
      <button
        aria-label={aberto ? "Fechar menu" : "Abrir menu"}
        aria-expanded={aberto}
        onClick={() => setAberto(a => !a)}
        className={cn(
          "fixed bottom-6 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_0_24px_var(--primary)] transition-all duration-500",
          fantasma && !aberto ? "scale-90 opacity-30 shadow-none" : "scale-100 opacity-100",
        )}>
        {aberto ? <X className="h-6 w-6" /> : <LayoutGrid className="h-6 w-6" />}
      </button>
    </div>
  );
}
