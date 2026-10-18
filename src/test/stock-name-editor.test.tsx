import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { StockNameEditor } from '@/components/stock-name-editor';

describe('correção de nomes do estoque', () => {
  afterEach(cleanup);
  it('envia apenas o nome corrigido sem espaços nas extremidades', async () => {
    const salvar = vi.fn().mockResolvedValue(null);
    render(<StockNameEditor nome="Arroz" disabled={false} salvar={salvar} />);
    fireEvent.click(screen.getByRole('button', { name: 'Corrigir nome de Arroz' }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '  Arroz integral  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar nome' }));
    await waitFor(() => expect(salvar).toHaveBeenCalledWith('Arroz integral'));
  });
  it('não envia nomes vazios', () => {
    const salvar = vi.fn();
    render(<StockNameEditor nome="Arroz" disabled={false} salvar={salvar} />);
    fireEvent.click(screen.getByRole('button', { name: 'Corrigir nome de Arroz' }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar nome' }));
    expect(salvar).not.toHaveBeenCalled();
  });
});