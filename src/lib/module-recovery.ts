export function isModuleLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /error loading dynamically imported module|failed to fetch dynamically imported module|importing a module script failed|loading chunk .+ failed/i.test(message);
}

/** Retry a stale asset once, but never trap an offline user in a reload loop. */
export function recoverModuleLoad(error: unknown): boolean {
  if (!isModuleLoadError(error) || typeof window === 'undefined') return false;
  try {
    const key = 'module-load-retry';
    const last = Number(window.sessionStorage.getItem(key) ?? 0);
    if (Date.now() - last < 60_000) return false;
    window.sessionStorage.setItem(key, String(Date.now()));
    window.location.reload();
    return true;
  } catch {
    return false;
  }
}