import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronDown, ChevronUp, GripVertical, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { CartaoPainelId } from '@/lib/ordem-painel';
import type { AlturaCartaoPainel, LarguraCartaoPainel } from '@/lib/painel-preferencias';

export function PainelSortableCard({ id, nome, valor, Icon, destaque, width, height, position, total, editing, disabled, onMove }: {
  id: CartaoPainelId; nome: string; valor: string; Icon: LucideIcon; destaque: boolean; width: LarguraCartaoPainel; height: AlturaCartaoPainel;
  position: number; total: number; editing: boolean; disabled: boolean; onMove: (delta: -1 | 1) => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id, disabled: disabled || !editing });
  const heightLevel = height === 'alta' ? 3 : height === 'media' ? 2 : 1;
  const scale = Math.min(4, Math.max(width, heightLevel)) as 1 | 2 | 3 | 4;
  const contentSize = {
    1: { padding: 'p-3', header: 'mb-2', title: 'text-xs sm:text-sm', value: 'text-lg sm:text-xl', caption: 'mt-1 text-[10px] sm:text-xs', icon: 'h-4 w-4' },
    2: { padding: 'p-4 sm:p-5', header: 'mb-4', title: 'text-sm sm:text-base', value: 'text-2xl sm:text-3xl', caption: 'mt-2 text-xs', icon: 'h-5 w-5' },
    3: { padding: 'p-5 sm:p-6', header: 'mb-5', title: 'text-base sm:text-lg', value: 'text-3xl sm:text-4xl', caption: 'mt-3 text-sm', icon: 'h-5 w-5 sm:h-6 sm:w-6' },
    4: { padding: 'p-6 sm:p-7', header: 'mb-6', title: 'text-base sm:text-xl', value: 'text-3xl sm:text-5xl', caption: 'mt-4 text-sm sm:text-base', icon: 'h-6 w-6' },
  }[scale];
  return (
    <article ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex min-w-0 flex-col rounded-lg border ${contentSize.padding} ${width === 1 ? 'col-span-1' : width === 2 ? 'col-span-2' : width === 3 ? 'col-span-2 sm:col-span-3 lg:col-span-3' : 'col-span-2 sm:col-span-3 lg:col-span-4'} ${height === 'compacta' ? 'min-h-32' : height === 'media' ? 'min-h-40' : 'min-h-52 justify-between'} ${destaque ? 'bg-primary text-primary-foreground' : 'bg-card'} ${isDragging ? 'z-10 ring-2 ring-ring' : ''}`}>
      <div className={`${contentSize.header} flex items-center justify-between gap-2`}>
        <h2 className={`min-w-0 break-words ${contentSize.title}`}>{nome}</h2>
        {editing ? <div className="flex shrink-0 items-center gap-1">
          <Button ref={setActivatorNodeRef} type="button" variant="ghost" size="icon" disabled={disabled}
            className="h-8 w-8 touch-none cursor-grab text-current active:cursor-grabbing" aria-label={`Arrastar ${nome} para reorganizar`} title="Arrastar para reorganizar" {...attributes} {...listeners}>
            <GripVertical className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" disabled={disabled || position === 0} onClick={() => onMove(-1)}
            aria-label={`Mover ${nome} para cima`} title="Mover para cima" className="h-8 w-8 text-current"><ChevronUp className="h-4 w-4" /></Button>
          <Button type="button" variant="ghost" size="icon" disabled={disabled || position === total - 1} onClick={() => onMove(1)}
            aria-label={`Mover ${nome} para baixo`} title="Mover para baixo" className="h-8 w-8 text-current"><ChevronDown className="h-4 w-4" /></Button>
        </div> : <Icon className={`shrink-0 ${contentSize.icon}`} />}
      </div>
      <p className={`break-words font-display font-bold leading-tight ${contentSize.value}`}>{valor}</p>
      <p className={`opacity-75 ${contentSize.caption}`}>Carteiras visíveis no Painel</p>
    </article>
  );
}
