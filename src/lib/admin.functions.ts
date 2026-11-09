import { appApi } from '@/lib/app-api';
import type { Access } from '@/lib/access';

export const possoAcessarAdmin = () => appApi<boolean>('possoAcessarAdmin');
export const souAdmin = () => appApi<boolean>('souAdmin');
export const meusAcessos = () => appApi<Access>('meusAcessos');
export const alterarAcessos = (input: { data: { id: string; acessos: Access } }) => appApi<{ ok: true }>('alterarAcessos', input.data);
export const listarUsuarios = () => appApi<Array<{ id: string; email: string; criado: string; confirmado: boolean; ultimoAcesso: string | null; administrador: boolean; protegido: boolean; acessos: Access }>>('listarUsuarios');
export const excluirUsuario = (input: { data: { id: string } }) => appApi<{ ok: true }>('excluirUsuario', input.data);
export const possoGerenciarAdministradores = () => appApi<boolean>('possoGerenciarAdministradores');
export const alterarAdministrador = (input: { data: { id: string; administrador: boolean } }) => appApi<{ ok: true }>('alterarAdministrador', input.data);
export const enviarRedefinicao = (input: { data: { email: string; origem: string } }) => appApi<{ ok: true }>('enviarRedefinicao', input.data);
