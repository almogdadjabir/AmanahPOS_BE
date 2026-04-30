'use client';

export default function GlobalError({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>خطأ — AmanaPOS</title>
        <style>{`
          body { margin: 0; font-family: system-ui, sans-serif; background: #fff; color: #0B1220; }
          h1   { margin: 0 0 8px; font-size: 22px; font-weight: 800; }
          p    { margin: 0 0 32px; color: #64748B; max-width: 340px; }
          .row { display: flex; flex-wrap: wrap; gap: 12px; justify-content: center; }
          button, a { display: inline-block; padding: 12px 28px; border-radius: 12px; font-weight: 700; font-size: 14px; text-decoration: none; cursor: pointer; border: none; }
          button { background: #0F766E; color: #fff; }
          a      { background: transparent; color: #0B1220; border: 1.5px solid #E2E8F0; }
        `}</style>
      </head>
      <body>
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center' }}>
          <h1>حدث خطأ ما</h1>
          <p>واجهنا مشكلة غير متوقعة.</p>
          <div className="row">
            <button onClick={reset}>حاول مجددًا</button>
            <a href="/ar">العودة للرئيسية</a>
          </div>
        </div>
      </body>
    </html>
  );
}
