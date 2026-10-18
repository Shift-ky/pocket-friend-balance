import { act, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LoginWelcome } from '@/components/login-welcome';

describe('tempo de leitura após entrar', () => {
  afterEach(() => vi.useRealTimers());

  it('mantém a mensagem durante a leitura e continua automaticamente', () => {
    vi.useFakeTimers();
    const concluir = vi.fn();
    const view = render(<LoginWelcome aoConcluir={concluir} />);
    act(() => vi.advanceTimersByTime(8000));
    expect(concluir).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(500));
    expect(concluir).toHaveBeenCalledTimes(1);
    view.unmount();
  });

  it('cancela a continuação quando a tela é desmontada', () => {
    vi.useFakeTimers();
    const concluir = vi.fn();
    const view = render(<LoginWelcome aoConcluir={concluir} />);
    view.unmount();
    act(() => vi.advanceTimersByTime(10000));
    expect(concluir).not.toHaveBeenCalled();
  });
});