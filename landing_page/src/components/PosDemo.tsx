'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocale } from 'next-intl';

type CartItem = { nameAr: string; nameEn: string; price: number; qty: number };

const PRODUCTS = [
  { color: 'hibiscus', nameAr: 'كركديه',    nameEn: 'Hibiscus',     price: 800  },
  { color: 'coffee',   nameAr: 'قهوة جبنة',  nameEn: 'Jebena Coffee', price: 1200 },
  { color: 'tea',      nameAr: 'شاي بالحليب', nameEn: 'Milk Tea',     price: 600  },
  { color: 'bean',     nameAr: 'فول مدمس',   nameEn: 'Ful Medames',  price: 2500 },
  { color: 'bread',    nameAr: 'قرّاصة',     nameEn: 'Gurassa',      price: 500  },
  { color: 'dolma',    nameAr: 'ملوخية',     nameEn: 'Mulukhiyah',   price: 2000 },
];

const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
function toAr(n: string | number) {
  return String(n).replace(/[0-9]/g, d => AR_DIGITS[+d]);
}
function fmtPrice(n: number, isAr: boolean) {
  const s = n.toLocaleString('en-US');
  return isAr ? `${toAr(s)} ج.س` : `${s} SDG`;
}

function sleep(ms: number) { return new Promise<void>(r => setTimeout(r, ms)); }

function pickSequence(len: number) {
  const n = 3 + Math.floor(Math.random() * 2);
  const idxs = [...Array(len).keys()].sort(() => Math.random() - 0.5).slice(0, n);
  const seq: number[] = [];
  idxs.forEach(i => {
    const reps = 1 + (Math.random() < 0.35 ? 1 : 0);
    for (let k = 0; k < reps; k++) seq.push(i);
  });
  return seq;
}

export default function PosDemo() {
  const locale = useLocale();
  const isAr = locale === 'ar';

  const [cart, setCart] = useState<CartItem[]>([]);
  const [tappedIdx, setTappedIdx] = useState<number | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [checkoutFlash, setCheckoutFlash] = useState(false);
  const [clock, setClock] = useState('');
  const [bumpCount, setBumpCount] = useState(0);

  const abortRef = useRef(false);

  const getCartTotal = (items: CartItem[]) =>
    items.reduce((s, i) => s + i.price * i.qty, 0);
  const getCartCount = (items: CartItem[]) =>
    items.reduce((s, i) => s + i.qty, 0);

  const tickClock = useCallback(() => {
    const now = new Date();
    const hh = now.getHours().toString().padStart(2, '0');
    const mm = now.getMinutes().toString().padStart(2, '0');
    setClock(isAr ? `${toAr(hh)}:${toAr(mm)}` : `${hh}:${mm}`);
  }, [isAr]);

  useEffect(() => {
    tickClock();
    const id = setInterval(tickClock, 10000);
    return () => clearInterval(id);
  }, [tickClock]);

  const tapProduct = useCallback((idx: number) => {
    setTappedIdx(idx);
    setTimeout(() => setTappedIdx(null), 600);
    setCart(prev => {
      const nameAr = PRODUCTS[idx].nameAr;
      const found = prev.find(i => i.nameAr === nameAr);
      if (found) return prev.map(i => i.nameAr === nameAr ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { nameAr, nameEn: PRODUCTS[idx].nameEn, price: PRODUCTS[idx].price, qty: 1 }];
    });
    setBumpCount(c => c + 1);
  }, []);

  useEffect(() => {
    abortRef.current = false;

    async function loop() {
      while (!abortRef.current) {
        setCart([]);
        setShowReceipt(false);
        await sleep(900);
        if (abortRef.current) break;

        const seq = pickSequence(PRODUCTS.length);
        for (const idx of seq) {
          if (abortRef.current) break;
          tapProduct(idx);
          await sleep(900 + Math.random() * 300);
        }
        if (abortRef.current) break;

        await sleep(700);
        setCheckoutFlash(true);
        setTimeout(() => setCheckoutFlash(false), 200);
        await sleep(450);
        if (abortRef.current) break;
        setShowReceipt(true);
        await sleep(3200);
      }
    }

    loop();
    return () => { abortRef.current = true; };
  }, [tapProduct]);

  const cartItems = cart;
  const total = getCartTotal(cartItems);
  const count = getCartCount(cartItems);

  const receiptTime = (() => {
    const now = new Date();
    const hh = now.getHours().toString().padStart(2, '0');
    const mm = now.getMinutes().toString().padStart(2, '0');
    return isAr ? `${toAr(hh)}:${toAr(mm)}` : `${hh}:${mm}`;
  })();

  const tabs = isAr ? ['الكل', 'قهوة', 'شاي', 'طعام'] : ['All', 'Coffee', 'Tea', 'Food'];
  const branchText = isAr ? '· الخرطوم · فرع ١' : '· Khartoum · Branch 1';
  const markText = isAr ? 'أمانة' : 'Amana';
  const basketLabel = isAr ? 'السلة' : 'Basket';
  const checkoutLabel = isAr ? 'ادفع' : 'Checkout';
  const countText = isAr
    ? `${toAr(count)} ${count === 1 ? 'صنف' : 'صنف'}`
    : `${count} item${count === 1 ? '' : 's'}`;

  return (
    <div className="pos-stage" aria-label="Live POS demo">
      <span className="corner tl" />
      <span className="corner tr" />
      <span className="corner bl" />
      <span className="corner br" />

      <div className="pos-hud">
        <span>SYS · POS · 01</span>
        <span className="hud-r">
          <span>NET 4G</span>
          <span className="live">LIVE</span>
        </span>
      </div>

      <div className="pos-screen">
        <div className="pos-head">
          <span className="mark-ico">أ</span>
          <div>
            <div className="mark">{markText}</div>
            <span className="branch">{branchText}</span>
          </div>
          <span className="clock">{clock}</span>
        </div>

        <div className="pos-tabs">
          {tabs.map((tab, i) => (
            <span key={tab} className={`tab${i === 0 ? ' active' : ''}`}>{tab}</span>
          ))}
        </div>

        <div className="pos-grid">
          {PRODUCTS.map((prod, idx) => (
            <button
              key={prod.color}
              className={`pos-prod${tappedIdx === idx ? ' tap' : ''}`}
              data-color={prod.color}
              onClick={() => tapProduct(idx)}
            >
              <span className="swatch" />
              <span className="name">{isAr ? prod.nameAr : prod.nameEn}</span>
              <span className="price">
                <b>{isAr ? toAr(prod.price.toLocaleString('en-US')) : prod.price.toLocaleString('en-US')}</b>
                {' '}{isAr ? 'ج.س' : 'SDG'}
              </span>
            </button>
          ))}
        </div>

        <div className="pos-cart">
          <div>
            <div className="label">{basketLabel}</div>
            <div className={`count${bumpCount > 0 && count > 0 ? ' bump' : ''}`}>{countText}</div>
          </div>
          <div className="total">{total ? fmtPrice(total, isAr) : (isAr ? '٠ ج.س' : '0 SDG')}</div>
          <span
            className="checkout-btn"
            style={checkoutFlash ? { transform: 'scale(0.94)', transition: 'transform .15s' } : { transition: 'transform .15s' }}
          >
            {checkoutLabel}
          </span>
        </div>
      </div>

      <div className={`pos-receipt${showReceipt ? ' show' : ''}`}>
        <div className="check" aria-hidden="true">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M5 12 l5 5 9-11" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h4>{isAr ? 'تمّ الدفع · Paid' : 'Payment complete · تمّ'}</h4>
        <div className="ticket">#A-2046 · <span>{receiptTime}</span></div>
        <div className="lines">
          {cartItems.map((item, i) => {
            const nm = isAr ? item.nameAr : item.nameEn;
            const qty = isAr ? toAr(item.qty) : item.qty;
            const sub = fmtPrice(item.price * item.qty, isAr);
            return (
              <div className="row" key={i}>
                <span><span className="qty">×{qty}</span>{nm}</span>
                <span>{sub}</span>
              </div>
            );
          })}
        </div>
        <div className="total-row">
          <span>{isAr ? 'الإجمالي' : 'Total'}</span>
          <span>{fmtPrice(total, isAr)}</span>
        </div>
        <div className="pay">
          <b>BANKAK</b> · {isAr ? 'مقبول' : 'APPROVED'}
        </div>
      </div>
    </div>
  );
}
