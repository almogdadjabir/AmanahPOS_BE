// Root-level 404 — shown when no locale segment matches (e.g. /_not-found).
// next-intl is not available here, so we use plain HTML with inline styles.
export default function RootNotFound() {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>404 — AmanaPOS</title>
        <style>{`
          body { margin: 0; font-family: system-ui, sans-serif; background: #fff; color: #0B1220; }
          .num  { font-size: clamp(80px,15vw,140px); font-weight: 900; line-height: 1; color: #F1F5F9; user-select: none; }
          h1    { margin: 16px 0 8px; font-size: 22px; font-weight: 800; }
          p     { margin: 0 0 32px; color: #64748B; max-width: 340px; }
          a     { display: inline-block; padding: 12px 28px; background: #0F766E; color: #fff; border-radius: 12px; font-weight: 700; font-size: 14px; text-decoration: none; }
        `}</style>
      </head>
      <body>
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center' }}>
          <p className="num">404</p>
          <h1>الصفحة غير موجودة</h1>
          <p>الرابط الذي فتحته غير موجود.</p>
          <a href="/ar">العودة للرئيسية</a>
        </div>
      </body>
    </html>
  );
}
