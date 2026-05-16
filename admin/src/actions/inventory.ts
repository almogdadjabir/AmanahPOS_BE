'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { extractApiError } from '@/lib/action-error';
import { devFetch } from '@/lib/dev-logger';
import type { ApiList, ApiResponse, ExpiryBatch, InboundTransaction, PremiumInventorySummary, Product, StockLevel, StockMovement, Vendor, VendorSummaryData } from '@/types/api';

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
  const vendor_id = (formData.get('vendor_id') as string)?.trim();
  const reference = (formData.get('reference') as string)?.trim();
  const notes     = (formData.get('notes')     as string)?.trim();
  const itemsJson = (formData.get('items')     as string)?.trim();

  if (!shop)      return { error: 'Shop is required.' };
  if (!vendor_id) return { error: 'Vendor is required.' };
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
    shop_id:   shop,
    vendor_id,
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
    const res = await devFetch(`${API()}/api/v1/inventory/inbound/`, {
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

// ── Vendor list ───────────────────────────────────────────────────────────────

export type VendorsResult =
  | { ok: true; data: Vendor[] }
  | { ok: false; error: string };

export async function fetchVendorsAction(): Promise<VendorsResult> {
  try {
    const res = await fetch(
      `${API()}/api/v1/inventory/vendors/?is_active=true&page_size=200`,
      {
        headers: { Authorization: `Bearer ${await authToken()}` },
        cache: 'no-store',
      },
    );
    const json = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, error: extractApiError(json, res.status) };
    return { ok: true, data: (json as ApiList<Vendor>).results ?? [] };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' };
  }
}

// ── Premium summary ───────────────────────────────────────────────────────────

export type PremiumSummaryResult =
  | { ok: true; data: PremiumInventorySummary }
  | { ok: false; error: string };

export async function fetchPremiumSummaryAction(shopId?: string): Promise<PremiumSummaryResult> {
  try {
    const url = new URL(`${API()}/api/v1/inventory/premium-summary/`);
    if (shopId) url.searchParams.set('shop_id', shopId);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${await authToken()}` },
      cache: 'no-store',
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, error: extractApiError(json, res.status) };
    return { ok: true, data: (json as ApiResponse<PremiumInventorySummary>).data };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' };
  }
}

// ── Inbound transaction detail ────────────────────────────────────────────────

export type InboundDetailResult =
  | { ok: true; data: InboundTransaction }
  | { ok: false; error: string };

export async function fetchInboundTransactionAction(id: string): Promise<InboundDetailResult> {
  try {
    const res = await fetch(`${API()}/api/v1/inventory/inbound/${id}/`, {
      headers: { Authorization: `Bearer ${await authToken()}` },
      cache: 'no-store',
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, error: extractApiError(json, res.status) };
    return { ok: true, data: (json as ApiResponse<InboundTransaction>).data };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' };
  }
}

// ── Expiry report ─────────────────────────────────────────────────────────────

export interface ExpiryReportParams {
  status?:    'expiring_soon' | 'expired' | 'all';
  shop_id?:   string;
  vendor_id?: string;
  date_from?: string;
  date_to?:   string;
  search?:    string;
  page?:      number;
}

export type ExpiryReportResult =
  | { ok: true; data: ExpiryBatch[]; count: number; total_pages: number }
  | { ok: false; error: string };

export async function fetchExpiryReportAction(params: ExpiryReportParams = {}): Promise<ExpiryReportResult> {
  try {
    const url = new URL(`${API()}/api/v1/inventory/reports/expiry/`);
    if (params.status)    url.searchParams.set('status',    params.status);
    if (params.shop_id)   url.searchParams.set('shop_id',   params.shop_id);
    if (params.vendor_id) url.searchParams.set('vendor_id', params.vendor_id);
    if (params.date_from) url.searchParams.set('date_from', params.date_from);
    if (params.date_to)   url.searchParams.set('date_to',   params.date_to);
    if (params.search)    url.searchParams.set('search',    params.search);
    if (params.page)      url.searchParams.set('page',      String(params.page));

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${await authToken()}` },
      cache: 'no-store',
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, error: extractApiError(json, res.status) };
    const list = json as ApiList<ExpiryBatch>;
    return { ok: true, data: list.results ?? [], count: list.count ?? 0, total_pages: list.total_pages ?? 1 };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' };
  }
}

// ── Vendor list (management — supports showAll + search) ──────────────────────

export interface VendorsManagementParams {
  search?:  string;
  showAll?: boolean;
}

export async function fetchVendorsManagementAction(
  params: VendorsManagementParams = {},
): Promise<VendorsResult> {
  try {
    const url = new URL(`${API()}/api/v1/inventory/vendors/`);
    if (!params.showAll) url.searchParams.set('is_active', 'true');
    if (params.search)   url.searchParams.set('search', params.search);
    url.searchParams.set('page_size', '200');

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${await authToken()}` },
      cache: 'no-store',
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, error: extractApiError(json, res.status) };
    return { ok: true, data: (json as ApiList<Vendor>).results ?? [] };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' };
  }
}

// ── Inbound transaction list ───────────────────────────────────────────────────

export interface InboundListParams {
  vendor_id?: string;
  shop_id?:   string;
  search?:    string;
  page?:      number;
}

export type InboundListResult =
  | { ok: true; data: InboundTransaction[]; count: number; total_pages: number }
  | { ok: false; error: string };

export async function fetchInboundListAction(
  params: InboundListParams = {},
): Promise<InboundListResult> {
  try {
    const url = new URL(`${API()}/api/v1/inventory/inbound/`);
    if (params.vendor_id) url.searchParams.set('vendor_id', params.vendor_id);
    if (params.shop_id)   url.searchParams.set('shop_id',   params.shop_id);
    if (params.search)    url.searchParams.set('search',    params.search);
    if (params.page)      url.searchParams.set('page',      String(params.page));
    url.searchParams.set('page_size', '20');

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${await authToken()}` },
      cache: 'no-store',
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, error: extractApiError(json, res.status) };
    const list = json as ApiList<InboundTransaction>;
    return { ok: true, data: list.results ?? [], count: list.count ?? 0, total_pages: list.total_pages ?? 1 };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' };
  }
}

// ── Vendor mutations ──────────────────────────────────────────────────────────

export type VendorFormState =
  | { success: true; vendor: Vendor }
  | { error: string }
  | null;

export async function createVendorAction(
  _prev: VendorFormState,
  formData: FormData,
): Promise<VendorFormState> {
  const name    = (formData.get('name')    as string)?.trim();
  const phone   = (formData.get('phone')   as string)?.trim();
  const email   = (formData.get('email')   as string)?.trim();
  const address = (formData.get('address') as string)?.trim();
  const notes   = (formData.get('notes')   as string)?.trim();

  if (!name) return { error: 'Vendor name is required.' };

  try {
    const res = await devFetch(`${API()}/api/v1/inventory/vendors/`, {
      method: 'POST',
      headers: {
        Authorization:  `Bearer ${await authToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        phone:   phone   || undefined,
        email:   email   || undefined,
        address: address || undefined,
        notes:   notes   || undefined,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: extractApiError(data, res.status, 'Failed to create vendor.') };
    return { success: true, vendor: (data as ApiResponse<Vendor>).data };
  } catch {
    return { error: 'Network error. Please try again.' };
  }
}

export async function updateVendorAction(
  _prev: VendorFormState,
  formData: FormData,
): Promise<VendorFormState> {
  const id      = (formData.get('id')      as string)?.trim();
  const name    = (formData.get('name')    as string)?.trim();
  const phone   = (formData.get('phone')   as string)?.trim();
  const email   = (formData.get('email')   as string)?.trim();
  const address = (formData.get('address') as string)?.trim();
  const notes   = (formData.get('notes')   as string)?.trim();

  if (!id)   return { error: 'Vendor ID is missing.' };
  if (!name) return { error: 'Vendor name is required.' };

  try {
    const res = await devFetch(`${API()}/api/v1/inventory/vendors/${id}/`, {
      method: 'PATCH',
      headers: {
        Authorization:  `Bearer ${await authToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, phone, email, address, notes }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: extractApiError(data, res.status, 'Failed to update vendor.') };
    return { success: true, vendor: (data as ApiResponse<Vendor>).data };
  } catch {
    return { error: 'Network error. Please try again.' };
  }
}

export async function deactivateVendorAction(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await devFetch(`${API()}/api/v1/inventory/vendors/${id}/`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${await authToken()}` },
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { ok: false, error: extractApiError(data, res.status, 'Failed to deactivate vendor.') };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: 'Network error. Please try again.' };
  }
}

export async function reactivateVendorAction(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await devFetch(`${API()}/api/v1/inventory/vendors/${id}/`, {
      method: 'PATCH',
      headers: {
        Authorization:  `Bearer ${await authToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ is_active: true }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: extractApiError(data, res.status, 'Failed to reactivate vendor.') };
    return { ok: true };
  } catch {
    return { ok: false, error: 'Network error. Please try again.' };
  }
}

// ── Vendor inbound summary ────────────────────────────────────────────────────

export interface VendorSummaryParams {
  shop_id?:   string;
  date_from?: string;
  date_to?:   string;
}

export type VendorSummaryResult =
  | { ok: true; data: VendorSummaryData }
  | { ok: false; error: string };

export async function fetchVendorSummaryAction(
  params: VendorSummaryParams = {},
): Promise<VendorSummaryResult> {
  try {
    const url = new URL(`${API()}/api/v1/inventory/inbound/vendor-summary/`);
    if (params.shop_id)   url.searchParams.set('shop_id',   params.shop_id);
    if (params.date_from) url.searchParams.set('date_from', params.date_from);
    if (params.date_to)   url.searchParams.set('date_to',   params.date_to);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${await authToken()}` },
      cache: 'no-store',
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, error: extractApiError(json, res.status) };
    return { ok: true, data: (json as ApiResponse<VendorSummaryData>).data };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' };
  }
}
