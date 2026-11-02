/** Resolve the static graph viewer URL under the current Vite base (e.g. /structura/viewer/). */
export function viewerHref(baseUrl: string = import.meta.env.BASE_URL): string {
  const normalized = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  return `${normalized}viewer/`
}
