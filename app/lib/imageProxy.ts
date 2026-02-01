/**
 * Converts a GCS/Firebase Storage URL to a proxied URL to avoid CORS issues.
 * Only proxies URLs from storage.googleapis.com domain.
 * Other URLs are returned as-is.
 */
export function getProxiedImageUrl(url: string | undefined | null): string | undefined {
  if (!url) return undefined

  // Check if URL needs proxying (GCS/Firebase Storage URLs)
  const needsProxy =
    url.includes('storage.googleapis.com') ||
    url.includes('firebasestorage.googleapis.com') ||
    url.includes('storage.cloud.google.com')

  if (!needsProxy) {
    return url
  }

  // Use the image proxy API
  return `/api/image-proxy?url=${encodeURIComponent(url)}`
}
