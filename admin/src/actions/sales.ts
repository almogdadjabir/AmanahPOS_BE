'use server';

import { cookies } from 'next/headers';
import { revalidateTag } from 'next/cache';
import { extractApiError } from '@/lib/action-error';
import { CACHE_TAGS } from '@/lib/cacheTags';
import type { RefundResult } from '@/types/api';

const API = () =>
  process.env.INTERNAL_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'https://api.amanapos.com';

async function authToken(): Promise<string> {
  return (await cookies()).get('auth_token')?.value ?? '';
}

// ── Result types ──────────────────────────────────────────────────────────────

export type RefundState =
  | { ok: true; refund_reference: string; refund_total: string }
  | { ok: false; error: string }
  | null;

// ── Refund a sale ─────────────────────────────────────────────────────────────

export async function refundSaleAction(
  saleId: string,
  items: { product: string; quantity: number }[],
): Promise<RefundState> {
  try {
    const res = await fetch(`${API()}/api/v1/sales/${saleId}/refund/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${await authToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items: items.map(i => ({ product_id: i.product, quantity: i.quantity })),
      }),
      cache: 'no-store',
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return { ok: false, error: extractApiError(data, res.status, 'Refund failed. Please try again.') };
    }

    revalidateTag(CACHE_TAGS.sales);
    revalidateTag(CACHE_TAGS.salesSummary);

    const body = data as RefundResult;
    return {
      ok: true,
      refund_reference: body.refund_reference,
      refund_total: body.refund_total,
    };
  } catch {
    return { ok: false, error: 'Network error. Please try again.' };
  }
}
