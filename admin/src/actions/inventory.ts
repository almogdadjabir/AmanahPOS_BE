'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { extractApiError } from '@/lib/action-error';
import type { ApiList, StockLevel, StockMovement, Product } from '@/types/api';

const API = () =>
  process.env.INTERNAL_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'https://api.amanapos.com';

async function authToken(): Promise<string> {
  return (await cookies()).get('auth_token')?.value ?? '';
}

// ── Result types ──────────────────────────────────────────────────────────────

export type ActionState<T = void> =
  | (T extends void ? { success: true } : { success: true; data: T })
  | { error: string }
  | null;

export type StockLevelsResult =
  | { ok: true; data: StockLevel[]; count: number; total_pages: number }
  | { ok: false; error: string };

export type MovementsResult =
  | { ok: true; data: StockMovement[]; count: number }
  | { ok: false; error: string };

export type AdjustStockState = ActionState;

// ── Fetch stock levels ────────────────────────────────────────────────────────

export async function fetchStockLevelsAction(params?: {
  search?:  string;
  shop?:    string;
  status?:  'low_stock' | 'out_of_stock';
  page?:    number;
  limit?:   number;
}): Promise<StockLevelsResult> {
  try {
    const url = new URL(`${API()}/api/v1/inventory/stock/`);
    if (params?.search)                    url.searchParams.set('search', params.search);
    if (params?.shop)                      url.searchParams.set('shop', params.shop);
    if (params?.status === 'low_stock')    url.searchParams.set('low_stock', 'true');
    if (params?.status === 'out_of_stock') url.searchParams.set('out_of_stock', 'true');
    if (params?.page)                      url.searchParams.set('page', String(params.page));
    url.searchParams.set('page_size', String(params?.limit ?? 25));

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${await authToken()}` },
      cache: 'no-store',
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, error: extractApiError(json, res.status) };
    const list = json as ApiList<StockLevel>;
    return { ok: true, data: list.results ?? [], count: list.count ?? 0, total_pages: list.total_pages ?? 1 };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' };
  }
}

// ── Fetch movements ───────────────────────────────────────────────────────────

export async function fetchMovementsAction(params?: {
  product?: string;
  shop?:    string;
  page?:    number;
}): Promise<MovementsResult> {
  try {
    const url = new URL(`${API()}/api/v1/inventory/movements/`);
    if (params?.product) url.searchParams.set('product', params.product);
    if (params?.shop)    url.searchParams.set('shop', params.shop);
    if (params?.page)    url.searchParams.set('page', String(params.page));
    url.searchParams.set('page_size', '30');

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${await authToken()}` },
      cache: 'no-store',
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, error: extractApiError(json, res.status) };
    const list = json as ApiList<StockMovement>;
    return { ok: true, data: list.results ?? [], count: list.count ?? 0 };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' };
  }
}

// ── Stock adjustment (add / remove / set) ─────────────────────────────────────

export async function stockAdjustmentAction(
  _prev: AdjustStockState,
  formData: FormData,
): Promise<AdjustStockState> {
  const mode             = formData.get('mode') as 'add' | 'remove' | 'set';
  const product          = (formData.get('product') as string)?.trim();
  const shop             = (formData.get('shop') as string)?.trim();
  const quantity_str     = (formData.get('quantity') as string)?.trim();
  const current_str      = (formData.get('current_quantity') as string)?.trim();
  const notes            = (formData.get('notes') as string)?.trim();

  if (!product || !shop) return { error: 'Invalid stock item.' };

  const amount = Number(quantity_str);
  if (!quantity_str || isNaN(amount) || amount <= 0) {
    return { error: 'Quantity must be greater than 0.' };
  }

  // Add mode → POST /stock/add/
  if (mode === 'add') {
    try {
      const res = await fetch(`${API()}/api/v1/inventory/stock/add/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${await authToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ product, shop, quantity: amount, notes: notes || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { error: extractApiError(data, res.status, 'Failed to add stock.') };
      revalidatePath('/[locale]/(dashboard)/inventory', 'page');
      return { success: true };
    } catch {
      return { error: 'Network error. Please try again.' };
    }
  }

  // Remove / Set → POST /stock/adjust/
  const current     = Number(current_str ?? 0);
  const new_quantity = mode === 'set' ? amount : Math.max(0, current - amount);

  if (mode === 'remove' && amount > current) {
    return { error: `Cannot remove ${amount} — current stock is ${current}.` };
  }

  try {
    const res = await fetch(`${API()}/api/v1/inventory/stock/adjust/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${await authToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ product, shop, new_quantity, notes: notes || undefined }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: extractApiError(data, res.status, 'Failed to adjust stock.') };
    revalidatePath('/[locale]/(dashboard)/inventory', 'page');
    return { success: true };
  } catch {
    return { error: 'Network error. Please try again.' };
  }
}

// ── Products for a shop (used in inbound form) ────────────────────────────────

export type ProductsResult =
  | { ok: true; data: Product[] }
  | { ok: false; error: string };

export async function fetchProductsForShopAction(shopId: string): Promise<ProductsResult> {
  try {
    const url = new URL(`${API()}/api/v1/products/`);
    url.searchParams.set('shop', shopId);
    url.searchParams.set('is_active', 'true');
    url.searchParams.set('page_size', '200');

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${await authToken()}` },
      cache: 'no-store',
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, error: extractApiError(json, res.status) };
    return { ok: true, data: (json as ApiList<Product>).results ?? [] };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' };
  }
}

// ── Inbound receiving ────────────────────────────────────────────────────────

export type InboundState =
  | { success: true; reference: string }
  | { error: string }
  | null;

export async function createInboundTransactionAction(
  _prev: InboundState,
  formData: FormData,
): Promise<InboundState> {
  const shop      = (formData.get('shop')      as string)?.trim();
  const reference = (formData.get('reference') as string)?.trim();
  const notes     = (formData.get('notes')     as string)?.trim();
  const itemsJson = (formData.get('items')     as string)?.trim();

  if (!shop)      return { error: 'Shop is required.' };
  if (!reference) return { error: 'Reference / invoice number is required.' };

  type ItemInput = {
    product_id:    string;
    quantity:      string;
    unit_cost?:    string;
    expiry_date?:  string;
    batch_number?: string;
  };

  let items: ItemInput[];
  try {
    items = JSON.parse(itemsJson || '[]');
  } catch {
    return { error: 'Invalid items payload.' };
  }

  if (!Array.isArray(items) || items.length === 0) {
    return { error: 'At least one item is required.' };
  }

  for (const item of items) {
    if (!item.product_id) return { error: 'Each item must have a product selected.' };
    const qty = Number(item.quantity);
    if (!item.quantity || isNaN(qty) || qty <= 0) {
      return { error: 'Each item must have a quantity greater than 0.' };
    }
  }

  const body: Record<string, unknown> = {
    shop,
    reference,
    items: items.map(i => ({
      product_id:   i.product_id,
      quantity:     i.quantity,
      unit_cost:    i.unit_cost    || undefined,
      expiry_date:  i.expiry_date  || undefined,
      batch_number: i.batch_number || undefined,
    })),
  };
  if (notes) body.notes = notes;

  try {
    const res = await fetch(`${API()}/api/v1/inventory/inbound/`, {
      method: 'POST',
      headers: {
        Authorization:  `Bearer ${await authToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: extractApiError(data, res.status, 'Failed to record inbound.') };
    revalidatePath('/[locale]/(dashboard)/inventory', 'page');
    return { success: true, reference };
  } catch {
    return { error: 'Network error. Please try again.' };
  }
}
