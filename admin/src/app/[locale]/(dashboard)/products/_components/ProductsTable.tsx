import { fetchProductsAction } from '@/actions/products';
import { Badge } from '@/components/ui/badge';
import EmptyState from '@/components/ds/EmptyState';
import Pagination from '@/components/ds/Pagination';
import {
  Table, TableHeader, TableHead, TableBody, TableRow, TableCell,
} from '@/components/ui/table';
import Image from 'next/image';
import ProductRowActions from './ProductRowActions';
import { Package, Tag } from 'lucide-react';
import type { Product } from '@/types/api';

interface Props {
  search?:     string;
  categoryId?: string;
  status?:     string;
  page?:       number;
  showStock?:  boolean;
}

export default async function ProductsTable({ search, categoryId, status, page = 1, showStock = false }: Props) {
  let result;
  try {
    result = await fetchProductsAction({
      search:   search   || undefined,
      category: categoryId || undefined,
      status:   status   || undefined,
      page,
      limit: 25,
    });
  } catch {
    return (
      <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-10 text-center">
        <p className="text-sm font-semibold text-destructive">Failed to load products</p>
        <p className="text-xs text-destructive/70 mt-1">Check your API connection and try again.</p>
      </div>
    );
  }

  if (!result.ok) {
    return (
      <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-10 text-center">
        <p className="text-sm font-semibold text-destructive">Failed to load products</p>
        <p className="text-xs text-destructive/70 mt-1">{result.error}</p>
      </div>
    );
  }

  const { data: products, count } = result;

  if (products.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card shadow-card">
        <EmptyState
          icon={<Package />}
          title={search ? 'No products match your search' : 'No products yet'}
          description={
            search
              ? 'Try different keywords or clear the search.'
              : 'Add your first product to get started.'
          }
        />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
      {/* Count bar */}
      <div className="px-4 py-2.5 border-b border-border bg-muted/30 flex items-center gap-2">
        <span className="w-5 h-5 rounded-md bg-primary/10 text-primary flex items-center justify-center [&_svg]:size-3">
          <Package />
        </span>
        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.1em]">
          {count.toLocaleString()} product{count !== 1 ? 's' : ''}
        </p>
      </div>

      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-b border-border/60">
            <TableHead className="w-[40%]">Product</TableHead>
            <TableHead className="hidden md:table-cell">Category</TableHead>
            <TableHead className="hidden sm:table-cell">Price</TableHead>
            {showStock && <TableHead className="hidden lg:table-cell">Stock</TableHead>}
            <TableHead className="hidden sm:table-cell">Status</TableHead>
            <TableHead className="hidden xl:table-cell">Updated</TableHead>
            <TableHead className="w-[100px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map(product => (
            <ProductRow key={product.id} product={product} showStock={showStock} />
          ))}
        </TableBody>
      </Table>

      <Pagination count={count} pageSize={25} />
    </div>
  );
}

function ProductRow({ product, showStock }: { product: Product; showStock: boolean }) {
  const stock   = product.stock_level ?? null;
  const isOut   = stock === 0;
  const isLow   = stock !== null && stock > 0 && stock <= product.min_stock_level;

  const updated = new Date(product.updated_at).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric',
  });

  const price     = parseFloat(product.price);
  const costPrice = parseFloat(product.cost_price);
  const margin    = costPrice > 0 ? ((price - costPrice) / price * 100).toFixed(0) : null;

  return (
    <TableRow className="group hover:bg-muted/40 transition-colors">
      {/* Product name + thumbnail */}
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-muted border border-border/60 overflow-hidden shrink-0 flex items-center justify-center">
            {product.thumbnail_url ? (
              <Image src={product.thumbnail_url} alt={product.name} width={36} height={36} className="w-full h-full object-cover" />
            ) : (
              <Package className="size-4 text-muted-foreground/40" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-foreground leading-tight truncate">
              {product.name}
            </p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {product.sku && (
                <span className="font-mono text-[10px] text-muted-foreground">{product.sku}</span>
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
      </TableCell>

      {/* Category */}
      <TableCell className="hidden md:table-cell">
        {product.category_name ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground bg-muted rounded-md px-2 py-0.5">
            <Tag className="size-3 text-muted-foreground/50" />
            {product.category_name}
          </span>
        ) : (
          <span className="text-[11px] text-muted-foreground/40 italic">—</span>
        )}
      </TableCell>

      {/* Price */}
      <TableCell className="hidden sm:table-cell">
        <p className="text-[13px] font-bold text-foreground tabular-nums">
          {price.toLocaleString('en-US', { maximumFractionDigits: 0 })}{' '}
          <span className="text-[10px] font-normal text-muted-foreground">SDG</span>
        </p>
        {margin && (
          <p className="text-[10px] text-muted-foreground tabular-nums mt-0.5">
            {margin}% margin
          </p>
        )}
      </TableCell>

      {/* Stock — only for shop businesses; absent for restaurants */}
      {showStock && (
        <TableCell className="hidden lg:table-cell">
          {stock !== null ? (
            <Badge
              variant={isOut ? 'danger' : isLow ? 'warning' : 'success'}
              dot
            >
              {isOut ? 'Out of stock' : isLow ? `Low · ${Number(stock)}` : Number(stock)}
            </Badge>
          ) : (
            <span className="text-[11px] text-muted-foreground/40">—</span>
          )}
        </TableCell>
      )}

      {/* Status */}
      <TableCell className="hidden sm:table-cell">
        <Badge dot variant={product.is_active ? 'success' : 'danger'}>
          {product.is_active ? 'Active' : 'Inactive'}
        </Badge>
      </TableCell>

      {/* Updated */}
      <TableCell className="hidden xl:table-cell">
        <span className="text-xs text-muted-foreground">{updated}</span>
      </TableCell>

      {/* Actions */}
      <TableCell>
        <ProductRowActions product={product} />
      </TableCell>
    </TableRow>
  );
}
