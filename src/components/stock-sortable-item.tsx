import type { ReactNode } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function StockSortableItem({ id, nome, abaixo, disabled, children }: {
  id: string; nome: string; abaixo: boolean; disabled: boolean; children: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id, disabled });
  return (
    <li ref={setNodeRef} data-stock-id={id}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`relative flex gap-2 rounded-lg border bg-card p-3 ${abaixo ? 'border-l-4 border-l-debit' : ''} ${isDragging ? 'z-10 ring-2 ring-ring' : ''}`}>
      <Button ref={setActivatorNodeRef} type="button" variant="ghost" size="icon" disabled={disabled}
        className="shrink-0 touch-none cursor-grab text-muted-foreground active:cursor-grabbing"
        aria-label={`Reordenar ${nome}`} title={`Reordenar ${nome}`} {...attributes} {...listeners}>
        <GripVertical />
      </Button>
      <div className="min-w-0 flex-1">{children}</div>
    </li>
  );
}