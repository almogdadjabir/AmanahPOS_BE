'use client';

import {
  useActionState, useEffect, useRef, useState, useTransition,
} from 'react';
import { useRouter } from 'next/navigation';
import {
  Search, Plus, Pencil, Trash2, X, Tag, Package,
  AlertCircle, ImageIcon, ToggleLeft, ToggleRight,
  Barcode, DollarSign, Layers, FolderPlus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import ConfirmDialog from '@/components/ds/ConfirmDialog';
import {
  fetchCategoriesAction,
  fetchProductsAction,
  createCategoryAction,
  updateCategoryAction,
  deleteCategoryAction,
  createProductAction,
  updateProductAction,
  deleteProductAction,
  type CreateCategoryState,
  type UpdateCategoryState,
  type CreateProductState,
  type UpdateProductState,
} from '@/actions/products';
import type { Category, Product } from '@/types/api';

interface ProductsClientProps {
  initialCategories: Category[];
  initialProducts: Product[];
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default function ProductsClient({ initialCategories, initialProducts }: ProductsClientProps) {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [allProducts, setAllProducts] = useState<Product[]>(initialProducts);
  const [activeCatId, setActiveCatId] = useState<string | null>(null); // null = All
  const [search, setSearch] = useState('');
  const [isRefreshing, startRefresh] = useTransition();

  // Drawers
  const [catCreate, setCatCreate] = useState(false);
  const [catEdit,   setCatEdit]   = useState<Category | null>(null);
  const [catDelete, setCatDelete] = useState<Category | null>(null);
  const [prodCreate, setProdCreate] = useState(false);
  const [prodEdit,   setProdEdit]   = useState<Product | null>(null);
  const [prodDelete, setProdDelete] = useState<Product | null>(null);

  const activeCategory = categories.find(c => c.id === activeCatId) ?? null;

  const displayedProducts = allProducts.filter(p => {
    const inCat = !activeCatId || p.category === activeCatId;
    const q = search.trim().toLowerCase();
    const matches = !q ||
      p.name.toLowerCase().includes(q) ||
      (p.sku  ?? '').toLowerCase().includes(q) ||
      (p.barcode ?? '').toLowerCase().includes(q);
    return inCat && matches;
  });

  async function refresh() {
    startRefresh(async () => {
      const [cats, prods] = await Promise.all([
        fetchCategoriesAction(),
        fetchProductsAction({ limit: 500 }),
      ]);
      if (cats.ok)  setCategories(cats.data);
      if (prods.ok) setAllProducts(prods.data);
      router.refresh();
    });
  }

  const productCountFor = (catId: string) =>
    allProducts.filter(p => p.category === catId).length;

  return (
    <div className="space-y-5">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-black text-foreground tracking-tight leading-tight">Products</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            {categories.length} {categories.length === 1 ? 'category' : 'categories'} · {allProducts.length} products total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setCatCreate(true)}
            className="gap-1.5 hidden sm:flex"
          >
            <FolderPlus size={13} /> New Category
          </Button>
          <Button size="sm" onClick={() => setProdCreate(true)} className="gap-1.5">
            <Plus size={14} /> Add Product
          </Button>
        </div>
      </div>

      {/* ── Main panel ────────────────────────────────────────────────────── */}
      <div className="bg-card rounded-xl border border-border shadow-[0_1px_4px_0_rgb(0_0_0/.05)] overflow-hidden flex min-h-[520px]">

        {/* ── Categories sidebar ─────────────────────────────────────────── */}
        <div className="w-[200px] shrink-0 border-r border-border hidden sm:flex flex-col">
          <div className="px-3 py-3 border-b border-border">
            <p className="text-[10px] font-black tracking-[.18em] uppercase text-muted-foreground">Categories</p>
          </div>

          <div className="flex-1 overflow-y-auto py-1.5">
            {/* All */}
            <button
              onClick={() => setActiveCatId(null)}
              className={cn(
                'w-full flex items-center justify-between px-3 py-2 text-start transition-colors group relative',
                !activeCatId
                  ? 'bg-primary/[0.07]'
                  : 'hover:bg-muted/40',
              )}
            >
              {!activeCatId && (
                <span className="absolute left-0 top-1 bottom-1 w-[3px] bg-primary rounded-r-full" />
              )}
              <span className={cn(
                'text-[12px] font-semibold truncate',
                !activeCatId ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground',
              )}>
                All Products
              </span>
              <span className={cn(
                'text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ml-1',
                !activeCatId ? 'bg-primary/20 text-primary' : 'bg-muted/40 text-muted-foreground',
              )}>
                {allProducts.length}
              </span>
            </button>

            {/* Category rows */}
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCatId(cat.id)}
                className={cn(
                  'w-full flex items-center justify-between px-3 py-2 text-start transition-colors group relative',
                  activeCatId === cat.id
                    ? 'bg-primary/[0.07]'
                    : 'hover:bg-muted/40',
                )}
              >
                {activeCatId === cat.id && (
                  <span className="absolute left-0 top-1 bottom-1 w-[3px] bg-primary rounded-r-full" />
                )}
                <span className={cn(
                  'text-[12px] font-semibold truncate',
                  activeCatId === cat.id ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground',
                )}>
                  {cat.name}
                </span>
                <span className={cn(
                  'text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ml-1',
                  activeCatId === cat.id ? 'bg-primary/20 text-primary' : 'bg-muted/40 text-muted-foreground',
                )}>
                  {productCountFor(cat.id)}
                </span>
              </button>
            ))}

            {categories.length === 0 && (
              <p className="px-3 py-3 text-[11px] text-muted-foreground/60 italic">No categories yet</p>
            )}
          </div>

          {/* Sidebar footer */}
          <div className="border-t border-border p-2">
            <button
              onClick={() => setCatCreate(true)}
              className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[11px] font-semibold text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors"
            >
              <FolderPlus size={13} />
              New category
            </button>
            {activeCategory && (
              <>
                <button
                  onClick={() => setCatEdit(activeCategory)}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[11px] font-semibold text-muted-foreground hover:text-muted-foreground hover:bg-muted/40 transition-colors"
                >
                  <Pencil size={12} />
                  Edit &ldquo;{activeCategory.name}&rdquo;
                </button>
                <button
                  onClick={() => setCatDelete(activeCategory)}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[11px] font-semibold text-muted-foreground hover:text-danger hover:bg-danger/5 transition-colors"
                >
                  <Trash2 size={12} />
                  Delete category
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── Table area ─────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0">

          {/* Toolbar */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
            <div className="relative flex-1">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={activeCategory ? `Search in ${activeCategory.name}…` : 'Search products by name, SKU, barcode…'}
                className="w-full h-8 pl-8 pr-7 rounded-lg border border-border bg-muted/40/50 text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 focus:bg-white transition-all"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground"
                >
                  <X size={12} />
                </button>
              )}
            </div>
            <span className="text-[11px] text-muted-foreground shrink-0">
              {displayedProducts.length} result{displayedProducts.length !== 1 ? 's' : ''}
            </span>
            {/* Mobile: category filter */}
            <select
              value={activeCatId ?? ''}
              onChange={e => setActiveCatId(e.target.value || null)}
              className="sm:hidden h-8 px-2 rounded-lg border border-border bg-white text-[12px] text-muted-foreground focus:outline-none"
            >
              <option value="">All</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* Table */}
          {displayedProducts.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="w-14 h-14 rounded-xl bg-muted/40 flex items-center justify-center mb-4">
                {search ? (
                  <Search size={22} className="text-muted-foreground/40" />
                ) : (
                  <Package size={22} className="text-muted-foreground/40" />
                )}
              </div>
              <p className="text-[14px] font-bold text-foreground">
                {search ? 'No products found' : activeCategory ? `No products in ${activeCategory.name}` : 'No products yet'}
              </p>
              <p className="text-[12px] text-muted-foreground mt-1">
                {search ? 'Try a different search term.' : 'Add your first product to get started.'}
              </p>
              {!search && (
                <button
                  onClick={() => setProdCreate(true)}
                  className="mt-4 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-[12px] font-bold hover:bg-primary/90 transition-colors"
                >
                  <Plus size={13} /> Add product
                </button>
              )}
            </div>
          ) : (
            <div className="flex-1 overflow-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/40/30">
                    <th className="text-start px-4 py-2.5 text-[10px] font-black tracking-[.14em] uppercase text-muted-foreground w-[40%]">
                      Product
                    </th>
                    {!activeCatId && (
                      <th className="text-start px-3 py-2.5 text-[10px] font-black tracking-[.14em] uppercase text-muted-foreground hidden md:table-cell">
                        Category
                      </th>
                    )}
                    <th className="text-start px-3 py-2.5 text-[10px] font-black tracking-[.14em] uppercase text-muted-foreground hidden sm:table-cell">
                      Price
                    </th>
                    <th className="text-start px-3 py-2.5 text-[10px] font-black tracking-[.14em] uppercase text-muted-foreground hidden lg:table-cell">
                      Stock
                    </th>
                    <th className="text-start px-3 py-2.5 text-[10px] font-black tracking-[.14em] uppercase text-muted-foreground hidden sm:table-cell">
                      Status
                    </th>
                    <th className="w-[60px]" />
                  </tr>
                </thead>
                <tbody>
                  {displayedProducts.map((product, i) => (
                    <ProductTableRow
                      key={product.id}
                      product={product}
                      showCategory={!activeCatId}
                      index={i}
                      onEdit={() => setProdEdit(product)}
                      onDelete={() => setProdDelete(product)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Refreshing spinner ─────────────────────────────────────────────── */}
      {isRefreshing && (
        <div className="fixed bottom-6 right-6 z-[80] flex items-center gap-2 bg-white border border-border rounded-xl px-4 py-2.5 shadow-card-md pointer-events-none">
          <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-[12px] font-semibold text-muted-foreground">Refreshing…</span>
        </div>
      )}

      {/* ── Drawers ────────────────────────────────────────────────────────── */}
      <SlideDrawer open={catCreate} onClose={() => setCatCreate(false)} title="New Category">
        <CategoryForm
          onSuccess={() => { setCatCreate(false); refresh(); }}
          onClose={() => setCatCreate(false)}
        />
      </SlideDrawer>

      {catEdit && (
        <SlideDrawer open={!!catEdit} onClose={() => setCatEdit(null)} title="Edit Category">
          <CategoryForm
            category={catEdit}
            onSuccess={() => { setCatEdit(null); refresh(); }}
            onClose={() => setCatEdit(null)}
          />
        </SlideDrawer>
      )}

      <DeleteCategoryDialog
        category={catDelete}
        onClose={() => setCatDelete(null)}
        onSuccess={() => {
          if (activeCatId === catDelete?.id) setActiveCatId(null);
          setCatDelete(null);
          refresh();
        }}
      />

      <SlideDrawer open={prodCreate} onClose={() => setProdCreate(false)} title="Add Product">
        <ProductForm
          categories={categories}
          defaultCategoryId={activeCatId ?? undefined}
          onSuccess={() => { setProdCreate(false); refresh(); }}
          onClose={() => setProdCreate(false)}
        />
      </SlideDrawer>

      {prodEdit && (
        <SlideDrawer open={!!prodEdit} onClose={() => setProdEdit(null)} title="Edit Product">
          <ProductForm
            product={prodEdit}
            categories={categories}
            onSuccess={() => { setProdEdit(null); refresh(); }}
            onClose={() => setProdEdit(null)}
          />
        </SlideDrawer>
      )}

      <DeleteProductDialog
        product={prodDelete}
        onClose={() => setProdDelete(null)}
        onSuccess={() => { setProdDelete(null); refresh(); }}
      />
    </div>
  );
}

// ── ProductTableRow ───────────────────────────────────────────────────────────

function ProductTableRow({
  product,
  showCategory,
  index,
  onEdit,
  onDelete,
}: {
  product: Product;
  showCategory: boolean;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const stock = product.stock_level ?? null;
  const isOut = product.track_inventory && stock === 0;
  const isLow = product.track_inventory && stock !== null && stock > 0 && stock <= product.min_stock_level;

  return (
    <tr
      className="group border-b border-border/50 last:border-0 hover:bg-muted/40/40 transition-colors"
      style={{ animationDelay: `${index * 20}ms` }}
    >
      {/* Product name + thumbnail */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-muted/40 border border-border/60 overflow-hidden shrink-0 flex items-center justify-center">
            {product.thumbnail_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={product.thumbnail_url} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <Package size={14} className="text-muted-foreground/50" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-foreground truncate leading-tight">{product.name}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              {product.sku && (
                <span className="font-mono text-[10px] text-muted-foreground">{product.sku}</span>
              )}
              {product.sku && product.barcode && (
                <span className="text-muted-foreground/40 text-[10px]">·</span>
              )}
              {product.barcode && (
                <span className="font-mono text-[10px] text-muted-foreground/60">{product.barcode}</span>
              )}
              {product.unit && (
                <span className="text-[10px] text-muted-foreground/50">/ {product.unit}</span>
              )}
            </div>
          </div>
        </div>
      </td>

      {/* Category */}
      {showCategory && (
        <td className="px-3 py-3 hidden md:table-cell">
          {product.category_name ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground bg-muted/40 rounded-md px-2 py-0.5">
              <Tag size={9} className="text-muted-foreground/60" />
              {product.category_name}
            </span>
          ) : (
            <span className="text-[11px] text-muted-foreground/40 italic">—</span>
          )}
        </td>
      )}

      {/* Price */}
      <td className="px-3 py-3 hidden sm:table-cell">
        <p className="text-[13px] font-bold text-foreground tabular-nums">
          {parseFloat(product.price).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}{' '}
          <span className="text-[10px] font-normal text-muted-foreground">SDG</span>
        </p>
        {product.cost_price && parseFloat(product.cost_price) > 0 && (
          <p className="text-[10px] text-muted-foreground tabular-nums mt-0.5">
            cost {parseFloat(product.cost_price).toFixed(0)}
          </p>
        )}
      </td>

      {/* Stock */}
      <td className="px-3 py-3 hidden lg:table-cell">
        {product.track_inventory && stock !== null ? (
          <span className={cn(
            'inline-flex items-center text-[11px] font-bold px-2 py-0.5 rounded-full',
            isOut ? 'bg-danger/10 text-danger' :
            isLow ? 'bg-warning/10 text-warning' :
                    'bg-success/10 text-success',
          )}>
            {isOut ? 'Out of stock' : isLow ? `Low · ${stock}` : stock}
          </span>
        ) : (
          <span className="text-[11px] text-muted-foreground/40">—</span>
        )}
      </td>

      {/* Status */}
      <td className="px-3 py-3 hidden sm:table-cell">
        <span className={cn(
          'inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full',
          product.is_active
            ? 'bg-success/10 text-success'
            : 'bg-text-hint/10 text-muted-foreground',
        )}>
          {product.is_active ? 'Active' : 'Inactive'}
        </span>
      </td>

      {/* Actions */}
      <td className="px-3 py-3">
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
          <button
            onClick={onEdit}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
          >
            <Pencil size={13} />
          </button>
          <button
            onClick={onDelete}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-danger hover:bg-danger/8 transition-colors"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ── SlideDrawer ───────────────────────────────────────────────────────────────

function SlideDrawer({
  open, onClose, title, children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    if (open) document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/25 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative ml-auto w-full max-w-[480px] h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right-full duration-250">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <p className="text-[15px] font-black text-foreground">{title}</p>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
          >
            <X size={15} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

// ── CategoryForm ──────────────────────────────────────────────────────────────

function CategoryForm({
  category,
  onSuccess,
  onClose,
}: {
  category?: Category | null;
  onSuccess: () => void;
  onClose: () => void;
}) {
  const isEdit = !!category;
  const [imagePreview, setImagePreview] = useState<string | null>(category?.thumbnail_url ?? null);
  const fileRef = useRef<HTMLInputElement>(null);

  const action = isEdit
    ? updateCategoryAction.bind(null, category!.id)
    : createCategoryAction;

  const [state, dispatch, isPending] = useActionState<
    CreateCategoryState | UpdateCategoryState,
    FormData
  >(action, null);

  useEffect(() => {
    if (state && 'success' in state && state.success) onSuccess();
  }, [state, onSuccess]);

  const error = state && 'error' in state ? state.error : null;

  return (
    <form action={dispatch} className="p-5 space-y-5">
      {error && <ErrorAlert message={error} />}

      <div>
        <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-[.12em] mb-2">
          Category Image
        </label>
        <div
          onClick={() => fileRef.current?.click()}
          className="relative w-full h-[130px] rounded-xl border-2 border-dashed border-border hover:border-primary/40 bg-muted/40 hover:bg-primary/[0.02] cursor-pointer transition-all flex flex-col items-center justify-center gap-2 overflow-hidden"
        >
          {imagePreview ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imagePreview} alt="preview" className="absolute inset-0 w-full h-full object-cover rounded-xl" />
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity rounded-xl">
                <p className="text-[12px] font-semibold text-white">Change image</p>
              </div>
            </>
          ) : (
            <>
              <ImageIcon size={22} className="text-muted-foreground/50" />
              <p className="text-[12px] text-muted-foreground">Click to upload</p>
              <p className="text-[10px] text-muted-foreground/60">JPEG, PNG, WebP · max 10 MB</p>
            </>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          name="image_upload"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={e => {
            const f = e.target.files?.[0];
            if (f) setImagePreview(URL.createObjectURL(f));
          }}
        />
      </div>

      <FormField label="Name" required>
        <input
          name="name"
          type="text"
          defaultValue={category?.name ?? ''}
          required
          placeholder="e.g. Beverages"
          className={inputCls}
        />
      </FormField>

      <FormField label="Description">
        <textarea
          name="description"
          defaultValue={category?.description ?? ''}
          placeholder="Optional description"
          rows={2}
          className={cn(inputCls, 'resize-none h-auto py-2 leading-relaxed')}
        />
      </FormField>

      <FormField label="Sort Order" hint="Lower numbers appear first">
        <input
          name="sort_order"
          type="number"
          defaultValue={category?.sort_order ?? 0}
          min={0}
          className={inputCls}
        />
      </FormField>

      <div className="flex justify-end gap-2 pt-3 border-t border-border">
        <Button variant="secondary" size="sm" type="button" onClick={onClose}>Cancel</Button>
        <Button size="sm" type="submit" disabled={isPending}>
          {isPending ? (isEdit ? 'Saving…' : 'Creating…') : (isEdit ? 'Save changes' : 'Create category')}
        </Button>
      </div>
    </form>
  );
}

// ── ProductForm ───────────────────────────────────────────────────────────────

function ProductForm({
  product,
  categories,
  defaultCategoryId,
  onSuccess,
  onClose,
}: {
  product?: Product | null;
  categories: Category[];
  defaultCategoryId?: string;
  onSuccess: () => void;
  onClose: () => void;
}) {
  const isEdit = !!product;
  const [imagePreview, setImagePreview] = useState<string | null>(product?.thumbnail_url ?? null);
  const [isActive, setIsActive] = useState(product?.is_active ?? true);
  const [trackInv, setTrackInv] = useState(product?.track_inventory ?? false);
  const fileRef = useRef<HTMLInputElement>(null);

  const action = isEdit
    ? updateProductAction.bind(null, product!.id)
    : createProductAction;

  const [state, dispatch, isPending] = useActionState<
    CreateProductState | UpdateProductState,
    FormData
  >(action, null);

  useEffect(() => {
    if (state && 'success' in state && state.success) onSuccess();
  }, [state, onSuccess]);

  const error = state && 'error' in state ? state.error : null;

  return (
    <form action={dispatch} className="p-5 space-y-4">
      {error && <ErrorAlert message={error} />}

      <input type="hidden" name="is_active" value={String(isActive)} />
      <input type="hidden" name="track_inventory" value={String(trackInv)} />

      {/* Image */}
      <div>
        <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-[.12em] mb-2">
          Product Image
        </label>
        <div
          onClick={() => fileRef.current?.click()}
          className="relative w-full h-[110px] rounded-xl border-2 border-dashed border-border hover:border-primary/40 bg-muted/40 hover:bg-primary/[0.02] cursor-pointer transition-all flex flex-col items-center justify-center gap-2 overflow-hidden"
        >
          {imagePreview ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imagePreview} alt="preview" className="absolute inset-0 w-full h-full object-cover rounded-xl" />
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity rounded-xl">
                <p className="text-[12px] font-semibold text-white">Change image</p>
              </div>
            </>
          ) : (
            <>
              <ImageIcon size={18} className="text-muted-foreground/50" />
              <p className="text-[11px] text-muted-foreground">Upload image</p>
            </>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          name="image_upload"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={e => {
            const f = e.target.files?.[0];
            if (f) setImagePreview(URL.createObjectURL(f));
          }}
        />
      </div>

      <FormField label="Product Name" required>
        <input
          name="name"
          type="text"
          defaultValue={product?.name ?? ''}
          required
          placeholder="e.g. Coca Cola 500ml"
          className={inputCls}
        />
      </FormField>

      <FormField label="Category">
        <select
          name="category"
          defaultValue={product?.category ?? defaultCategoryId ?? ''}
          className={inputCls}
        >
          <option value="">— No category —</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
      </FormField>

      <FormField label="Description">
        <textarea
          name="description"
          defaultValue={product?.description ?? ''}
          placeholder="Optional description"
          rows={2}
          className={cn(inputCls, 'resize-none h-auto py-2 leading-relaxed')}
        />
      </FormField>

      <div className="grid grid-cols-2 gap-3">
        <FormField label="Price (SDG)" required>
          <div className="relative">
            <DollarSign size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              name="price"
              type="number"
              step="0.01"
              min="0"
              defaultValue={product?.price ?? ''}
              required
              placeholder="0"
              className={cn(inputCls, 'pl-7')}
            />
          </div>
        </FormField>
        <FormField label="Cost (SDG)">
          <div className="relative">
            <DollarSign size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              name="cost_price"
              type="number"
              step="0.01"
              min="0"
              defaultValue={product?.cost_price ?? ''}
              placeholder="0"
              className={cn(inputCls, 'pl-7')}
            />
          </div>
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FormField label="SKU">
          <input
            name="sku"
            type="text"
            defaultValue={product?.sku ?? ''}
            placeholder="BEV-001"
            className={inputCls}
          />
        </FormField>
        <FormField label="Barcode">
          <div className="relative">
            <Barcode size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              name="barcode"
              type="text"
              defaultValue={product?.barcode ?? ''}
              placeholder="628194…"
              className={cn(inputCls, 'pl-7')}
            />
          </div>
        </FormField>
      </div>

      <FormField label="Unit" hint="e.g. piece, kg, litre">
        <input
          name="unit"
          type="text"
          defaultValue={product?.unit ?? ''}
          placeholder="piece"
          className={inputCls}
        />
      </FormField>

      {/* Toggles */}
      <div className="space-y-3 rounded-xl border border-border p-4 bg-muted/40/30">
        <ToggleRow
          label="Active"
          description="Visible in POS"
          value={isActive}
          onChange={setIsActive}
        />
        <div className="h-px bg-border-soft" />
        <ToggleRow
          label="Track inventory"
          description="Monitor stock levels"
          value={trackInv}
          onChange={setTrackInv}
        />
        {trackInv && (
          <FormField label="Min stock level" hint="Alert below this number">
            <div className="relative">
              <Layers size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                name="min_stock_level"
                type="number"
                min="0"
                defaultValue={product?.min_stock_level ?? 5}
                className={cn(inputCls, 'pl-7')}
              />
            </div>
          </FormField>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-3 border-t border-border">
        <Button variant="secondary" size="sm" type="button" onClick={onClose}>Cancel</Button>
        <Button size="sm" type="submit" disabled={isPending}>
          {isPending ? (isEdit ? 'Saving…' : 'Adding…') : (isEdit ? 'Save changes' : 'Add product')}
        </Button>
      </div>
    </form>
  );
}

// ── Delete dialogs ─────────────────────────────────────────────────────────────

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
  const [error, setError] = useState<string | null>(null);

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
  const [error, setError] = useState<string | null>(null);

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
      description={error ?? `"${product?.name}" will be removed from your catalog.`}
      confirmLabel="Delete"
      variant="danger"
      loading={isPending}
      onConfirm={handleConfirm}
      onClose={() => { setError(null); onClose(); }}
    />
  );
}

// ── Micro-components ──────────────────────────────────────────────────────────

function FormField({
  label, required, hint, children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-[.12em] mb-1.5">
        {label}
        {required && <span className="text-danger ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>}
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
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-[12px] font-bold text-foreground">{label}</p>
        <p className="text-[11px] text-muted-foreground">{description}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className="shrink-0"
        aria-pressed={value}
      >
        {value
          ? <ToggleRight size={26} className="text-primary" />
          : <ToggleLeft  size={26} className="text-muted-foreground/40" />
        }
      </button>
    </div>
  );
}

function ErrorAlert({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-danger/20 bg-danger/5 px-4 py-3">
      <AlertCircle size={14} className="text-danger shrink-0 mt-0.5" />
      <p className="text-[12px] font-semibold text-danger leading-relaxed">{message}</p>
    </div>
  );
}

const inputCls =
  'w-full h-9 px-3 rounded-lg border border-border bg-white text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all';
