/**
 * Extract a human-readable error message from an API response body.
 *
 * The backend uses a custom DRF exception handler that returns:
 *   { success: false, error: { code, message, details } }
 *
 * This helper handles that format, DRF's default { detail } format, and plain
 * { message } responses, plus a special case for 401 (expired session).
 */
export function extractApiError(
  data: unknown,
  httpStatus?: number,
  fallback = 'An unexpected error occurred. Please try again.',
): string {
  if (httpStatus === 401) return 'Session expired — please refresh the page and sign in again.';

  if (typeof data === 'object' && data !== null) {
    const d = data as Record<string, unknown>;

    // Custom handler: { error: { message: "...", details: { field: ["..."] } } }
    if (d.error && typeof d.error === 'object') {
      const e = d.error as Record<string, unknown>;
      if (typeof e.message === 'string' && e.message) {
        // Append first field-level detail if helpful
        if (e.details && typeof e.details === 'object') {
          const det = e.details as Record<string, unknown>;
          const firstField = Object.values(det).find(v => Array.isArray(v) && v.length > 0) as string[] | undefined;
          if (firstField) return `${e.message}: ${firstField[0]}`;
        }
        return e.message;
      }
    }

    // DRF default: { detail: "..." }
    if (typeof d.detail === 'string') return d.detail;

    // Simple: { message: "..." }
    if (typeof d.message === 'string') return d.message;
  }

  return fallback;
}
