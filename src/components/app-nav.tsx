import { useEffect, useRef, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Bike, Boxes, CalendarClock, Home, LayoutGrid, Shield, ShoppingBasket, Wallet, X, Inbox } from "lucide-react";
import { possoAcessarAdmin } from "@/lib/admin.functions";
import { useGrupo } from "@/lib/grupo";
import { useAccess } from "@/lib/access-context";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useOrbDrag } from "@/hooks/use-orb-drag";

type Item = { to: "/" | "/financas" | "/contas-fixas" | "/feira" | "/estoque" | "/moto" | "/admin" | "/conferencia"; label: string; icon: typeof Home };

function useItens(): Item[] {
  const access = useAccess();
  const { session } = useGrupo();
  const checar = useServerFn(possoAcessarAdmin);
  const { data: admin } = useQuery({ queryKey: ["acessoAdmin", session.user.id], queryFn: () => checar() });
  const itens: Item[] = [{ to: "/", label: "Início", icon: Home }];
  if (access.financas) itens.push({ to: "/financas", label: "Finanças", icon: Wallet }, { to: "/contas-fixas", label: "Contas fixas", icon: CalendarClock }, { to: "/conferencia", label: "Conferência", icon: Inbox });
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
  const drag = useOrbDrag(() => { setAberto(false); setFantasma(false); });

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
      {aberto && <Button variant="ghost" aria-label="Fechar menu" className="fixed inset-0 z-40 h-auto w-auto rounded-none bg-background/60 backdrop-blur-sm" onClick={() => setAberto(false)} />}
      <div className={cn("fixed z-50 h-14 w-14", !drag.position && "bottom-6 right-5")}
        style={drag.position ? { left: drag.position.x, top: drag.position.y } : undefined}>
      {aberto && (
        <div className={cn("absolute grid max-h-[calc(50dvh-4rem)] w-[min(18rem,calc(100vw-2.5rem))] grid-cols-3 gap-2 overflow-y-auto rounded-3xl border bg-card p-3 shadow-2xl", drag.upperHalf ? "top-full mt-3" : "bottom-full mb-3", drag.leftHalf ? "left-0" : "right-0")}>
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
      <Button
        size="icon"
        title="Mover ou abrir menu"
        aria-label={aberto ? "Fechar menu" : "Abrir menu"}
        aria-expanded={aberto}
        onPointerDown={drag.onPointerDown}
        onPointerMove={drag.onPointerMove}
        onPointerUp={drag.onPointerUp}
        onPointerCancel={drag.onPointerCancel}
        onClick={() => { if (!drag.consumeDrag()) setAberto(a => !a); }}
        className={cn(
          "flex h-14 w-14 touch-none select-none items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_0_24px_var(--primary)] transition-[opacity,box-shadow] duration-500 motion-reduce:transition-none [&_svg]:size-6",
          fantasma && !aberto ? "opacity-30 shadow-none" : "opacity-100",
        )}>
        {aberto ? <X className="h-6 w-6" /> : <LayoutGrid className="h-6 w-6" />}
      </Button>
      </div>
    </div>
  );
}
