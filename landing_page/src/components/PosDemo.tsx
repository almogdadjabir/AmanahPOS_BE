'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocale } from 'next-intl';

const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
function toAr(n: string | number) {
  return String(n).replace(/[0-9]/g, d => AR_DIGITS[+d]);
}
function fmtAmt(n: number, isAr: boolean) {
  const s = n.toLocaleString('en-US');
  return isAr ? toAr(s) : s;
}

type Product = { id: string; nameAr: string; nameEn: string; price: number; pic: string };
type CartItem = { product: Product; qty: number };

const PRODUCTS: Product[] = [
  { id: 'bolti',    nameAr: 'بلطي',     nameEn: 'Bolti',       price: 33, pic: 'pic-fish' },
  { id: 'calamary', nameAr: 'كلماري',   nameEn: 'Calamary',    price: 55, pic: 'pic-calamary' },
  { id: 'fatosh',   nameAr: 'فتوش',     nameEn: 'Fatosh',      price: 30, pic: 'pic-fatosh' },
  { id: 'ful',      nameAr: 'فول مدمس', nameEn: 'Ful Medames', price: 25, pic: 'pic-ful' },
];

export default function PosDemo() {
  const locale = useLocale();
  const isAr = locale === 'ar';

  const [cart, setCart] = useState<CartItem[]>([]);
  const [tappedId, setTappedId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showPaid, setShowPaid] = useState(false);
  const [clock, setClock] = useState('');
  const [salesAmt, setSalesAmt] = useState(841);
  const [salesCount, setSalesCount] = useState(15);
  const [receiptNo, setReceiptNo] = useState(2046);
  const [paidTotal, setPaidTotal] = useState(0);

  const abortRef = useRef(false);
  const pausedRef = useRef(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const cartRef = useRef<CartItem[]>([]);
  const reducedMotion = useRef(
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  useEffect(() => { cartRef.current = cart; }, [cart]);

  const total = cart.reduce((s, i) => s + i.product.price * i.qty, 0);
  const count = cart.reduce((s, i) => s + i.qty, 0);
  const showReviewBar = count > 0 && !showModal && !showPaid;

  const tickClock = useCallback(() => {
    const now = new Date();
    const hh = now.getHours().toString().padStart(2, '0');
    const mm = now.getMinutes().toString().padStart(2, '0');
    setClock(isAr ? `${toAr(hh)}:${toAr(mm)}` : `${hh}:${mm}`);
  }, [isAr]);

  useEffect(() => {
    tickClock();
    const id = setInterval(tickClock, 10_000);
    return () => clearInterval(id);
  }, [tickClock]);

  useEffect(() => {
    const onVisibility = () => { pausedRef.current = document.hidden; };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  useEffect(() => {
    const el = stageRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const obs = new IntersectionObserver(
      ([entry]) => { pausedRef.current = !entry.isIntersecting; },
      { threshold: 0.1 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const tapProduct = useCallback((id: string) => {
    setTappedId(id);
    setTimeout(() => { if (!abortRef.current) setTappedId(null); }, 550);
    setCart(prev => {
      const found = prev.find(i => i.product.id === id);
      if (found) return prev.map(i => i.product.id === id ? { ...i, qty: i.qty + 1 } : i);
      const prod = PRODUCTS.find(p => p.id === id)!;
      return [...prev, { product: prod, qty: 1 }];
    });
  }, []);

  useEffect(() => {
    if (reducedMotion.current) return;
    abortRef.current = false;

    async function sleep(ms: number) {
      await new Promise<void>(r => setTimeout(r, ms));
      while (pausedRef.current && !abortRef.current) {
        await new Promise<void>(r => setTimeout(r, 200));
      }
    }

    async function loop() {
      while (!abortRef.current) {
        setCart([]);
        setShowModal(false);
        setShowPaid(false);
        await sleep(800);
        if (abortRef.current) break;

        const shuffled = [...PRODUCTS].sort(() => Math.random() - 0.5);
        const selected = shuffled.slice(0, 2 + Math.floor(Math.random() * 2));
        for (const prod of selected) {
          if (abortRef.current) break;
          tapProduct(prod.id);
          await sleep(900 + Math.random() * 300);
        }
        if (abortRef.current) break;

        await sleep(600);
        setShowModal(true);
        await sleep(2200);
        if (abortRef.current) break;

        const saleTotal = cartRef.current.reduce((s, i) => s + i.product.price * i.qty, 0);
        setPaidTotal(saleTotal);
        setShowModal(false);
        setShowPaid(true);
        setSalesAmt(prev => prev + saleTotal);
        setSalesCount(prev => prev + 1);
        setReceiptNo(prev => prev + 1);
        await sleep(2800);
      }
    }

    loop();
    return () => { abortRef.current = true; };
  }, [tapProduct]);

  const sdg = isAr ? 'ج.س' : 'SDG';
  const receiptTime = (() => {
    const now = new Date();
    const hh = now.getHours().toString().padStart(2, '0');
    const mm = now.getMinutes().toString().padStart(2, '0');
    return isAr ? `${toAr(hh)}:${toAr(mm)}` : `${hh}:${mm}`;
  })();

  return (
    <div className="pos-stage" ref={stageRef} aria-label={isAr ? 'عرض حي لتطبيق نقطة البيع' : 'Live POS app demo'}>
      <div className="app-screen">

        {/* iOS-style status bar */}
        <div className="app-statusbar">
          <span>{clock}</span>
          <span className="right">
            <svg width="14" height="10" viewBox="0 0 18 12" aria-hidden="true">
              <rect x="0" y="8" width="3" height="4" rx="1" fill="currentColor"/>
              <rect x="5" y="5" width="3" height="7" rx="1" fill="currentColor"/>
              <rect x="10" y="2" width="3" height="10" rx="1" fill="currentColor"/>
              <rect x="15" y="0" width="3" height="12" rx="1" fill="currentColor" opacity=".35"/>
            </svg>
            <svg width="14" height="10" viewBox="0 0 16 12" aria-hidden="true">
              <path d="M8 3a8 8 0 0 1 5.5 2.2l-1.2 1.4A6 6 0 0 0 8 5a6 6 0 0 0-4.3 1.6L2.5 5.2A8 8 0 0 1 8 3Zm0 4a4 4 0 0 1 2.7 1.1L9.4 9.5A2 2 0 0 0 8 9a2 2 0 0 0-1.4.5L5.3 8.1A4 4 0 0 1 8 7Zm0 3.5a1 1 0 1 1 0 2 1 1 0 0 1 0-2Z" fill="currentColor"/>
            </svg>
            <span className="bat">100</span>
          </span>
        </div>

        {/* Workspace selector + sync status + bell */}
        <div className="app-topbar">
          <div className="app-workspace">
            <span className="ws-mark">أ</span>
            <span className="ws-text">
              <span className="ws-name">{isAr ? 'بيت المندي · فرع' : 'Bet Al Mandi · Branch'}</span>
              <span className="ws-sub">{isAr ? 'مساحة العمل' : 'Business workspace'}</span>
            </span>
            <svg className="ws-chev" width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="app-synced"><span className="dot" /><span>{isAr ? 'متزامن' : 'SYNCED'}</span></span>
          <span className="app-bell" aria-hidden="true">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
              <path d="M10 21a2 2 0 0 0 4 0"/>
            </svg>
          </span>
        </div>

        {/* Today sales summary card */}
        <div className="app-sales">
          <div className="amt">
            <div className="v">
              {fmtAmt(salesAmt, isAr)}<sup>{sdg}</sup>
            </div>
            <div className="meta">{isAr ? 'مبيعات اليوم · وردية' : 'Today sales · MY SHIFT'}</div>
          </div>
          <div className="sep" />
          <div className="count">
            <div className="v">{isAr ? toAr(salesCount) : salesCount}</div>
            <div className="meta">{isAr ? 'مبيعة' : 'SALES'}</div>
          </div>
          <svg className="spark" viewBox="0 0 80 28" preserveAspectRatio="none" aria-hidden="true">
            <polyline fill="none" stroke="#f59e0b" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
              points="0,22 12,21 22,21 30,4 36,18 46,21 60,22 64,8 70,22 80,22"/>
          </svg>
        </div>

        {/* Search + QR row */}
        <div className="app-search">
          <span className="qr" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/>
              <rect x="3" y="14" width="7" height="7" rx="1.5"/>
              <path d="M14 14h3v3h-3zM20 14h1M14 20h3v1h-3zM20 17v4"/>
            </svg>
          </span>
          <div className="input">
            <span>{isAr ? 'بحث · SKU · باركود' : 'Search · SKU · Barcode'}</span>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>
            </svg>
          </div>
        </div>

        {/* Category chips */}
        <div className="app-chips">
          <span className="app-chip active">{isAr ? 'الكل' : 'All'}</span>
          <span className="app-chip">{isAr ? 'بحري' : 'Bahri'}</span>
          <span className="app-chip">{isAr ? 'سلطة' : 'Salatah'}</span>
        </div>

        {/* Product grid */}
        <div className="app-grid">
          {PRODUCTS.map(prod => {
            const cartItem = cart.find(i => i.product.id === prod.id);
            const inCart = !!cartItem;
            const qty = cartItem?.qty ?? 0;
            return (
              <button
                key={prod.id}
                className={`app-prod${inCart ? ' in-cart' : ''}${tappedId === prod.id ? ' tap' : ''}`}
                onClick={() => tapProduct(prod.id)}
              >
                <span className={`pic ${prod.pic}`} />
                <span className="qty-badge">×{isAr ? toAr(qty) : qty}</span>
                <span className="name">{isAr ? prod.nameAr : prod.nameEn}</span>
                <span className="price">{isAr ? toAr(prod.price) : prod.price} {sdg}</span>
              </button>
            );
          })}
        </div>

        {/* Amber review bar — slides up when cart has items */}
        <div className={`app-review-bar${showReviewBar ? ' show' : ''}`}>
          <span className="review-btn">{isAr ? 'مراجعة' : 'Review'}</span>
          <span className="total">
            <span className="v">{fmtAmt(total, isAr)} {sdg}</span>
            <span className="meta">{isAr ? `${toAr(count)} أصناف` : `${count} items`}</span>
          </span>
          <span className="cart-btn" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 4h2l2.4 12.4a2 2 0 0 0 2 1.6h7.4a2 2 0 0 0 2-1.6L21 7H6"/>
              <circle cx="9" cy="20" r="1.6"/><circle cx="17" cy="20" r="1.6"/>
            </svg>
            <span className="pill">{isAr ? toAr(count) : count}</span>
          </span>
        </div>

        {/* Bottom tab bar with sell FAB */}
        <div className="app-tabbar">
          <span className="app-tab active">
            <svg className="ico" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 11l9-8 9 8v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <path d="M9 22V12h6v10"/>
            </svg>
            {isAr ? 'الرئيسية' : 'Home'}
          </span>
          <span className="app-tab">
            <svg className="ico" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6 7h12l-1 13a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2z"/>
              <path d="M9 7V5a3 3 0 0 1 6 0v2"/>
            </svg>
            {isAr ? 'المنتجات' : 'Products'}
          </span>
          <span className="app-tab fab">
            <svg className="ico" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 4h2l2.4 12.4a2 2 0 0 0 2 1.6h7.4a2 2 0 0 0 2-1.6L21 7H6"/>
              <circle cx="9" cy="20" r="1.6"/><circle cx="17" cy="20" r="1.6"/>
            </svg>
          </span>
          <span className="app-tab">
            <svg className="ico" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="9" cy="8" r="3.5"/>
              <path d="M3 20a6 6 0 0 1 12 0"/>
              <circle cx="17" cy="9" r="2.6"/>
              <path d="M16 14h.5a4.5 4.5 0 0 1 4.5 4.5V20"/>
            </svg>
            {isAr ? 'الكاشير' : 'Cashiers'}
          </span>
          <span className="app-tab">
            <svg className="ico" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/>
            </svg>
            {isAr ? 'المزيد' : 'More'}
          </span>
        </div>

        {/* Review-sale modal — slides from bottom */}
        <div className={`app-modal${showModal ? ' show' : ''}`}>
          <div className="grip" />
          <div className="app-modal-head">
            <span className="clear">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
              </svg>
              <span>{isAr ? 'مسح' : 'Clear'}</span>
            </span>
            <div className="title">
              <div className="t">{isAr ? 'مراجعة البيع' : 'Review sale'}</div>
              <div className="s">{isAr ? `${toAr(count)} أصناف` : `${count} items`}</div>
            </div>
            <span className="chev" aria-hidden="true">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
          </div>
          <div className="app-modal-lines">
            {cart.map((item, i) => (
              <div className="app-line" key={i}>
                <span className={`pic-sm ${item.product.pic}`} />
                <span className="xbtn" aria-hidden="true">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                    <path d="M18 6 6 18M6 6l12 12"/>
                  </svg>
                </span>
                <div className="rt">
                  <div className="name">{isAr ? item.product.nameAr : item.product.nameEn}</div>
                  <div className="stepper">
                    <span className="pm">−</span>
                    <span className="num">{isAr ? toAr(item.qty) : item.qty}</span>
                    <span className="pm">+</span>
                  </div>
                  <div className="total-px">{fmtAmt(item.product.price * item.qty, isAr)} {sdg}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="app-modal-pay">
            <div className="app-pay-method">
              <span className="lbl">{isAr ? 'بنكك' : 'Bankak'}<small>BANKAK</small></span>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 7h18v10H3z"/><path d="M3 11h18"/>
              </svg>
            </div>
            <div className="app-pay-method active">
              <span className="lbl">{isAr ? 'كاش' : 'Cash'}<small>CASH</small></span>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/>
              </svg>
            </div>
          </div>
          <div className="app-modal-totals">
            <div className="app-totrow">
              <span className="lbl">{isAr ? 'المجموع' : 'Subtotal'}</span>
              <span className="v">{fmtAmt(total, isAr)}</span>
            </div>
            <div className="app-totrow grand">
              <span className="lbl">{isAr ? 'الإجمالي' : 'Total'}</span>
              <span className="v">{fmtAmt(total, isAr)}</span>
            </div>
          </div>
          <div className="app-complete">
            <span className="lhs">{fmtAmt(total, isAr)} {sdg}</span>
            <span className="rhs">{isAr ? 'إتمام البيع' : 'Complete sale'}</span>
          </div>
        </div>

        {/* Paid success overlay */}
        <div className={`app-paid${showPaid ? ' show' : ''}`}>
          <div className="check" aria-hidden="true">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path d="M5 12 l5 5 9-11" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h4>{isAr ? 'تمّ الدفع' : 'Sale completed'}</h4>
          <div className="receipt-no">#A-{receiptNo} · {receiptTime}</div>
          <div className="amt">{fmtAmt(paidTotal, isAr)} {sdg}</div>
        </div>

      </div>
    </div>
  );
}
