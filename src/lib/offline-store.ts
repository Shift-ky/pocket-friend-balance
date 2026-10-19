import { createStore, get, set, del } from 'idb-keyval';
import type { User } from '@supabase/supabase-js';
import type { LocalState } from './offline-model';

let store: ReturnType<typeof createStore> | undefined;
function db() { return store ??= createStore('minhas-financas-offline', 'private-data'); }
export type OfflineIdentity = { user: User; grupo: { id: string; nome: string; codigo: string } };
export const scopeKey = (user: string, group: string) => `data:${user}:${group}`;
export async function loadState(user: string, group: string): Promise<LocalState> {
  return await get<LocalState>(scopeKey(user, group), db()) ?? { tables: {}, queue: [] };
}
export async function saveState(user: string, group: string, state: LocalState) { await set(scopeKey(user, group), state, db()); }
export async function rememberIdentity(identity: OfflineIdentity) { await set('last-identity', identity, db()); }
export async function readIdentity() { return get<OfflineIdentity>('last-identity', db()); }
export async function forgetIdentity() { await del('last-identity', db()); }
export async function cachedValue<T>(user: string, name: string, read: () => Promise<T>): Promise<T> {
  const key = `verified:${user}:${name}`;
  if (!navigator.onLine) {
    const cached = await get<T>(key, db());
    if (cached === undefined) throw new Error('Conecte uma vez para carregar seus acessos neste aparelho.');
    return cached;
  }
  const value = await read();
  await set(key, value, db());
  return value;
}