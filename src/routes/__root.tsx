import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { possoAcessarAdmin } from "@/lib/admin.functions";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { GrupoGate, useGrupo } from "@/lib/grupo";
import { AccessProvider, AccessSurface } from "@/components/access-provider";
import { AppearanceMenu, AppearanceProvider } from "@/components/appearance-provider";
import { useAccess } from "@/lib/access-context";
import { recoverModuleLoad, isModuleLoadError } from '@/lib/module-recovery';
import { Button } from '@/components/ui/button';

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
    recoverModuleLoad(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button
            onClick={() => {
              if (isModuleLoadError(error)) { window.location.reload(); return; }
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </Button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Minhas Finanças" },
      { name: "description", content: "Controle de créditos e débitos pessoais." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@Lovable" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Fraunces:wght@500;700&family=Manrope:wght@400;600;700&display=swap",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        <div className="flex min-h-dvh flex-col">
          <div className="flex-1">{children}</div>
          <footer className="relative z-10 border-t bg-card px-5 py-4 text-center text-xs text-muted-foreground">
            <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-x-4 gap-y-2">
              <span>Author: <span className="font-semibold text-foreground">Robson Costa</span></span>
              <a href="https://github.com/Shift-ky" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 hover:text-foreground">GitHub: Shift-ky</a>
            </div>
          </footer>
        </div>
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  useEffect(() => {
    const onPreloadError = (event: Event) => {
      const payload = (event as Event & { payload?: unknown }).payload;
      if (recoverModuleLoad(payload)) event.preventDefault();
    };
    window.addEventListener('vite:preloadError', onPreloadError);
    return () => window.removeEventListener('vite:preloadError', onPreloadError);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <GrupoGate>
        <AppearanceProvider><AccessProvider><Nav /><AccessSurface><Outlet /></AccessSurface></AccessProvider></AppearanceProvider>
      </GrupoGate>
    </QueryClientProvider>
  );
}

function Nav() {
  const { grupo, sair } = useGrupo();
  const access = useAccess();
  return (
    <nav className="border-b bg-card">
      <div className="border-b">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-5 py-2">
          <span className="min-w-0 break-words text-xs text-muted-foreground">{grupo.nome} · código <b className="whitespace-nowrap text-foreground">{grupo.codigo}</b></span>
          <div className="flex shrink-0 items-center gap-4"><AppearanceMenu /><Button variant="link" size="sm" onClick={sair} className="shrink-0 px-0 text-xs text-muted-foreground">Sair</Button></div>
        </div>
      </div>
      <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-2 px-5 py-3">
        <Link to="/" activeOptions={{ exact: true }} className="rounded-full px-4 py-1.5 text-sm font-semibold"
          activeProps={{ className: "bg-primary text-primary-foreground" }} inactiveProps={{ className: "text-muted-foreground" }}>
          Início
        </Link>
        {access.financas && <Link to="/financas" className="rounded-full px-4 py-1.5 text-sm font-semibold"
          activeProps={{ className: "bg-primary text-primary-foreground" }} inactiveProps={{ className: "text-muted-foreground" }}>
          Finanças
        </Link>}
        {access.feira && <Link to="/feira" className="rounded-full px-4 py-1.5 text-sm font-semibold"
          activeProps={{ className: "bg-primary text-primary-foreground" }} inactiveProps={{ className: "text-muted-foreground" }}>
          Feira
        </Link>}
        {access.estoque && <Link to="/estoque" className="rounded-full px-4 py-1.5 text-sm font-semibold"
          activeProps={{ className: "bg-primary text-primary-foreground" }} inactiveProps={{ className: "text-muted-foreground" }}>
          Estoque
        </Link>}
        {access.moto && <Link to="/moto" className="rounded-full px-4 py-1.5 text-sm font-semibold"
          activeProps={{ className: "bg-primary text-primary-foreground" }} inactiveProps={{ className: "text-muted-foreground" }}>
          Moto
        </Link>}
        <AdminLink />
      </div>
    </nav>
  );
}

function AdminLink() {
  const { session } = useGrupo();
  const checar = useServerFn(possoAcessarAdmin);
  const { data } = useQuery({ queryKey: ["acessoAdmin", session.user.id], queryFn: () => checar() });
  if (!data) return null;
  return (
    <Link to="/admin" className="rounded-full px-4 py-1.5 text-sm font-semibold"
      activeProps={{ className: "bg-primary text-primary-foreground" }} inactiveProps={{ className: "text-muted-foreground" }}>
      Admin
    </Link>
  );
}
