import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { boundOrbPosition, ORB_DRAG_THRESHOLD } from '@/lib/orb-position';

export function useOrbDrag(onDrag: () => void) {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [upperHalf, setUpperHalf] = useState(false);
  const [leftHalf, setLeftHalf] = useState(false);
  const start = useRef<{ id: number; x: number; y: number; left: number; top: number } | null>(null);
  const dragged = useRef(false);

  function place(x: number, y: number) {
    const next = boundOrbPosition(x, y, window.innerWidth, window.innerHeight);
    setPosition(next);
    setUpperHalf(next.y < window.innerHeight / 2);
    setLeftHalf(next.x < window.innerWidth / 2);
  }

  useEffect(() => {
    const resize = () => {
      setPosition(current => current ? boundOrbPosition(current.x, current.y, window.innerWidth, window.innerHeight) : null);
      setUpperHalf(current => position ? position.y < window.innerHeight / 2 : current);
      setLeftHalf(current => position ? position.x < window.innerWidth / 2 : current);
    };
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [position]);

  return {
    position, upperHalf, leftHalf,
    onPointerDown(e: PointerEvent<HTMLButtonElement>) {
      if (!e.isPrimary || e.button !== 0) return;
      const rect = e.currentTarget.getBoundingClientRect();
      start.current = { id: e.pointerId, x: e.clientX, y: e.clientY, left: rect.left, top: rect.top };
      dragged.current = false;
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    onPointerMove(e: PointerEvent<HTMLButtonElement>) {
      const origin = start.current;
      if (!origin || origin.id !== e.pointerId) return;
      const dx = e.clientX - origin.x; const dy = e.clientY - origin.y;
      if (!dragged.current && Math.hypot(dx, dy) < ORB_DRAG_THRESHOLD) return;
      dragged.current = true;
      onDrag();
      place(origin.left + dx, origin.top + dy);
    },
    onPointerUp(e: PointerEvent<HTMLButtonElement>) {
      if (start.current?.id !== e.pointerId) return;
      start.current = null;
      if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    },
    onPointerCancel() { start.current = null; dragged.current = true; },
    consumeDrag() { const value = dragged.current; dragged.current = false; return value; },
  };
}