'use client';

import { useActionState, useEffect, useState } from 'react';
import { AlertCircle, Plus, Minus, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Drawer from '@/components/ds/Drawer';
import { stockAdjustmentAction, type AdjustStockState } from '@/actions/inventory';
import type { StockLevel } from '@/types/api';

type Mode = 'add' | 'remove' | 'set';

const MODES: { value: Mode; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'add',    label: 'Add',    icon: <Plus size={14} />,   color: 'text-green-600' },
  { value: 'remove', label: 'Remove', icon: <Minus size={14} />,  color: 'text-destructive' },
  { value: 'set',    label: 'Set',    icon: <Target size={14} />, color: 'text-primary' },
];

interface Props {
  item:    StockLevel | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function StockAdjustDrawer({ item, onClose, onSuccess }: Props) {
  return (
    <Drawer
      open={!!item}
      onClose={onClose}
      title="Adjust Stock"
      subtitle={item ? `${item.product_name} · ${item.shop_name}` : undefined}
    >
      {item && (
        <AdjustContent
          key={item.id}
          item={item}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      )}
    </Drawer>
  );
}

function AdjustContent({
  item,
  onClose,
  onSuccess,
}: {
  item: StockLevel;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [mode, setMode] = useState<Mode>('add');
  const [state, dispatch, isPending] = useActionState<AdjustStockState, FormData>(
    stockAdjustmentAction,
    null,
  );

  useEffect(() => {
    if (state && 'success' in state) onSuccess();
  }, [state, onSuccess]);

  const error = state && 'error' in state ? state.error : null;
  const currentQty = Number(item.quantity);

  const hint =
    mode === 'add'    ? `Current: ${currentQty} → will increase` :
    mode === 'remove' ? `Current: ${currentQty} → will decrease (min 0)` :
                        `Current: ${currentQty} → will be replaced`;

  return (
    <form action={dispatch} className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        <div className="p-5 space-y-5">
          {error && <FormError message={error} />}

          {/* Hidden fields */}
          <input type="hidden" name="product"          value={item.product} />
          <input type="hidden" name="shop"             value={item.shop} />
          <input type="hidden" name="mode"             value={mode} />
          <input type="hidden" name="current_quantity" value={currentQty} />

          {/* Current stock display */}
          <div className="rounded-xl bg-muted/40 border border-border px-4 py-3.5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Current Stock
              </p>
              <p className="text-2xl font-bold text-foreground tabular-nums mt-0.5">{currentQty}</p>
            </div>
            <div className="flex flex-col items-end gap-0.5">
              <p className="text-[12px] font-medium text-muted-foreground">{item.product_name}</p>
              <p className="text-[11px] text-muted-foreground/60">{item.shop_name}</p>
            </div>
          </div>

          {/* Mode selector */}
          <div>
            <p className="text-sm font-semibold text-foreground mb-2">Adjustment type</p>
            <div className="grid grid-cols-3 gap-2">
              {MODES.map(m => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setMode(m.value)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 py-3 rounded-xl border text-xs font-semibold transition-all',
                    mode === m.value
                      ? 'border-primary bg-primary/5 text-primary shadow-sm'
                      : 'border-border bg-background text-muted-foreground hover:border-primary/40',
                  )}
                >
                  <span className={cn(mode === m.value ? 'text-primary' : m.color)}>{m.icon}</span>
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quantity input */}
          <Input
            label={mode === 'set' ? 'New quantity' : 'Quantity'}
            name="quantity"
            type="number"
            min="1"
            step="1"
            required
            placeholder="0"
            hint={hint}
          />

          {/* Notes */}
          <div>
            <label className="text-sm font-semibold text-foreground block mb-1.5">
              Notes <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <textarea
              name="notes"
              placeholder="Reason for adjustment…"
              rows={3}
              className="flex w-full rounded-md border border-input bg-background px-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 transition-colors resize-none"
            />
          </div>
        </div>
      </div>

      <div className="shrink-0 flex items-center justify-end gap-2 px-5 py-4 border-t border-border">
        <Button variant="secondary" size="sm" type="button" onClick={onClose}>
          Cancel
        </Button>
        <Button size="sm" type="submit" disabled={isPending}>
          {isPending ? 'Saving…' : 'Apply'}
        </Button>
      </div>
    </form>
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
