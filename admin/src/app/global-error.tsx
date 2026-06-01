'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body style={{ margin: 0, fontFamily: 'monospace', background: '#0f172a', color: '#f1f5f9', padding: '2rem' }}>
        <h2 style={{ color: '#f87171', marginBottom: '1rem' }}>Runtime crash — copy this and share it</h2>
        <pre style={{
          background: '#1e293b', padding: '1.5rem', borderRadius: '8px',
          overflowX: 'auto', fontSize: '13px', lineHeight: 1.6,
          border: '1px solid #334155', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        }}>
          {error?.name}: {error?.message}
          {'\n\n'}
          {error?.stack}
          {error?.digest ? `\n\ndigest: ${error.digest}` : ''}
        </pre>
        <button
          onClick={reset}
          style={{
            marginTop: '1.5rem', padding: '0.5rem 1.25rem',
            background: '#0f766e', color: '#fff', border: 'none',
            borderRadius: '6px', cursor: 'pointer', fontSize: '14px',
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
