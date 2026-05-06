'use client';

import { useEffect, useState } from 'react';
import { History, ArrowUp, ArrowDown, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import Drawer from '@/components/ds/Drawer';
import { fetchMovementsAction } from '@/actions/inventory';
import type { StockLevel, StockMovement, MovementType } from '@/types/api';

interface Props {
  item:    StockLevel | null;
  onClose: () => void;
}

export default function StockHistoryDrawer({ item, onClose }: Props) {
  return (
    <Drawer
      open={!!item}
      onClose={onClose}
      title="Stock History"
      subtitle={item ? `${item.product_name} · ${item.shop_name}` : undefined}
    >
      {item && <HistoryContent key={`${item.product}-${item.shop}`} item={item} />}
    </Drawer>
  );
}

function HistoryContent({ item }: { item: StockLevel }) {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchMovementsAction({ product: item.product, shop: item.shop })
      .then(res => {
        if (res.ok) setMovements(res.data);
        else setError(res.error);
      })
      .finally(() => setLoading(false));
  }, [item.product, item.shop]);

  if (loading) {
    return (
      <div className="p-5 space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-5 text-center">
        <p className="text-sm font-semibold text-destructive">Failed to load history</p>
        <p className="text-xs text-destructive/70 mt-1">{error}</p>
      </div>
    );
  }

  if (movements.length === 0) {
    return (
      <div className="p-5 flex flex-col items-center justify-center gap-3 text-center py-16">
        <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
          <History size={18} className="text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">No movement history</p>
          <p className="text-xs text-muted-foreground mt-0.5">Stock changes will appear here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 space-y-2">
      {movements.map(m => <MovementRow key={m.id} movement={m} />)}
    </div>
  );
}

function MovementRow({ movement }: { movement: StockMovement }) {
  const qty   = Number(movement.quantity);
  const isIn  = qty > 0;
  const date  = new Date(movement.created_at).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-card px-3.5 py-3">
      <span className={cn(
        'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5',
        isIn ? 'bg-green-50 text-green-600' : 'bg-red-50 text-destructive',
      )}>
        {isIn ? <ArrowUp size={13} /> : <ArrowDown size={13} />}
      </span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[12px] font-bold text-foreground">
            {movementLabel(movement.movement_type)}
          </p>
          <span className={cn(
            'text-[13px] font-bold tabular-nums shrink-0',
            isIn ? 'text-green-600' : 'text-destructive',
          )}>
            {isIn ? '+' : ''}{qty}
          </span>
        </div>

        {movement.notes && (
          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{movement.notes}</p>
        )}

        <div className="flex items-center gap-2 mt-1">
          <p className="text-[10px] text-muted-foreground/60">{date}</p>
          {movement.created_by_name && (
            <>
              <span className="text-[10px] text-muted-foreground/40">·</span>
              <p className="text-[10px] text-muted-foreground/60">{movement.created_by_name}</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const MOVEMENT_LABELS: Record<MovementType, string> = {
  in:           'Stock In',
  out:          'Stock Out',
  adjustment:   'Manual Adjustment',
  sale:         'Sale',
  return:       'Return',
  transfer_in:  'Transfer In',
  transfer_out: 'Transfer Out',
  opening:      'Opening Stock',
};

function movementLabel(type: MovementType): string {
  return MOVEMENT_LABELS[type] ?? type;
}
