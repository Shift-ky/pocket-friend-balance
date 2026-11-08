export function getAppBaseUrl() {
  return new URL(import.meta.env.BASE_URL, window.location.origin)
    .toString()
    .replace(/\/$/, "");
}

