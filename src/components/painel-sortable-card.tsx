import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronDown, ChevronUp, GripVertical, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { CartaoPainelId } from '@/lib/ordem-painel';

export function PainelSortableCard({ id, nome, valor, Icon, destaque, position, total, editing, disabled, onMove }: {
  id: CartaoPainelId; nome: string; valor: string; Icon: LucideIcon; destaque: boolean;
  position: number; total: number; editing: boolean; disabled: boolean; onMove: (delta: -1 | 1) => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id, disabled: disabled || !editing });
  return (
    <article ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`min-w-0 rounded-lg border p-5 ${destaque ? 'bg-primary text-primary-foreground' : 'bg-card'} ${isDragging ? 'z-10 ring-2 ring-ring' : ''}`}>
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-sm">{nome}</h2>
        {editing ? <div className="flex shrink-0 items-center gap-1">
          <Button ref={setActivatorNodeRef} type="button" variant="ghost" size="icon" disabled={disabled}
            className="h-8 w-8 touch-none cursor-grab text-current active:cursor-grabbing" aria-label={`Arrastar ${nome} para reorganizar`} title="Arrastar para reorganizar" {...attributes} {...listeners}>
            <GripVertical className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" disabled={disabled || position === 0} onClick={() => onMove(-1)}
            aria-label={`Mover ${nome} para cima`} title="Mover para cima" className="h-8 w-8 text-current"><ChevronUp className="h-4 w-4" /></Button>
          <Button type="button" variant="ghost" size="icon" disabled={disabled || position === total - 1} onClick={() => onMove(1)}
            aria-label={`Mover ${nome} para baixo`} title="Mover para baixo" className="h-8 w-8 text-current"><ChevronDown className="h-4 w-4" /></Button>
        </div> : <Icon className="h-5 w-5 shrink-0" />}
      </div>
      <p className="break-words font-display text-2xl font-bold">{valor}</p>
      <p className="mt-2 text-xs opacity-75">Carteiras visíveis no Painel</p>
    </article>
  );
}
