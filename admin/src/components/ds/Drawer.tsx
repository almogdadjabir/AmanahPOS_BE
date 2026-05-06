'use client';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetBody,
  SheetFooter,
} from '@/components/ui/sheet';

interface DrawerProps {
  open:      boolean;
  onClose:   () => void;
  title:     string;
  subtitle?: string;
  children:  React.ReactNode;
  footer?:   React.ReactNode;
  width?:    number;
}

/**
 * Thin wrapper around shadcn Sheet so existing Drawer usages
 * require zero prop changes.
 */
export default function Drawer({ open, onClose, title, subtitle, children, footer }: DrawerProps) {
  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent side="right">
        <SheetHeader title={title} description={subtitle} onClose={onClose} />
        <SheetBody>{children}</SheetBody>
        {footer && <SheetFooter>{footer}</SheetFooter>}
      </SheetContent>
    </Sheet>
  );
}
