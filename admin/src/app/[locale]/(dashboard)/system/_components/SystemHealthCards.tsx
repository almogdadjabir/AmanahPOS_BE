type SystemHealth = {
  status?: string;
  checks?: { database?: string; cache?: string };
} | null;

export default function SystemHealthCards({ health }: { health: SystemHealth }) {
  const dbOk    = health?.checks?.database === 'ok';
  const cacheOk = health?.checks?.cache    === 'ok';
  const sysOk   = health?.status           === 'ok';

  const items = [
    {
      label:       'API Gateway',
      value:       sysOk   ? 'Operational' : 'Degraded',
      ok:          sysOk,
      description: sysOk   ? 'Platform gateway is responding normally.'  : 'Platform gateway requires attention.',
      strength:    sysOk   ? 5 : 1,
    },
    {
      label:       'Database',
      value:       dbOk    ? 'Connected'   : 'Error',
      ok:          dbOk,
      description: dbOk    ? 'Primary database connection is healthy.'   : 'Database health check failed.',
      strength:    dbOk    ? 5 : 1,
    },
    {
      label:       'Cache',
      value:       cacheOk ? 'Connected'   : 'Disconnected',
      ok:          cacheOk,
      description: cacheOk ? 'Cache layer is available and responding.'  : 'Cache service is currently unavailable.',
      strength:    cacheOk ? 5 : 1,
    },
  ];

  return (
    <>
      <style>{`
        @keyframes bar-grow {
          from { transform: scaleY(0); opacity:0; }
          to   { transform: scaleY(1); opacity:1; }
        }
        .bar-grow { transform-origin: bottom; animation: bar-grow .35s cubic-bezier(.34,1.56,.64,1) both; }
        @keyframes card-in {
          from { opacity:0; transform:translateY(8px); }
          to   { opacity:1; transform:translateY(0); }
        }
        .card-in { animation: card-in .4s ease-out both; }
      `}</style>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {items.map((item, i) => (
          <div
            key={item.label}
            className="card-in group bg-white rounded-2xl border border-border-soft shadow-[0_1px_4px_0_rgb(0_0_0/.05)] overflow-hidden
                       transition-all duration-200 hover:shadow-card hover:-translate-y-[1px]"
            style={{ animationDelay: `${i * 70}ms` }}
          >
            {/* Top accent */}
            <div className={`h-[3px] w-full transition-colors ${item.ok ? 'bg-success' : 'bg-danger'}`} />

            <div className="p-6">
              {/* Label + badge */}
              <div className="flex items-center justify-between mb-5">
                <span className="text-[10px] font-black tracking-[.18em] uppercase text-text-hint">
                  {item.label}
                </span>
                <span className={`text-[9px] font-black tracking-[.12em] uppercase px-2 py-[3px] rounded-full ${
                  item.ok ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
                }`}>
                  {item.ok ? 'OK' : 'FAIL'}
                </span>
              </div>

              {/* Big value */}
              <p className={`text-[27px] font-black leading-none mb-2 tracking-tight ${
                item.ok ? 'text-text-primary' : 'text-danger'
              }`}>
                {item.value}
              </p>

              {/* Description */}
              <p className="text-[12px] text-text-hint leading-relaxed mb-5">
                {item.description}
              </p>

              {/* Signal-strength bars */}
              <div className="flex items-end gap-[4px]" style={{ height: 24 }}>
                {[8, 12, 16, 20, 24].map((h, b) => (
                  <div
                    key={b}
                    className={`bar-grow w-[5px] rounded-full ${
                      b < item.strength
                        ? item.ok ? 'bg-success' : 'bg-danger'
                        : 'bg-border-soft'
                    }`}
                    style={{ height: h, animationDelay: `${i * 70 + b * 45}ms` }}
                  />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
