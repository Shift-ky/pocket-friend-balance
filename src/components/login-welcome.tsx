import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import loginDreams from '@/assets/login-dreams.jpg';
import mariaLogo from '@/assets/maria-logo.png';

export function LoginWelcome({ aoConcluir }: { aoConcluir: () => void }) {
  const [saindo, setSaindo] = useState(false);

  useEffect(() => {
    const fade = window.setTimeout(() => setSaindo(true), 8000);
    const finish = window.setTimeout(aoConcluir, 8500);
    return () => { window.clearTimeout(fade); window.clearTimeout(finish); };
  }, [aoConcluir]);

  return (
    <section data-login aria-label="Mensagem de boas-vindas" className={`login-welcome fixed inset-0 z-50 flex overflow-y-auto bg-background text-foreground ${saindo ? 'login-welcome-exit' : ''}`}>
      <img src={loginDreams} alt="" aria-hidden className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-10" />
      <div className="relative m-auto w-full max-w-2xl px-7 py-10 text-center sm:px-12">
        <img src={mariaLogo} alt="" aria-hidden width={1024} height={1024} className="mx-auto mb-8 h-10 w-10" />
        <blockquote className="font-display text-2xl leading-relaxed sm:text-3xl">
          “Uma reserva pequena e constante vale mais do que uma meta grande abandonada.”
        </blockquote>
        <p className="mt-6 text-sm text-muted-foreground">Author Desconhecido</p>
        <Button variant="ghost" onClick={aoConcluir} className="mt-10 gap-2 text-muted-foreground">Continuar<ArrowRight className="h-4 w-4" /></Button>
      </div>
    </section>
  );
}