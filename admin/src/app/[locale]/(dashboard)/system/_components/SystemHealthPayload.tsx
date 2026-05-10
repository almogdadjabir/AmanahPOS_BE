'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

type SystemHealth = {
  status?: string;
  checks?: { database?: string; cache?: string };
} | null;

export default function SystemHealthPayload({ health }: { health: SystemHealth }) {
  const t = useTranslations('system');
  const [copied, setCopied] = useState(false);
  if (!health) return null;

  const sysOk = health.status === 'ok';
  const json  = JSON.stringify(health, null, 2);

  async function handleCopy() {
    await navigator.clipboard.writeText(json);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="bg-white rounded-2xl border border-border-soft shadow-[0_1px_4px_0_rgb(0_0_0/.05)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border-soft px-5 py-4">
        <div>
          <p className="text-[13px] font-bold text-text-primary">{t('diagnostics')}</p>
          <p className="text-[11px] text-text-hint mt-0.5">{t('diagnosticsSub')}</p>
        </div>
        <span className={`text-[10px] font-black tracking-[.14em] uppercase px-2.5 py-1 rounded-full ${
          sysOk ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
        }`}>
          {health.status ?? 'unknown'}
        </span>
      </div>

      {/* Terminal window */}
      <div className="bg-[#0D1117]">
        {/* Chrome bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.05]">
          <div className="flex items-center gap-1.5">
            <span className="w-[11px] h-[11px] rounded-full bg-[#FF5F57]" />
            <span className="w-[11px] h-[11px] rounded-full bg-[#FFBD2E]" />
            <span className="w-[11px] h-[11px] rounded-full bg-[#28C840]" />
            <span className="ml-3 text-[11px] font-mono text-white/25 tracking-wide">
              health_check.json
            </span>
          </div>
          <button
            onClick={handleCopy}
            className="text-[10px] font-semibold text-white/35 hover:text-white/65 transition-colors
                       px-2.5 py-1 rounded border border-white/[0.09] hover:border-white/20"
          >
            {copied ? t('copied') : t('copy')}
          </button>
        </div>

        {/* Code */}
        <pre className="px-5 py-5 text-[12px] leading-[1.75] font-mono overflow-x-auto
                        text-[#E6EDF3] max-h-[280px] overflow-y-auto custom-scrollbar">
          <JsonHighlight data={health} />
        </pre>
      </div>
    </div>
  );
}

function JsonHighlight({ data }: { data: object }) {
  const lines = JSON.stringify(data, null, 2).split('\n');

  return (
    <>
      {lines.map((line, i) => {
        const m = line.match(/^(\s*)("[\w]+")\s*:\s*(.*)/);
        if (m) {
          const [, indent, key, rest] = m;
          const trimmed = rest.replace(/,$/, '');
          const comma   = rest.endsWith(',') ? ',' : '';
          const valColor =
            trimmed === 'null'                  ? '#F47067' :
            trimmed === 'true'                  ? '#7EE787' :
            trimmed === 'false'                 ? '#F47067' :
            trimmed.startsWith('"')             ? '#A5D6FF' :
                                                  '#E6EDF3';
          return (
            <span key={i}>
              {indent}
              <span style={{ color: '#7EE787' }}>{key}</span>
              <span style={{ color: '#E6EDF3' }}>: </span>
              <span style={{ color: valColor }}>{trimmed}</span>
              <span style={{ color: '#E6EDF3' }}>{comma}</span>
              {'\n'}
            </span>
          );
        }
        return (
          <span key={i} style={{ color: '#636E7B' }}>
            {line}{'\n'}
          </span>
        );
      })}
    </>
  );
}
