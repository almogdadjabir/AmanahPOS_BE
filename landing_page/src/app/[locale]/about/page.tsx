import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import Nav from "@/components/sections/Nav";
import Footer from "@/components/sections/Footer";
import CtaSection from "@/components/sections/CtaSection";
import SecHead from "@/components/ui/SecHead";
import ScrollReveal from "@/components/ui/ScrollReveal";
import type { Metadata } from "next";
import type { ReactNode } from "react";

type Props = { params: Promise<{ locale: string }> };

const DASHBOARD_URL = process.env.NEXT_PUBLIC_DASHBOARD_URL || "#";

export async function generateStaticParams() {
  return [{ locale: "en" }, { locale: "ar" }];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === "ar" ? "عنّا — أمانة بوس" : "About — AmanaPOS",
    description:
      locale === "ar"
        ? "صُنع في الخرطوم للتاجر السوداني"
        : "Built in Khartoum for Sudanese merchants",
  };
}

const sw = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

/* ── Hero illustration — a shop rebuilt and growing ── */
/* ── Hero illustration — premium Sudanese shop + POS growth scene ── */
function HeroArt() {
  const rays = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];

  return (
    <svg
      className="ab-art ab-art-premium"
      viewBox="0 0 520 450"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="abPGlow" cx="0.52" cy="0.48" r="0.62">
          <stop offset="0" stopColor="rgba(45,212,191,0.28)" />
          <stop offset="0.45" stopColor="rgba(45,212,191,0.12)" />
          <stop offset="1" stopColor="rgba(45,212,191,0)" />
        </radialGradient>

        <radialGradient id="abPSunGlow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="rgba(245,158,11,0.55)" />
          <stop offset="1" stopColor="rgba(245,158,11,0)" />
        </radialGradient>

        <linearGradient
          id="abPAwn"
          x1="170"
          y1="154"
          x2="398"
          y2="211"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="var(--primary)" />
          <stop offset="0.55" stopColor="var(--primary-2)" />
          <stop offset="1" stopColor="var(--primary)" />
        </linearGradient>

        <linearGradient
          id="abPShopBody"
          x1="196"
          y1="190"
          x2="396"
          y2="370"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="rgba(255,255,255,0.92)" />
          <stop offset="1" stopColor="rgba(255,255,255,0.62)" />
        </linearGradient>

        <linearGradient
          id="abPDevice"
          x1="118"
          y1="238"
          x2="198"
          y2="378"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="rgba(15,23,42,0.92)" />
          <stop offset="1" stopColor="rgba(15,23,42,0.72)" />
        </linearGradient>

        <linearGradient id="abPGlass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="rgba(255,255,255,0.88)" />
          <stop offset="1" stopColor="rgba(255,255,255,0.45)" />
        </linearGradient>

        <linearGradient
          id="abPChart"
          x1="52"
          y1="300"
          x2="148"
          y2="192"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="var(--primary)" stopOpacity="0.25" />
          <stop offset="1" stopColor="var(--primary-2)" stopOpacity="0.95" />
        </linearGradient>

        <filter id="abPSoftShadow" x="-25%" y="-25%" width="150%" height="150%">
          <feDropShadow
            dx="0"
            dy="18"
            stdDeviation="18"
            floodColor="rgba(15,23,42,0.16)"
          />
        </filter>

        <filter id="abPTinyShadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow
            dx="0"
            dy="8"
            stdDeviation="8"
            floodColor="rgba(15,23,42,0.14)"
          />
        </filter>

        <pattern
          id="abPDotGrid"
          width="22"
          height="22"
          patternUnits="userSpaceOnUse"
        >
          <circle
            cx="1.5"
            cy="1.5"
            r="1.2"
            fill="currentColor"
            opacity="0.12"
          />
        </pattern>

        <clipPath id="abPDeviceClip">
          <rect x="98" y="238" width="86" height="122" rx="16" />
        </clipPath>

        <clipPath id="abPScreenClip">
          <rect x="111" y="255" width="60" height="48" rx="8" />
        </clipPath>
      </defs>

      {/* ambient background */}
      <ellipse cx="266" cy="228" rx="235" ry="204" fill="url(#abPGlow)" />
      <path
        className="ab-grid-orbit"
        d="M60 318 C126 202 214 152 334 154 C412 156 462 192 488 244"
      />
      <path
        className="ab-nile-line"
        d="M32 384 C92 342 122 386 182 350 C236 318 288 386 344 338 C398 292 442 324 488 286"
      />
      <rect
        x="68"
        y="72"
        width="386"
        height="282"
        rx="42"
        fill="url(#abPDotGrid)"
        opacity="0.35"
      />

      {/* sun */}
      <g className="ab-sun-wrap">
        <circle cx="410" cy="82" r="64" fill="url(#abPSunGlow)" />
        <circle className="ab-sun-core" cx="410" cy="82" r="20" />
        {rays.map((a) => {
          const r = (a * Math.PI) / 180;
          return (
            <line
              key={a}
              className="ab-sun-ray"
              x1={410 + Math.cos(r) * 30}
              y1={82 + Math.sin(r) * 30}
              x2={410 + Math.cos(r) * 42}
              y2={82 + Math.sin(r) * 42}
            />
          );
        })}
      </g>

      {/* skyline / rebuilt city hint */}
      <g className="ab-skyline">
        <path d="M208 168 V138 h18 v30 M236 168 V126 h22 v42 M270 168 V112 h26 v56 M310 168 V132 h20 v36 M342 168 V120 h24 v48" />
        <path d="M198 168 H376" />
      </g>

      {/* growth analytics card */}
      <g
        className="ab-float ab-f1 ab-analytics-card"
        filter="url(#abPTinyShadow)"
      >
        <rect
          x="36"
          y="196"
          width="128"
          height="112"
          rx="18"
          fill="url(#abPGlass)"
        />
        <rect
          className="ab-glass-line"
          x="36"
          y="196"
          width="128"
          height="112"
          rx="18"
        />
        <circle className="t-fill" cx="60" cy="222" r="6" opacity="0.9" />
        <line
          className="t"
          x1="74"
          y1="218"
          x2="124"
          y2="218"
          strokeWidth="3"
        />
        <line className="s" x1="74" y1="230" x2="110" y2="230" />

        <rect
          className="ab-bar ab-bar-1"
          x="58"
          y="268"
          width="16"
          height="22"
          rx="5"
        />
        <rect
          className="ab-bar ab-bar-2"
          x="84"
          y="250"
          width="16"
          height="40"
          rx="5"
        />
        <rect
          className="ab-bar ab-bar-3"
          x="110"
          y="230"
          width="16"
          height="60"
          rx="5"
        />

        <path className="ab-chart-line" d="M58 258 L82 244 L106 222 L138 202" />
        <path
          className="ab-chart-line"
          d="M138 202 L137 216 M138 202 L124 207"
        />
      </g>

      {/* shop shadow */}
      <ellipse cx="304" cy="390" rx="172" ry="18" fill="rgba(15,23,42,0.10)" />

      {/* shop */}
      <g className="ab-shop-premium" filter="url(#abPSoftShadow)">
        {/* side depth */}
        <path className="ab-shop-side" d="M392 202 L420 220 V364 L392 374 Z" />

        {/* body */}
        <path className="ab-shop-body" d="M190 202 H392 V374 H190 Z" />
        <path className="ab-shop-body-shine" d="M204 216 H376 V358 H204 Z" />

        {/* roof / awning */}
        <path d="M174 202 H406 L390 156 H190 Z" fill="url(#abPAwn)" />
        <path className="ab-awning-top" d="M190 156 H390 L406 202 H174 Z" />

        {[204, 236, 268, 300, 332, 364, 396].map((x) => (
          <path
            key={x}
            className="ab-awning-stripe"
            d={`M${x} 202 L${x - 14} 156`}
          />
        ))}

        <path
          className="ab-awning-edge"
          d="M174 202 q8 10 16 0 q8 10 16 0 q8 10 16 0 q8 10 16 0 q8 10 16 0 q8 10 16 0 q8 10 16 0 q8 10 16 0 q8 10 16 0 q8 10 16 0 q8 10 16 0 q8 10 16 0 q8 10 16 0 q8 10 16 0 q8 10 16 0"
        />

        {/* premium sign */}
        <g className="ab-sign">
          <rect
            x="232"
            y="218"
            width="122"
            height="42"
            rx="14"
            fill="rgba(15,23,42,0.88)"
          />
          <rect
            x="240"
            y="226"
            width="28"
            height="26"
            rx="8"
            fill="var(--primary)"
          />
          <text x="254" y="245" className="ab-mark-premium" textAnchor="middle">
            أ
          </text>
          <line x1="280" y1="233" x2="338" y2="233" />
          <line x1="280" y1="246" x2="320" y2="246" />
        </g>

        {/* left window */}
        <g className="ab-window">
          <rect x="206" y="282" width="54" height="52" rx="10" />
          <path d="M206 302 H260 M233 282 V334" />
          <path className="ab-window-glare" d="M214 290 L236 282" />
        </g>

        {/* right window */}
        <g className="ab-window">
          <rect x="330" y="282" width="54" height="52" rx="10" />
          <path d="M330 302 H384 M357 282 V334" />
          <path className="ab-window-glare" d="M338 290 L360 282" />
        </g>

        {/* door */}
        <g className="ab-door">
          <rect x="270" y="278" width="54" height="96" rx="10" />
          <rect x="279" y="288" width="36" height="76" rx="7" />
          <circle cx="306" cy="328" r="2.8" />
        </g>

        {/* open / offline badge */}
        <g className="ab-open-badge">
          <rect x="220" y="266" width="78" height="24" rx="12" />
          <circle cx="235" cy="278" r="4" />
          <path d="M247 273 h32 M247 282 h22" />
        </g>

        {/* plant = growth */}
        <g className="ab-plant">
          <path d="M400 370 C400 348 394 338 382 328" />
          <path d="M400 370 C400 348 408 336 422 326" />
          <path d="M383 328 C396 326 399 336 390 342 C380 348 376 336 383 328Z" />
          <path d="M422 326 C410 326 406 336 416 342 C426 348 431 334 422 326Z" />
          <rect x="386" y="368" width="30" height="12" rx="4" />
        </g>
      </g>

      {/* POS device foreground */}
      <g className="ab-pos-device" filter="url(#abPSoftShadow)">
        <rect
          x="92"
          y="232"
          width="98"
          height="138"
          rx="20"
          fill="url(#abPDevice)"
        />
        <rect
          x="98"
          y="238"
          width="86"
          height="122"
          rx="16"
          fill="rgba(255,255,255,0.04)"
        />
        <g clipPath="url(#abPDeviceClip)">
          <circle cx="156" cy="244" r="68" fill="rgba(45,212,191,0.14)" />
          <path
            d="M94 328 C124 304 160 326 190 298"
            stroke="rgba(45,212,191,0.20)"
            strokeWidth="14"
          />
        </g>

        {/* screen */}
        <rect
          x="111"
          y="255"
          width="60"
          height="48"
          rx="8"
          fill="rgba(226,252,248,0.96)"
        />
        <g clipPath="url(#abPScreenClip)">
          <path
            d="M116 292 L128 279 L139 285 L154 268 L168 275"
            stroke="var(--primary)"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="128" cy="279" r="2.6" fill="var(--primary)" />
          <circle cx="154" cy="268" r="2.6" fill="var(--primary-2)" />
        </g>

        {/* keypad */}
        {[0, 1, 2].map((row) =>
          [0, 1, 2].map((col) => (
            <rect
              key={`${row}-${col}`}
              x={112 + col * 19}
              y={316 + row * 13}
              width="12"
              height="7"
              rx="3.5"
              fill={
                row === 2 && col === 2
                  ? "var(--primary)"
                  : "rgba(255,255,255,0.55)"
              }
            />
          )),
        )}

        <path
          d="M108 244 H174"
          stroke="rgba(255,255,255,0.28)"
          strokeWidth="1.4"
        />
        <circle cx="141" cy="350" r="3" fill="rgba(255,255,255,0.5)" />
      </g>

      {/* floating receipt */}
      <g
        className="ab-float ab-f2 ab-receipt-premium"
        filter="url(#abPTinyShadow)"
      >
        <path
          d="M58 100 H144 V206 L134 200 L124 206 L114 200 L104 206 L94 200 L84 206 L74 200 L64 206 L58 202 Z"
          fill="url(#abPGlass)"
        />
        <path
          className="ab-glass-line"
          d="M58 100 H144 V206 L134 200 L124 206 L114 200 L104 206 L94 200 L84 206 L74 200 L64 206 L58 202 Z"
        />
        <line
          className="t"
          x1="76"
          y1="124"
          x2="118"
          y2="124"
          strokeWidth="3"
        />
        <line className="s" x1="76" y1="140" x2="130" y2="140" />
        <line className="s" x1="76" y1="154" x2="124" y2="154" />
        <line className="s" x1="76" y1="168" x2="132" y2="168" />
        <line
          className="t"
          x1="76"
          y1="188"
          x2="108"
          y2="188"
          strokeWidth="4"
        />
      </g>

      {/* bank card */}
      <g
        className="ab-float ab-f3 ab-card-premium"
        filter="url(#abPTinyShadow)"
      >
        <rect
          x="344"
          y="218"
          width="114"
          height="70"
          rx="16"
          fill="rgba(15,23,42,0.88)"
        />
        <circle cx="430" cy="236" r="18" fill="rgba(45,212,191,0.20)" />
        <circle cx="444" cy="236" r="18" fill="rgba(245,158,11,0.18)" />
        <rect
          x="360"
          y="236"
          width="24"
          height="17"
          rx="4"
          fill="rgba(245,158,11,0.9)"
        />
        <line
          x1="360"
          y1="266"
          x2="412"
          y2="266"
          stroke="rgba(255,255,255,0.65)"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <line
          x1="360"
          y1="276"
          x2="396"
          y2="276"
          stroke="rgba(255,255,255,0.35)"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>

      {/* synced pill */}
      <g className="ab-float ab-f4 ab-sync-pill" filter="url(#abPTinyShadow)">
        <rect
          x="328"
          y="348"
          width="142"
          height="42"
          rx="21"
          fill="url(#abPGlass)"
        />
        <rect
          className="ab-glass-line"
          x="328"
          y="348"
          width="142"
          height="42"
          rx="21"
        />
        <circle cx="352" cy="369" r="9" fill="var(--primary)" />
        <path
          d="M348 369 l3 3 6 -7"
          stroke="#fff"
          strokeWidth="2.2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <line
          className="t"
          x1="370"
          y1="363"
          x2="424"
          y2="363"
          strokeWidth="3"
        />
        <line className="s" x1="370" y1="374" x2="408" y2="374" />
      </g>

      {/* SDG coin */}
      <g
        className="ab-float ab-f5 ab-coin-premium"
        filter="url(#abPTinyShadow)"
      >
        <circle cx="412" cy="162" r="28" fill="rgba(245,158,11,0.18)" />
        <circle cx="412" cy="162" r="20" fill="rgba(245,158,11,0.38)" />
        <path d="M406 151 v22 M401 156 q5 -5 11 0 q6 5 0 11 q-6 5 -11 0 q-5 -5 0 -11" />
      </g>

      {/* small sparkles */}
      {[
        [180, 104, 3],
        [246, 82, 2],
        [468, 184, 3],
        [72, 344, 2],
        [232, 400, 2],
        [476, 326, 2],
      ].map(([x, y, r], i) => (
        <circle
          key={i}
          className={`ab-spark ab-spark-${i + 1}`}
          cx={x}
          cy={y}
          r={r}
        />
      ))}
    </svg>
  );
}

const VALUE_ICONS: ReactNode[] = [
  // merchant-first
  <svg key="m" width="26" height="26" viewBox="0 0 24 24" {...sw}>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3 20a6 6 0 0 1 12 0" />
    <path d="M16 11.5a3 3 0 1 0 0-6" />
    <path d="M17 20a5.5 5.5 0 0 0-2.5-4.6" />
  </svg>,
  // affordable
  <svg key="a" width="26" height="26" viewBox="0 0 24 24" {...sw}>
    <path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10z" />
    <circle cx="8" cy="8" r="1.6" />
  </svg>,
  // built for Sudan
  <svg key="s" width="26" height="26" viewBox="0 0 24 24" {...sw}>
    <path d="M12 21s7-5.7 7-11a7 7 0 1 0-14 0c0 5.3 7 11 7 11z" />
    <circle cx="12" cy="10" r="2.4" />
  </svg>,
];

const STAT_ICONS: ReactNode[] = [
  <svg key="1" width="22" height="22" viewBox="0 0 24 24" {...sw}>
    <path d="M5 21V4l9-2v19" />
    <path d="M14 7h4a1 1 0 0 1 1 1v13M3 21h18M8 8h2M8 12h2M8 16h2" />
  </svg>,
  <svg key="2" width="22" height="22" viewBox="0 0 24 24" {...sw}>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.5 9.2a2.5 2 0 0 1 5 0c0 2-2.5 1.8-2.5 3.3M12 15.6h.01" />
  </svg>,
  <svg key="3" width="22" height="22" viewBox="0 0 24 24" {...sw}>
    <rect x="3" y="13" width="5" height="8" rx="1" />
    <rect x="10" y="8" width="5" height="13" rx="1" />
    <rect x="17" y="3" width="4" height="18" rx="1" />
  </svg>,
];

function Stat({ icon, v, l }: { icon: ReactNode; v: string; l: string }) {
  return (
    <div className="ab-stat">
      <span className="ab-stat-ico" aria-hidden="true">
        {icon}
      </span>
      <span className="ab-stat-v">{v}</span>
      <span className="ab-stat-l">{l}</span>
    </div>
  );
}

function Value({
  icon,
  eye,
  title,
  body,
}: {
  icon: ReactNode;
  eye: string;
  title: string;
  body: string;
}) {
  return (
    <ScrollReveal className="ab-value">
      <span className="ab-value-ico" aria-hidden="true">
        {icon}
      </span>
      <span className="ab-value-eye">{eye}</span>
      <h3>{title}</h3>
      <p>{body}</p>
    </ScrollReveal>
  );
}

export default function AboutPage() {
  const t = useTranslations("about");

  return (
    <>
      <div className="bg-layer bg-aurora-1" aria-hidden="true" />
      <div className="bg-layer bg-aurora-2" aria-hidden="true" />
      <div className="bg-layer bg-grid" aria-hidden="true" />

      <Nav />

      <main>
        {/* ── Hero ── */}
        <section className="ab-hero">
          <div className="container-page ab-hero-grid">
            <div className="ab-hero-copy">
              <ScrollReveal>
                <span className="eyebrow">
                  <span className="dot" aria-hidden="true" />
                  {t("eyebrow")}
                </span>
              </ScrollReveal>
              <ScrollReveal delay={1}>
                <h1 className="ab-h1">
                  {t("h1")} <em>{t("h1Accent")}</em>
                </h1>
              </ScrollReveal>
              <ScrollReveal delay={2}>
                <p className="ab-lead">{t("intro")}</p>
              </ScrollReveal>
              <ScrollReveal delay={3}>
                <div className="ab-hero-cta">
                  <a href={DASHBOARD_URL} className="btn btn-lg">
                    <span>{t("startFree")}</span>
                    <span className="arrow" aria-hidden="true">
                      →
                    </span>
                  </a>
                  <a href="#values" className="btn btn-ghost btn-lg">
                    {t("readStory")}
                  </a>
                </div>
              </ScrollReveal>
            </div>
            <ScrollReveal delay={1} className="ab-hero-art-wrap">
              <HeroArt />
            </ScrollReveal>
          </div>
        </section>

        {/* ── Stats ── */}
        <section className="ab-stats-sec">
          <div className="container-page">
            <ScrollReveal className="ab-stats">
              <Stat icon={STAT_ICONS[0]} v={t("stat1V")} l={t("stat1L")} />
              <Stat icon={STAT_ICONS[1]} v={t("stat2V")} l={t("stat2L")} />
              <Stat icon={STAT_ICONS[2]} v={t("stat3V")} l={t("stat3L")} />
            </ScrollReveal>
          </div>
        </section>

        {/* ── Mission ── */}
        <section className="ab-mission">
          <div className="container-page">
            <ScrollReveal>
              <svg
                className="ab-quote"
                width="54"
                height="44"
                viewBox="0 0 54 44"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M0 44V24C0 10.7 8 1.7 21 0l2 6C15 8 11 12.5 11 19h9v25H0zm31 0V24C31 10.7 39 1.7 52 0l2 6c-8 2-12 6.5-12 13h9v25H31z" />
              </svg>
              <p className="ab-mq">{t("mQ")}</p>
              <p className="ab-ms">{t("mS")}</p>
            </ScrollReveal>
          </div>
        </section>

        {/* ── Values ── */}
        <section id="values" className="ab-values-sec">
          <div className="container-page">
            <SecHead
              eyebrow={t("valuesEye")}
              title={
                <>
                  {t("valuesTitle")} <em>{t("valuesTitleAccent")}</em>
                </>
              }
            />
            <div className="ab-values">
              <Value
                icon={VALUE_ICONS[0]}
                eye={t("v1Eye")}
                title={t("v1T")}
                body={t("v1B")}
              />
              <Value
                icon={VALUE_ICONS[1]}
                eye={t("v2Eye")}
                title={t("v2T")}
                body={t("v2B")}
              />
              <Value
                icon={VALUE_ICONS[2]}
                eye={t("v3Eye")}
                title={t("v3T")}
                body={t("v3B")}
              />
            </div>
          </div>
        </section>

        {/* ── Team + join ── */}
        <section className="ab-team-sec">
          <div className="container-page ab-team-grid">
            <ScrollReveal className="ab-team-copy">
              <span className="eyebrow">
                <span className="dot" aria-hidden="true" />
                {t("tEye")}
              </span>
              <h2 className="h2">{t("tH")}</h2>
              <p className="lede">{t("tB")}</p>
              <div className="ab-team-avatars" aria-hidden="true">
                {["أ", "م", "ع", "ن", "+"].map((c, i) => (
                  <span className="ab-av" key={i} data-i={i}>
                    {c}
                  </span>
                ))}
              </div>
            </ScrollReveal>

            <ScrollReveal delay={1} className="ab-join">
              <span className="ab-join-ico" aria-hidden="true">
                <svg width="26" height="26" viewBox="0 0 24 24" {...sw}>
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M19 8v6M22 11h-6" />
                </svg>
              </span>
              <h3 className="ab-join-t">{t("jT")}</h3>
              <p className="ab-join-b">{t("jB")}</p>
              <Link href="/careers" className="btn btn-lg ab-join-cta">
                <span>{t("jCta")}</span>
                <span className="arrow" aria-hidden="true">
                  →
                </span>
              </Link>
            </ScrollReveal>
          </div>
        </section>

        <CtaSection />
      </main>

      <Footer />
    </>
  );
}
