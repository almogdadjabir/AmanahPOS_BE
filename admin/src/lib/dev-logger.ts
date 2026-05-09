/**
 * Development-only API request/response logger.
 *
 * - devFetch     drop-in fetch wrapper; logs request + response to terminal AND api-debug.log
 * - logFormData  logs FormData entries and the cleaned payload
 *
 * All exports are no-ops in production (process.env.NODE_ENV !== 'development').
 */

import fs   from 'fs';
import path from 'path';

const LOG_FILE = path.join(process.cwd(), 'api-debug.log');

// Clear the log file once per server process start.
let _fileCleared = false;
function ensureCleared() {
  if (_fileCleared) return;
  _fileCleared = true;
  try { fs.writeFileSync(LOG_FILE, `=== api-debug.log — started ${new Date().toISOString()} ===\n\n`); } catch { /* ignore */ }
}

function appendLog(text: string) {
  try {
    ensureCleared();
    fs.appendFileSync(LOG_FILE, text);
  } catch { /* ignore fs errors — never crash the app */ }
}

// Headers whose values must never appear in logs
const REDACTED_HEADERS = new Set([
  'authorization',
  'cookie',
  'set-cookie',
  'x-csrf-token',
  'x-auth-token',
  'x-api-key',
  'x-refresh-token',
]);

export function maskHeaders(
  headers: Record<string, string>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(headers).map(([k, v]) => [
      k,
      REDACTED_HEADERS.has(k.toLowerCase()) ? '[REDACTED]' : v,
    ]),
  );
}

// ANSI colour helpers (terminal only — stripped by most log viewers automatically)
const c = {
  cyan:  (s: string) => `\x1b[36m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  red:   (s: string) => `\x1b[31m${s}\x1b[0m`,
  dim:   (s: string) => `\x1b[2m${s}\x1b[0m`,
  magenta: (s: string) => `\x1b[35m${s}\x1b[0m`,
};

function indent(json: unknown, color: (s: string) => string): string {
  return JSON.stringify(json, null, 2)
    .split('\n')
    .map(l => `${color('│')}   ${l}`)
    .join('\n');
}

const HR = '─'.repeat(50);

/**
 * Drop-in replacement for `fetch` that logs request/response details in dev.
 * The original Response object is returned untouched so callers can still
 * consume `.json()` / `.text()` as normal.
 */
export async function devFetch(url: string, init?: RequestInit): Promise<Response> {
  if (process.env.NODE_ENV !== 'development') return fetch(url, init);

  const method  = (init?.method ?? 'GET').toUpperCase();
  const headers = (init?.headers ?? {}) as Record<string, string>;
  const rawBody = init?.body;

  let parsedBody: unknown;
  if (rawBody) {
    try {
      parsedBody = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;
    } catch {
      parsedBody = String(rawBody);
    }
  }

  const ts = new Date().toISOString();

  console.log(`\n${c.cyan(`┌─ API REQUEST ${HR}`)}`);
  console.log(`${c.cyan('│')} ${c.dim('METHOD ')} ${method}`);
  console.log(`${c.cyan('│')} ${c.dim('URL    ')} ${url}`);
  if (Object.keys(headers).length) {
    console.log(`${c.cyan('│')} ${c.dim('HEADERS')}`);
    console.log(indent(maskHeaders(headers), c.cyan));
  }
  if (parsedBody !== undefined) {
    console.log(`${c.cyan('│')} ${c.dim('BODY   ')}`);
    console.log(indent(parsedBody, c.cyan));
  }
  console.log(c.cyan(`└${HR}──`));

  const res   = await fetch(url, init);
  const clone = res.clone();

  let resBody: unknown;
  try {
    resBody = await clone.json();
  } catch {
    resBody = '(empty / non-JSON)';
  }

  const color  = res.ok ? c.green : c.red;
  const status = `${res.status} ${res.statusText}`;

  console.log(`\n${color(`┌─ API RESPONSE ${HR}`)}`);
  console.log(`${color('│')} ${c.dim('STATUS ')} ${status}`);
  console.log(`${color('│')} ${c.dim('BODY   ')}`);
  console.log(indent(resBody, color));
  console.log(color(`└${HR}──`) + '\n');

  // Write plain-text (no ANSI) copy to api-debug.log
  const sep = '─'.repeat(60);
  let fileEntry = `[${ts}] ${method} ${url}\n`;
  if (Object.keys(headers).length) {
    fileEntry += `  HEADERS: ${JSON.stringify(maskHeaders(headers))}\n`;
  }
  if (parsedBody !== undefined) {
    fileEntry += `  BODY:\n${JSON.stringify(parsedBody, null, 2).split('\n').map(l => '    ' + l).join('\n')}\n`;
  }
  fileEntry += `  → ${status}\n`;
  fileEntry += `  RESPONSE:\n${JSON.stringify(resBody, null, 2).split('\n').map(l => '    ' + l).join('\n')}\n`;
  fileEntry += `${sep}\n\n`;
  appendLog(fileEntry);

  return res; // original — body stream untouched
}

/**
 * Log all FormData entries in development.
 *
 * Next.js Server Actions send fields with a numeric prefix in the raw HTTP
 * body (e.g. `1_owner_id`), but the runtime strips that prefix before the
 * action function runs. This helper logs both the raw keys and the
 * prefix-stripped keys so you can confirm which form your action receives.
 *
 * Returns a Record of the cleaned (prefix-stripped) entries as a convenience.
 */
export function logFormData(
  formData: FormData,
  tag = 'FormData',
): Record<string, FormDataEntryValue> {
  if (process.env.NODE_ENV !== 'development') return {};

  const raw = Object.fromEntries(formData.entries());

  // Strip leading "N_" prefix if present (Next.js useActionState encoding)
  const clean = Object.fromEntries(
    Object.entries(raw).map(([k, v]) => [k.replace(/^\d+_/, ''), v]),
  );

  const isPrefixed = Object.keys(raw).some(k => /^\d+_/.test(k));

  console.log(`\n${c.magenta(`┌─ ${tag} ${HR.slice(tag.length + 4)}`)}`);
  console.log(`${c.magenta('│')} ${c.dim('raw    ')} ${JSON.stringify(raw)}`);
  if (isPrefixed) {
    console.log(`${c.magenta('│')} ${c.dim('clean  ')} ${JSON.stringify(clean)}`);
    console.log(`${c.magenta('│')} ${c.dim('note   ')} Next.js prefix detected — clean keys will be used`);
  } else {
    console.log(`${c.magenta('│')} ${c.dim('note   ')} No prefix — keys are already clean`);
  }
  console.log(c.magenta(`└${HR}──`) + '\n');

  return isPrefixed ? clean : raw;
}
