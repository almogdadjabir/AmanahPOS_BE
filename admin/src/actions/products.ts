'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { extractApiError } from '@/lib/action-error';
import type { ApiList, Category, Product } from '@/types/api';

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

export type CategoriesResult =
  | { ok: true; data: Category[] }
  | { ok: false; error: string };

export type ProductsResult =
  | { ok: true; data: Product[]; count: number; total_pages: number }
  | { ok: false; error: string };

// ── Category actions ──────────────────────────────────────────────────────────

export async function fetchCategoriesAction(): Promise<CategoriesResult> {
  try {
    const res = await fetch(`${API()}/api/v1/products/categories/`, {
      headers: { Authorization: `Bearer ${await authToken()}` },
      cache: 'no-store',
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, error: extractApiError(json, res.status) };
    return { ok: true, data: json?.data ?? [] };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' };
  }
}

export type CreateCategoryState = ActionState;

export async function createCategoryAction(
  _prev: CreateCategoryState,
  formData: FormData,
): Promise<CreateCategoryState> {
  const name        = (formData.get('name') as string)?.trim();
  const description = (formData.get('description') as string)?.trim();
  const sort_order  = (formData.get('sort_order') as string)?.trim();
  const image_file  = formData.get('image_upload') as File | null;

  if (!name) return { error: 'Category name is required.' };

  const body = new FormData();
  body.set('name', name);
  if (description) body.set('description', description);
  if (sort_order)  body.set('sort_order', sort_order);
  if (image_file && image_file.size > 0) body.set('image_upload', image_file);

  try {
    const res = await fetch(`${API()}/api/v1/products/categories/`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${await authToken()}` },
      body,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: extractApiError(data, res.status, 'Failed to create category.') };
    revalidatePath('/[locale]/(dashboard)/products', 'page');
    return { success: true };
  } catch {
    return { error: 'Network error. Please try again.' };
  }
}

export type UpdateCategoryState = ActionState;

export async function updateCategoryAction(
  categoryId: string,
  _prev: UpdateCategoryState,
  formData: FormData,
): Promise<UpdateCategoryState> {
  const name        = (formData.get('name') as string)?.trim();
  const description = (formData.get('description') as string)?.trim();
  const sort_order  = (formData.get('sort_order') as string)?.trim();
  const image_file  = formData.get('image_upload') as File | null;

  if (!name) return { error: 'Category name is required.' };

  const body = new FormData();
  body.set('name', name);
  body.set('description', description ?? '');
  if (sort_order) body.set('sort_order', sort_order);
  if (image_file && image_file.size > 0) body.set('image_upload', image_file);

  try {
    const res = await fetch(`${API()}/api/v1/products/categories/${categoryId}/`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${await authToken()}` },
      body,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: extractApiError(data, res.status, 'Failed to update category.') };
    revalidatePath('/[locale]/(dashboard)/products', 'page');
    return { success: true };
  } catch {
    return { error: 'Network error. Please try again.' };
  }
}

export type DeleteCategoryState = ActionState;

export async function deleteCategoryAction(categoryId: string): Promise<DeleteCategoryState> {
  try {
    const res = await fetch(`${API()}/api/v1/products/categories/${categoryId}/`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${await authToken()}` },
    });
    if (res.status === 204 || res.ok) {
      revalidatePath('/[locale]/(dashboard)/products', 'page');
      return { success: true };
    }
    const data = await res.json().catch(() => ({}));
    return { error: extractApiError(data, res.status, 'Failed to delete category.') };
  } catch {
    return { error: 'Network error. Please try again.' };
  }
}

// ── Product actions ───────────────────────────────────────────────────────────

export async function fetchProductsAction(params?: {
  category?: string;
  search?: string;
  status?: string;  // 'active' | 'inactive'
  page?: number;
  limit?: number;
}): Promise<ProductsResult> {
  try {
    const url = new URL(`${API()}/api/v1/products/`);
    if (params?.category) url.searchParams.set('category', params.category);
    if (params?.search)   url.searchParams.set('search', params.search);
    if (params?.status === 'active')   url.searchParams.set('is_active', 'true');
    if (params?.status === 'inactive') url.searchParams.set('is_active', 'false');
    if (params?.page)     url.searchParams.set('page', String(params.page));
    url.searchParams.set('page_size', String(params?.limit ?? 25));

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${await authToken()}` },
      cache: 'no-store',
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, error: extractApiError(json, res.status) };
    const list = json as ApiList<Product>;
    return { ok: true, data: list.results ?? [], count: list.count ?? 0, total_pages: list.total_pages ?? 1 };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' };
  }
}

export type CreateProductState = ActionState;

export async function createProductAction(
  _prev: CreateProductState,
  formData: FormData,
): Promise<CreateProductState> {
  const name          = (formData.get('name') as string)?.trim();
  const category      = (formData.get('category') as string)?.trim();
  const description   = (formData.get('description') as string)?.trim();
  const sku           = (formData.get('sku') as string)?.trim();
  const barcode       = (formData.get('barcode') as string)?.trim();
  const price         = (formData.get('price') as string)?.trim();
  const cost_price    = (formData.get('cost_price') as string)?.trim();
  const unit          = (formData.get('unit') as string)?.trim();
  const is_active     = formData.get('is_active') === 'true';
  const track_inv     = formData.get('track_inventory') === 'true';
  const min_stock     = (formData.get('min_stock_level') as string)?.trim();
  const image_file    = formData.get('image_upload') as File | null;

  if (!name)  return { error: 'Product name is required.' };
  if (!price) return { error: 'Price is required.' };

  const body = new FormData();
  body.set('name', name);
  body.set('price', price);
  body.set('is_active', String(is_active));
  body.set('track_inventory', String(track_inv));
  if (category)    body.set('category', category);
  if (description) body.set('description', description);
  if (sku)         body.set('sku', sku);
  if (barcode)     body.set('barcode', barcode);
  if (cost_price)  body.set('cost_price', cost_price);
  if (unit)        body.set('unit', unit);
  if (min_stock)   body.set('min_stock_level', min_stock);
  if (image_file && image_file.size > 0) body.set('image_upload', image_file);

  try {
    const res = await fetch(`${API()}/api/v1/products/`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${await authToken()}` },
      body,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: extractApiError(data, res.status, 'Failed to create product.') };
    revalidatePath('/[locale]/(dashboard)/products', 'page');
    return { success: true };
  } catch {
    return { error: 'Network error. Please try again.' };
  }
}

export type UpdateProductState = ActionState;

export async function updateProductAction(
  productId: string,
  _prev: UpdateProductState,
  formData: FormData,
): Promise<UpdateProductState> {
  const name       = (formData.get('name') as string)?.trim();
  const category   = (formData.get('category') as string)?.trim();
  const description= (formData.get('description') as string)?.trim();
  const sku        = (formData.get('sku') as string)?.trim();
  const barcode    = (formData.get('barcode') as string)?.trim();
  const price      = (formData.get('price') as string)?.trim();
  const cost_price = (formData.get('cost_price') as string)?.trim();
  const unit       = (formData.get('unit') as string)?.trim();
  const is_active  = formData.get('is_active') === 'true';
  const track_inv  = formData.get('track_inventory') === 'true';
  const min_stock  = (formData.get('min_stock_level') as string)?.trim();
  const image_file = formData.get('image_upload') as File | null;

  if (!name)  return { error: 'Product name is required.' };
  if (!price) return { error: 'Price is required.' };

  const body = new FormData();
  body.set('name', name);
  body.set('price', price);
  body.set('is_active', String(is_active));
  body.set('track_inventory', String(track_inv));
  body.set('description', description ?? '');
  body.set('sku', sku ?? '');
  body.set('barcode', barcode ?? '');
  body.set('cost_price', cost_price ?? '');
  body.set('unit', unit ?? '');
  if (category)  body.set('category', category);
  if (min_stock) body.set('min_stock_level', min_stock);
  if (image_file && image_file.size > 0) body.set('image_upload', image_file);

  try {
    const res = await fetch(`${API()}/api/v1/products/${productId}/`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${await authToken()}` },
      body,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: extractApiError(data, res.status, 'Failed to update product.') };
    revalidatePath('/[locale]/(dashboard)/products', 'page');
    return { success: true };
  } catch {
    return { error: 'Network error. Please try again.' };
  }
}

export type DeleteProductState = ActionState;

export async function deleteProductAction(productId: string): Promise<DeleteProductState> {
  try {
    const res = await fetch(`${API()}/api/v1/products/${productId}/`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${await authToken()}` },
    });
    if (res.status === 204 || res.ok) {
      revalidatePath('/[locale]/(dashboard)/products', 'page');
      return { success: true };
    }
    const data = await res.json().catch(() => ({}));
    return { error: extractApiError(data, res.status, 'Failed to delete product.') };
  } catch {
    return { error: 'Network error. Please try again.' };
  }
}

export type ToggleProductState = ActionState;

export async function toggleProductActiveAction(
  productId: string,
  newIsActive: boolean,
): Promise<ToggleProductState> {
  try {
    const res = await fetch(`${API()}/api/v1/products/${productId}/`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${await authToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ is_active: newIsActive }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: extractApiError(data, res.status, 'Failed to update product.') };
    revalidatePath('/[locale]/(dashboard)/products', 'page');
    return { success: true };
  } catch {
    return { error: 'Network error. Please try again.' };
  }
}
