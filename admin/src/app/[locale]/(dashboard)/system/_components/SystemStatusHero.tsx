'use client';

import { useEffect, useState } from 'react';

type SystemHealth = {
  status?: string;
  checks?: { database?: string; cache?: string };
} | null;

export default function SystemStatusHero({ health }: { health: SystemHealth }) {
  const [time, setTime]       = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const tick = () =>
      setTime(
        new Date().toLocaleTimeString('en-US', {
          hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit',
        }),
      );
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const dbOk    = health?.checks?.database === 'ok';
  const cacheOk = health?.checks?.cache    === 'ok';
  const sysOk   = health?.status           === 'ok';

  return (
    <div className="flex flex-col lg:flex-row items-center gap-6 rounded-2xl border border-border-soft bg-white px-7 py-6 shadow-card">

      {/* Status indicator */}
      <div className="shrink-0 flex items-center gap-3">
        <span className="relative flex h-2.5 w-2.5">
          <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-40 ${sysOk ? 'bg-success' : 'bg-danger'}`} />
          <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${sysOk ? 'bg-success' : 'bg-danger'}`} />
        </span>
        <span className={`text-[11px] font-bold tracking-[.14em] uppercase ${sysOk ? 'text-success' : 'text-danger'}`}>
          {sysOk ? 'Live' : 'Alert'}
        </span>
      </div>

      {/* Divider */}
      <div className="hidden lg:block w-px h-10 bg-border-soft shrink-0" />

      {/* Main text */}
      <div className="flex-1 text-center lg:text-left min-w-0">
        <h2 className="text-[20px] font-black text-text-primary tracking-tight leading-tight mb-1">
          {sysOk ? 'All systems operational' : 'System degraded'}
        </h2>
        <p className="text-[13px] text-text-hint leading-relaxed">
          {sysOk
            ? 'Core services are responding normally. Platform is fully accessible.'
            : 'One or more services are not responding. Review diagnostics below.'}
        </p>

        <div className="flex flex-wrap gap-2 mt-4 justify-center lg:justify-start">
          <ServicePill label="API Gateway" ok={sysOk}   />
          <ServicePill label="Database"    ok={dbOk}    />
          <ServicePill label="Cache"       ok={cacheOk} />
        </div>
      </div>

      {/* Live clock */}
      <div className="shrink-0 text-center hidden lg:block">
        <p className="text-[9px] font-bold tracking-[.18em] uppercase text-text-hint mb-1.5">Server Time</p>
        <p className="font-mono text-[22px] font-black text-text-primary tabular-nums leading-none">
          {mounted ? time : '——:——:——'}
        </p>
        <p className="text-[9px] text-text-hint mt-1.5 tracking-widest">UTC</p>
      </div>

    </div>
  );
}

function ServicePill({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold ${
      ok
        ? 'border-success/20 bg-success/5 text-success'
        : 'border-danger/20 bg-danger/5 text-danger'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${ok ? 'bg-success' : 'bg-danger'}`} />
      {label}
    </div>
  );
}
