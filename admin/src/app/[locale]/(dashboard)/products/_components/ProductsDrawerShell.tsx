'use client';

import { useActionState, useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ImageIcon, DollarSign, Barcode, Layers, ToggleLeft, ToggleRight, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Drawer from '@/components/ds/Drawer';
import ConfirmDialog from '@/components/ds/ConfirmDialog';
import { ProductDrawerContext } from './ProductDrawerContext';
import {
  createCategoryAction,   updateCategoryAction,   deleteCategoryAction,
  createProductAction,    updateProductAction,     deleteProductAction,
  type CreateCategoryState, type UpdateCategoryState,
  type CreateProductState,  type UpdateProductState,
} from '@/actions/products';
import type { Category, Product } from '@/types/api';

interface Props {
  children:   React.ReactNode;
  categories: Category[];
}

type DrawerMode =
  | { type: 'createProduct'; defaultCategoryId?: string }
  | { type: 'editProduct';   product: Product }
  | { type: 'createCategory' }
  | { type: 'editCategory';  category: Category }
  | null;

type DeleteMode =
  | { type: 'product';  item: Product }
  | { type: 'category'; item: Category }
  | null;

export default function ProductsDrawerShell({ children, categories }: Props) {
  const router = useRouter();
  const [drawer, setDrawer]   = useState<DrawerMode>(null);
  const [delMode, setDelMode] = useState<DeleteMode>(null);

  function openCreateProduct(defaultCategoryId?: string) { setDrawer({ type: 'createProduct', defaultCategoryId }); }
  function openEditProduct(product: Product)             { setDrawer({ type: 'editProduct', product }); }
  function openDeleteProduct(product: Product)           { setDelMode({ type: 'product', item: product }); }
  function openCreateCategory()                          { setDrawer({ type: 'createCategory' }); }
  function openEditCategory(category: Category)          { setDrawer({ type: 'editCategory', category }); }
  function openDeleteCategory(category: Category)        { setDelMode({ type: 'category', item: category }); }

  function closeDrawer() { setDrawer(null); }
  function closeDelete() { setDelMode(null); }

  function handleMutate() { router.refresh(); }

  const drawerTitle =
    drawer?.type === 'createProduct'  ? 'Add Product'       :
    drawer?.type === 'editProduct'    ? 'Edit Product'      :
    drawer?.type === 'createCategory' ? 'New Category'      :
    drawer?.type === 'editCategory'   ? 'Edit Category'     : '';

  return (
    <ProductDrawerContext.Provider value={{
      openCreateProduct, openEditProduct,  openDeleteProduct,
      openCreateCategory, openEditCategory, openDeleteCategory,
    }}>
      {children}

      {/* ── Product drawer ─────────────────────────────────────────────────── */}
      <Drawer
        open={drawer?.type === 'createProduct' || drawer?.type === 'editProduct'}
        onClose={closeDrawer}
        title={drawerTitle}
      >
        {drawer?.type === 'createProduct' && (
          <CreateProductContent
            categories={categories}
            defaultCategoryId={drawer.defaultCategoryId}
            onSuccess={() => { closeDrawer(); handleMutate(); }}
            onClose={closeDrawer}
          />
        )}
        {drawer?.type === 'editProduct' && (
          <EditProductContent
            key={drawer.product.id}
            product={drawer.product}
            categories={categories}
            onSuccess={() => { closeDrawer(); handleMutate(); }}
            onClose={closeDrawer}
          />
        )}
      </Drawer>

      {/* ── Category drawer ────────────────────────────────────────────────── */}
      <Drawer
        open={drawer?.type === 'createCategory' || drawer?.type === 'editCategory'}
        onClose={closeDrawer}
        title={drawerTitle}
      >
        {drawer?.type === 'createCategory' && (
          <CreateCategoryContent
            onSuccess={() => { closeDrawer(); handleMutate(); }}
            onClose={closeDrawer}
          />
        )}
        {drawer?.type === 'editCategory' && (
          <EditCategoryContent
            key={drawer.category.id}
            category={drawer.category}
            onSuccess={() => { closeDrawer(); handleMutate(); }}
            onClose={closeDrawer}
          />
        )}
      </Drawer>

      {/* ── Delete product ─────────────────────────────────────────────────── */}
      <DeleteProductDialog
        product={delMode?.type === 'product' ? delMode.item : null}
        onClose={closeDelete}
        onSuccess={() => { closeDelete(); handleMutate(); }}
      />

      {/* ── Delete category ────────────────────────────────────────────────── */}
      <DeleteCategoryDialog
        category={delMode?.type === 'category' ? delMode.item : null}
        onClose={closeDelete}
        onSuccess={() => { closeDelete(); handleMutate(); }}
      />
    </ProductDrawerContext.Provider>
  );
}

// ── Create Product ────────────────────────────────────────────────────────────

function CreateProductContent({
  categories,
  defaultCategoryId,
  onSuccess,
  onClose,
}: {
  categories: Category[];
  defaultCategoryId?: string;
  onSuccess: () => void;
  onClose: () => void;
}) {
  const [state, dispatch, isPending] = useActionState<CreateProductState, FormData>(createProductAction, null);
  useEffect(() => { if (state && 'success' in state) onSuccess(); }, [state, onSuccess]);
  const error = state && 'error' in state ? state.error : null;

  return (
    <ProductForm
      categories={categories}
      defaultCategoryId={defaultCategoryId}
      dispatch={dispatch}
      isPending={isPending}
      error={error}
      submitLabel="Add product"
      onClose={onClose}
    />
  );
}

// ── Edit Product ──────────────────────────────────────────────────────────────

function EditProductContent({
  product,
  categories,
  onSuccess,
  onClose,
}: {
  product: Product;
  categories: Category[];
  onSuccess: () => void;
  onClose: () => void;
}) {
  const boundAction = updateProductAction.bind(null, product.id);
  const [state, dispatch, isPending] = useActionState<UpdateProductState, FormData>(boundAction, null);
  useEffect(() => { if (state && 'success' in state) onSuccess(); }, [state, onSuccess]);
  const error = state && 'error' in state ? state.error : null;

  return (
    <ProductForm
      product={product}
      categories={categories}
      dispatch={dispatch}
      isPending={isPending}
      error={error}
      submitLabel="Save changes"
      onClose={onClose}
    />
  );
}

// ── Shared Product Form ───────────────────────────────────────────────────────

function ProductForm({
  product,
  categories,
  defaultCategoryId,
  dispatch,
  isPending,
  error,
  submitLabel,
  onClose,
}: {
  product?: Product;
  categories: Category[];
  defaultCategoryId?: string;
  dispatch: (fd: FormData) => void;
  isPending: boolean;
  error: string | null;
  submitLabel: string;
  onClose: () => void;
}) {
  const [imagePreview, setImagePreview] = useState<string | null>(product?.thumbnail_url ?? null);
  const [isActive, setIsActive]         = useState(product?.is_active ?? true);
  const [trackInv,  setTrackInv]        = useState(product?.track_inventory ?? false);
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <form action={dispatch} className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        <div className="p-5 space-y-5">
          {error && <FormError message={error} />}

          <input type="hidden" name="is_active"        value={String(isActive)} />
          <input type="hidden" name="track_inventory"  value={String(trackInv)} />

          {/* Image */}
          <div>
            <p className="text-sm font-semibold text-foreground mb-1.5">Product Image</p>
            <div
              onClick={() => fileRef.current?.click()}
              className="relative h-[120px] rounded-xl border-2 border-dashed border-input bg-muted/30 hover:border-primary/40 hover:bg-primary/[0.02] cursor-pointer transition-all flex flex-col items-center justify-center gap-1.5 overflow-hidden"
            >
              {imagePreview ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imagePreview} alt="" className="absolute inset-0 w-full h-full object-cover rounded-[10px]" />
                  <div className="absolute inset-0 bg-black/25 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity rounded-[10px]">
                    <p className="text-xs font-semibold text-white">Change image</p>
                  </div>
                </>
              ) : (
                <>
                  <ImageIcon size={20} className="text-muted-foreground/50" />
                  <p className="text-xs text-muted-foreground">Click to upload · JPEG, PNG, WebP</p>
                </>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              name="image_upload"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={async e => {
                const f = e.target.files?.[0];
                if (!f) return;
                const converted = await convertToJpeg(f);
                if (converted !== f) {
                  const dt = new DataTransfer();
                  dt.items.add(converted);
                  e.target.files = dt.files;
                }
                setImagePreview(URL.createObjectURL(converted));
              }}
            />
          </div>

          {/* Basic info */}
          <SectionLabel>Basic Info</SectionLabel>

          <Input
            label="Product name"
            name="name"
            type="text"
            defaultValue={product?.name ?? ''}
            required
            placeholder="e.g. Coca Cola 500ml"
          />

          <div>
            <label className="text-sm font-semibold text-foreground block mb-1.5">Category</label>
            <select
              name="category"
              defaultValue={product?.category ?? defaultCategoryId ?? ''}
              className={selectCls}
            >
              <option value="">— Uncategorized —</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label className="text-sm font-semibold text-foreground block mb-1.5">Description</label>
            <textarea
              name="description"
              defaultValue={product?.description ?? ''}
              placeholder="Optional product description"
              rows={2}
              className={cn(selectCls, 'resize-none h-auto py-2 leading-relaxed min-h-[64px]')}
            />
          </div>

          {/* Pricing */}
          <SectionLabel>Pricing</SectionLabel>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Selling price (SDG)"
              name="price"
              type="number"
              step="0.01"
              min="0"
              defaultValue={product?.price ?? ''}
              required
              placeholder="0.00"
              icon={<DollarSign size={14} />}
            />
            <Input
              label="Cost price (SDG)"
              name="cost_price"
              type="number"
              step="0.01"
              min="0"
              defaultValue={product?.cost_price ?? ''}
              placeholder="0.00"
              icon={<DollarSign size={14} />}
            />
          </div>

          {/* Identifiers */}
          <SectionLabel>Identifiers</SectionLabel>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="SKU"
              name="sku"
              type="text"
              defaultValue={product?.sku ?? ''}
              placeholder="BEV-001"
            />
            <Input
              label="Barcode"
              name="barcode"
              type="text"
              defaultValue={product?.barcode ?? ''}
              placeholder="628194…"
              icon={<Barcode size={14} />}
            />
          </div>

          <Input
            label="Unit"
            name="unit"
            type="text"
            defaultValue={product?.unit ?? ''}
            placeholder="piece"
            hint="e.g. piece, kg, litre, box"
          />

          {/* Settings */}
          <SectionLabel>Settings</SectionLabel>

          <div className="rounded-xl border border-input bg-muted/20 divide-y divide-input">
            <ToggleRow
              label="Active"
              description="Visible and available in POS"
              value={isActive}
              onChange={setIsActive}
            />
            <ToggleRow
              label="Track inventory"
              description="Monitor and alert on stock levels"
              value={trackInv}
              onChange={setTrackInv}
            />
            {trackInv && (
              <div className="p-3.5">
                <Input
                  label="Minimum stock level"
                  name="min_stock_level"
                  type="number"
                  min="0"
                  defaultValue={product?.min_stock_level ?? 5}
                  hint="You'll be alerted when stock falls below this"
                  icon={<Layers size={14} />}
                />
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Footer */}
      <div className="shrink-0 flex items-center justify-end gap-2 px-5 py-4 border-t border-border">
        <Button variant="secondary" size="sm" type="button" onClick={onClose}>Cancel</Button>
        <Button size="sm" type="submit" disabled={isPending}>
          {isPending ? 'Saving…' : submitLabel}
        </Button>
      </div>
    </form>
  );
}

// ── Create Category ───────────────────────────────────────────────────────────

function CreateCategoryContent({ onSuccess, onClose }: { onSuccess: () => void; onClose: () => void }) {
  const [state, dispatch, isPending] = useActionState<CreateCategoryState, FormData>(createCategoryAction, null);
  useEffect(() => { if (state && 'success' in state) onSuccess(); }, [state, onSuccess]);
  const error = state && 'error' in state ? state.error : null;

  return (
    <CategoryForm
      dispatch={dispatch} isPending={isPending} error={error}
      submitLabel="Create category" onClose={onClose}
    />
  );
}

// ── Edit Category ─────────────────────────────────────────────────────────────

function EditCategoryContent({
  category,
  onSuccess,
  onClose,
}: {
  category: Category;
  onSuccess: () => void;
  onClose: () => void;
}) {
  const boundAction = updateCategoryAction.bind(null, category.id);
  const [state, dispatch, isPending] = useActionState<UpdateCategoryState, FormData>(boundAction, null);
  useEffect(() => { if (state && 'success' in state) onSuccess(); }, [state, onSuccess]);
  const error = state && 'error' in state ? state.error : null;

  return (
    <CategoryForm
      category={category}
      dispatch={dispatch} isPending={isPending} error={error}
      submitLabel="Save changes" onClose={onClose}
    />
  );
}

// ── Shared Category Form ──────────────────────────────────────────────────────

function CategoryForm({
  category,
  dispatch,
  isPending,
  error,
  submitLabel,
  onClose,
}: {
  category?: Category;
  dispatch: (fd: FormData) => void;
  isPending: boolean;
  error: string | null;
  submitLabel: string;
  onClose: () => void;
}) {
  const [imagePreview, setImagePreview] = useState<string | null>(category?.thumbnail_url ?? null);
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <form action={dispatch} className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        <div className="p-5 space-y-5">
          {error && <FormError message={error} />}

          {/* Image */}
          <div>
            <p className="text-sm font-semibold text-foreground mb-1.5">Category Image</p>
            <div
              onClick={() => fileRef.current?.click()}
              className="relative h-[130px] rounded-xl border-2 border-dashed border-input bg-muted/30 hover:border-primary/40 hover:bg-primary/[0.02] cursor-pointer transition-all flex flex-col items-center justify-center gap-1.5 overflow-hidden"
            >
              {imagePreview ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imagePreview} alt="" className="absolute inset-0 w-full h-full object-cover rounded-[10px]" />
                  <div className="absolute inset-0 bg-black/25 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity rounded-[10px]">
                    <p className="text-xs font-semibold text-white">Change image</p>
                  </div>
                </>
              ) : (
                <>
                  <ImageIcon size={22} className="text-muted-foreground/50" />
                  <p className="text-xs text-muted-foreground">Click to upload · JPEG, PNG, WebP · max 10 MB</p>
                </>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              name="image_upload"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={async e => {
                const f = e.target.files?.[0];
                if (!f) return;
                const converted = await convertToJpeg(f);
                if (converted !== f) {
                  const dt = new DataTransfer();
                  dt.items.add(converted);
                  e.target.files = dt.files;
                }
                setImagePreview(URL.createObjectURL(converted));
              }}
            />
          </div>

          <Input
            label="Name"
            name="name"
            type="text"
            defaultValue={category?.name ?? ''}
            required
            placeholder="e.g. Beverages"
          />

          <div>
            <label className="text-sm font-semibold text-foreground block mb-1.5">Description</label>
            <textarea
              name="description"
              defaultValue={category?.description ?? ''}
              placeholder="Optional description"
              rows={2}
              className={cn(selectCls, 'resize-none h-auto py-2 leading-relaxed min-h-[64px]')}
            />
          </div>

          <Input
            label="Sort order"
            name="sort_order"
            type="number"
            defaultValue={String(category?.sort_order ?? 0)}
            min="0"
            hint="Lower numbers appear first"
          />
        </div>
      </div>

      <div className="shrink-0 flex items-center justify-end gap-2 px-5 py-4 border-t border-border">
        <Button variant="secondary" size="sm" type="button" onClick={onClose}>Cancel</Button>
        <Button size="sm" type="submit" disabled={isPending}>
          {isPending ? 'Saving…' : submitLabel}
        </Button>
      </div>
    </form>
  );
}

// ── Delete dialogs ─────────────────────────────────────────────────────────────

function DeleteProductDialog({
  product,
  onClose,
  onSuccess,
}: {
  product: Product | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [isPending, start] = useTransition();
  const [error, setError]  = useState<string | null>(null);

  function handleConfirm() {
    if (!product) return;
    start(async () => {
      const res = await deleteProductAction(product.id);
      if (res && 'error' in res) setError(res.error);
      else onSuccess();
    });
  }

  return (
    <ConfirmDialog
      open={!!product}
      title="Delete product?"
      description={error ?? `"${product?.name}" will be removed from your catalog. This cannot be undone.`}
      confirmLabel="Delete"
      variant="danger"
      loading={isPending}
      onConfirm={handleConfirm}
      onClose={() => { setError(null); onClose(); }}
    />
  );
}

function DeleteCategoryDialog({
  category,
  onClose,
  onSuccess,
}: {
  category: Category | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [isPending, start] = useTransition();
  const [error, setError]  = useState<string | null>(null);

  function handleConfirm() {
    if (!category) return;
    start(async () => {
      const res = await deleteCategoryAction(category.id);
      if (res && 'error' in res) setError(res.error);
      else onSuccess();
    });
  }

  return (
    <ConfirmDialog
      open={!!category}
      title="Delete category?"
      description={error ?? `"${category?.name}" will be deactivated. Products inside will become uncategorized.`}
      confirmLabel="Delete"
      variant="danger"
      loading={isPending}
      onConfirm={handleConfirm}
      onClose={() => { setError(null); onClose(); }}
    />
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 pt-1">
      <p className="text-[10px] font-black tracking-[.15em] uppercase text-muted-foreground">{children}</p>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

function ToggleRow({
  label, description, value, onChange,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="w-full flex items-center justify-between gap-4 p-3.5 text-start hover:bg-muted/30 transition-colors"
      aria-pressed={value}
    >
      <div>
        <p className="text-sm font-semibold text-foreground leading-tight">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      {value
        ? <ToggleRight size={26} className="text-primary shrink-0" />
        : <ToggleLeft  size={26} className="text-muted-foreground/40 shrink-0" />
      }
    </button>
  );
}

function FormError({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-destructive/20 bg-destructive/5 px-3.5 py-3">
      <AlertCircle size={14} className="text-destructive shrink-0 mt-0.5" />
      <p className="text-xs font-semibold text-destructive leading-relaxed">{message}</p>
    </div>
  );
}

const selectCls =
  'flex h-9 w-full rounded-md border border-input bg-background px-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:opacity-50 transition-colors';

async function convertToJpeg(file: File): Promise<File> {
  if (file.type !== 'image/png') return file;
  return new Promise(resolve => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width  = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(blob => {
        resolve(new File([blob!], file.name.replace(/\.png$/i, '.jpg'), { type: 'image/jpeg' }));
      }, 'image/jpeg', 0.92);
    };
    img.src = url;
  });
}
