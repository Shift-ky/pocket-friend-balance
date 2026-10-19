import { swRefused } from './offline-model';

export async function registerOfflineShell() {
  if (!('serviceWorker' in navigator)) return;
  if (swRefused(import.meta.env.PROD, window.self !== window.top, location.hostname, location.search)) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.filter(r => [r.active, r.waiting, r.installing].some(w => w && new URL(w.scriptURL).pathname === '/sw.js')).map(r => r.unregister()));
    return;
  }
  await navigator.serviceWorker.register('/sw.js');
}