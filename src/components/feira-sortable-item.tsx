import type { ReactNode } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronDown, ChevronUp, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function FeiraSortableItem({ id, nome, position, total, disabled, onMove, children }: {
  id: string; nome: string; position: number; total: number; disabled: boolean;
  onMove: (delta: -1 | 1) => void; children: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id, disabled });
  return (
    <li ref={setNodeRef} data-feira-id={id} style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`relative flex flex-wrap items-center gap-2 rounded-lg border bg-card p-3 sm:gap-3 ${isDragging ? 'z-10 ring-2 ring-ring' : ''}`}>
      <Button ref={setActivatorNodeRef} type="button" variant="ghost" size="icon" disabled={disabled}
        className="shrink-0 touch-none cursor-grab text-muted-foreground active:cursor-grabbing"
        aria-label={`Arrastar ${nome} para reorganizar`} title={`Arrastar ${nome}`} {...attributes} {...listeners}>
        <GripVertical />
      </Button>
      <div className="min-w-0 flex-1">{children}</div>
      <div className="flex shrink-0 flex-col">
        <Button type="button" variant="ghost" size="icon" disabled={disabled || position === 0}
          onClick={() => onMove(-1)} aria-label={`Mover ${nome} para cima`} title="Mover para cima" className="h-7 w-7">
          <ChevronUp className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" disabled={disabled || position === total - 1}
          onClick={() => onMove(1)} aria-label={`Mover ${nome} para baixo`} title="Mover para baixo" className="h-7 w-7">
          <ChevronDown className="h-4 w-4" />
        </Button>
      </div>
    </li>
  );
}
