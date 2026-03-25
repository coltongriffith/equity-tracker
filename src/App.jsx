import React, { useEffect, useMemo, useState, useCallback } from "react";
import { TrendingUp, TrendingDown, DollarSign, Home, Landmark, Coins, BarChart3, PieChart as PieIcon, FileText, Calendar, Calculator, Edit3, Check, X, ChevronRight, Briefcase, CreditCard, Car, Package, Building2, Wallet, CircleDot, Plus, Trash2, Upload, Download, Sun, Moon, RefreshCw } from "lucide-react";

// ─── CONSTANTS ───────────────────────────────────────────────────────────────
const SK = "eq-data-v4", SSK = "eq-set-v4", PK = "eq-prices-v4", NK = "eq-nw-v4";
const CUR = { CAD: { locale: "en-CA", rate: 1 }, USD: { locale: "en-US", rate: 0.74 }, AUD: { locale: "en-AU", rate: 1.13 }, GBP: { locale: "en-GB", rate: 0.58 }, EUR: { locale: "de-DE", rate: 0.68 } };

// Canadian provincial tax rates (2025) — marginal on capital gains (50% inclusion)
const PROVINCES = {
  BC: { name: "British Columbia", rates: [{ max: 47937, rate: 0.0506 }, { max: 95875, rate: 0.077 }, { max: 110076, rate: 0.105 }, { max: 133664, rate: 0.1229 }, { max: 181232, rate: 0.147 }, { max: 252752, rate: 0.168 }, { max: Infinity, rate: 0.205 }], fedRates: true },
  AB: { name: "Alberta", rates: [{ max: 148269, rate: 0.10 }, { max: 177922, rate: 0.12 }, { max: 237230, rate: 0.13 }, { max: 355845, rate: 0.14 }, { max: Infinity, rate: 0.15 }], fedRates: true },
  SK: { name: "Saskatchewan", rates: [{ max: 52057, rate: 0.105 }, { max: 148734, rate: 0.125 }, { max: Infinity, rate: 0.145 }], fedRates: true },
  MB: { name: "Manitoba", rates: [{ max: 47000, rate: 0.108 }, { max: 100000, rate: 0.1275 }, { max: Infinity, rate: 0.174 }], fedRates: true },
  ON: { name: "Ontario", rates: [{ max: 51446, rate: 0.0505 }, { max: 102894, rate: 0.0915 }, { max: 150000, rate: 0.1116 }, { max: 220000, rate: 0.1216 }, { max: Infinity, rate: 0.1316 }], fedRates: true },
  QC: { name: "Quebec", rates: [{ max: 51780, rate: 0.14 }, { max: 103545, rate: 0.19 }, { max: 126000, rate: 0.24 }, { max: Infinity, rate: 0.2575 }], fedRates: true },
  NB: { name: "New Brunswick", rates: [{ max: 49958, rate: 0.094 }, { max: 99916, rate: 0.14 }, { max: 185064, rate: 0.16 }, { max: Infinity, rate: 0.195 }], fedRates: true },
  NS: { name: "Nova Scotia", rates: [{ max: 29590, rate: 0.0879 }, { max: 59180, rate: 0.1495 }, { max: 93000, rate: 0.1667 }, { max: 150000, rate: 0.175 }, { max: Infinity, rate: 0.21 }], fedRates: true },
  PE: { name: "Prince Edward Island", rates: [{ max: 32656, rate: 0.098 }, { max: 64313, rate: 0.138 }, { max: Infinity, rate: 0.167 }], fedRates: true },
  NL: { name: "Newfoundland", rates: [{ max: 43198, rate: 0.087 }, { max: 86395, rate: 0.145 }, { max: 154244, rate: 0.158 }, { max: 215943, rate: 0.178 }, { max: 275870, rate: 0.198 }, { max: 551739, rate: 0.208 }, { max: 1103478, rate: 0.213 }, { max: Infinity, rate: 0.218 }], fedRates: true },
  YT: { name: "Yukon", rates: [{ max: 55867, rate: 0.064 }, { max: 111733, rate: 0.09 }, { max: 173205, rate: 0.109 }, { max: 500000, rate: 0.128 }, { max: Infinity, rate: 0.15 }], fedRates: true },
  NT: { name: "Northwest Territories", rates: [{ max: 50597, rate: 0.059 }, { max: 101198, rate: 0.086 }, { max: 164525, rate: 0.122 }, { max: Infinity, rate: 0.1405 }], fedRates: true },
  NU: { name: "Nunavut", rates: [{ max: 53268, rate: 0.04 }, { max: 106537, rate: 0.07 }, { max: 173205, rate: 0.09 }, { max: Infinity, rate: 0.115 }], fedRates: true },
};
const FED_RATES = [{ max: 55867, rate: 0.15 }, { max: 111733, rate: 0.205 }, { max: 154906, rate: 0.26 }, { max: 220000, rate: 0.29 }, { max: Infinity, rate: 0.33 }];

function calcTax(income, province) {
  const prov = PROVINCES[province]; if (!prov) return { fed: 0, prov: 0, total: 0 };
  let fed = 0, pr = 0, rem = income;
  for (const b of FED_RATES) { const taxable = Math.min(rem, b.max - (FED_RATES[FED_RATES.indexOf(b) - 1]?.max || 0)); fed += taxable * b.rate; rem -= taxable; if (rem <= 0) break; }
  rem = income;
  for (const b of prov.rates) { const taxable = Math.min(rem, b.max - (prov.rates[prov.rates.indexOf(b) - 1]?.max || 0)); pr += taxable * b.rate; rem -= taxable; if (rem <= 0) break; }
  return { fed, prov: pr, total: fed + pr };
}

function y2c(gf) { if (!gf) return null; const [ex, sym] = gf.split(":"); if (!sym) return null; const s = sym.toUpperCase().replace(".H", "-H"); return ex.toUpperCase() === "CVE" ? s + ".V" : ex.toUpperCase() === "CNSX" ? s + ".CN" : ex.toUpperCase() === "TSE" ? s + ".TO" : s; }

// ─── DEFAULT DATA ────────────────────────────────────────────────────────────
const DD = {
  options: [
    { id: "o1", company: "Apex Critical Metals", gfTicker: "CNSX:APXC", amount: 150000, exercisePrice: 0.85, expiry: "2030-03-14", type: "Option", notes: "" },
    { id: "o2", company: "SWMBRD Sports", gfTicker: "CNSX:SWIM", amount: 50000, exercisePrice: 0.105, expiry: "2026-09-12", type: "Option", notes: "" },
    { id: "o3", company: "Zimtu Capital", gfTicker: "CVE:ZC", amount: 20000, exercisePrice: 1.125, expiry: "2026-06-10", type: "Option", notes: "" },
    { id: "o4", company: "Zimtu Capital", gfTicker: "CVE:ZC", amount: 8000, exercisePrice: 1.15, expiry: "2027-03-24", type: "Option", notes: "" },
    { id: "o5", company: "Core Silver Corp", gfTicker: "CNSX:CC", amount: 20000, exercisePrice: 0.61, expiry: "2029-07-21", type: "Option", notes: "" },
    { id: "o6", company: "Zimtu Capital", gfTicker: "CVE:ZC", amount: 50000, exercisePrice: 0, expiry: null, type: "RSU", notes: "Vest: Jul 29 2026", vestingDates: [{ date: "2026-07-29", pct: 100, amount: 50000 }] },
    { id: "o7", company: "Apex Critical Metals", gfTicker: "CNSX:APXC", amount: 50000, exercisePrice: 0, expiry: null, type: "RSU", notes: "25% quarterly from May 2026", vestingDates: [{ date: "2026-05-08", pct: 25, amount: 12500 }, { date: "2026-09-08", pct: 25, amount: 12500 }, { date: "2027-01-08", pct: 25, amount: 12500 }, { date: "2027-05-08", pct: 25, amount: 12500 }] },
    { id: "o8", company: "Apex Critical Metals", gfTicker: "CNSX:APXC", amount: 50000, exercisePrice: 1.97, expiry: "2030-09-08", type: "Option", notes: "" },
    { id: "o9", company: "Future Fuels Inc.", gfTicker: "CVE:FTUR", amount: 50000, exercisePrice: 1.2, expiry: "2028-10-20", type: "Option", notes: "" },
    { id: "o10", company: "Future Fuels Inc.", gfTicker: "CVE:FTUR", amount: 50000, exercisePrice: 0, expiry: null, type: "RSU", notes: "" },
    { id: "o11", company: "Zimtu Capital", gfTicker: "CVE:ZC", amount: 125000, exercisePrice: 0.14, expiry: "2030-07-15", type: "Option", notes: "" },
    { id: "o12", company: "Star Copper", gfTicker: "CNSX:STCU", amount: 50000, exercisePrice: 0.94, expiry: "2027-06-09", type: "Option", notes: "" },
    { id: "o13", company: "Core Silver Corp", gfTicker: "CNSX:CC", amount: 25000, exercisePrice: 0.81, expiry: "2030-01-14", type: "Option", notes: "" },
  ],
  stocks: [
    { id: "s1", company: "Apex Critical Metals", gfTicker: "CNSX:APXC", shares: 75000, costBasis: 0.10, broker: "Canaccord", notes: "", warrants: null },
    { id: "s2", company: "Brasnova Energy Materials", gfTicker: "CVE:BEM", shares: 2500, costBasis: 0.22, broker: "Canaccord", notes: "", warrants: { amount: 2500, exercise: 0.60, expiry: "2026-09-13" } },
    { id: "s3", company: "Blockchain Venture Capital", gfTicker: "CNSX:BVCI", shares: 1333, costBasis: 0.75, broker: "Canaccord", notes: "", warrants: { amount: 1333, exercise: 0.92, expiry: null } },
    { id: "s4", company: "Future Fuels Inc.", gfTicker: "CVE:FTUR", shares: 0, costBasis: 0.25, broker: "Canaccord", notes: "Warrants only", warrants: { amount: 10000, exercise: 0.40, expiry: "2026-12-19" } },
    { id: "s5", company: "Star Copper", gfTicker: "CNSX:STCU", shares: 10000, costBasis: 0.25, broker: "Canaccord", notes: "", warrants: { amount: 20000, exercise: 0.32, expiry: "2027-04-09" } },
    { id: "s6", company: "Discovery Energy Metals", gfTicker: "CNSX:DEMC", shares: 50000, costBasis: 0.10, broker: "Ventum", notes: "", warrants: { amount: 20000, exercise: 0.15, expiry: null } },
    { id: "s7", company: "Aeonian Resources", gfTicker: "CVE:ALTN", shares: 6000, costBasis: 0.05, broker: "Canaccord", notes: "", warrants: { amount: 6000, exercise: 0.10, expiry: null } },
    { id: "s8", company: "Guide AI Health", gfTicker: null, shares: 150000, costBasis: 0.05, broker: "Canaccord", notes: "No public ticker", warrants: null },
    { id: "s9", company: "Core Silver Corp", gfTicker: "CNSX:CC", shares: 40000, costBasis: 0.25, broker: "Canaccord", notes: "", warrants: { amount: 40000, exercise: 0.315, expiry: "2027-08-05" } },
    { id: "s10", company: "HM Exploration", gfTicker: "CNSX:HM", shares: 90909, costBasis: 0.11, broker: "Canaccord", notes: "", warrants: { amount: 45455, exercise: 0.16, expiry: "2028-11-15" } },
    { id: "s11", company: "Future Fuels Inc.", gfTicker: "CVE:FTUR", shares: 12500, costBasis: 0.40, broker: "Ventum", notes: "", warrants: { amount: 12500, exercise: 0.60, expiry: null } },
    { id: "s12", company: "Sceptre Ventures", gfTicker: "CVE:SVP-H", shares: 700, costBasis: 0, broker: "Ventum", notes: "", warrants: null },
    { id: "s13", company: "1490660 LTD", gfTicker: "CVE:SVP-H", shares: 50000, costBasis: 0.10, broker: "Canaccord", notes: "", warrants: { amount: 50000, exercise: 0.15, expiry: null } },
    { id: "s14", company: "Kiboko Gold", gfTicker: "CVE:KIB", shares: 62500, costBasis: 0.08, broker: "Ventum", notes: "", warrants: { amount: 62500, exercise: 0.12, expiry: null } },
  ],
  promissoryNotes: [
    { id: "p1", company: "SWMBRD Sports", gfTicker: "CNSX:SWIM", shares: 100000, costBasis: 0.035, notes: "" },
    { id: "p2", company: "Crown Minerals", gfTicker: null, shares: 1600000, costBasis: 0.02, notes: "Private" },
    { id: "p3", company: "Capacitor Metals", gfTicker: null, shares: 250000, costBasis: 0.02, notes: "Private" },
  ],
  assets: [
    { id: "a1", name: "Home", category: "Real Estate", value: 150000, notes: "Estimated equity" },
    { id: "a2", name: "Nevada Land", category: "Real Estate", value: 1000, notes: "" },
    { id: "a3", name: "Oregon Land", category: "Real Estate", value: 500, notes: "" },
    { id: "a4", name: "Addy Investments", category: "Investment", value: 1255, notes: "" },
    { id: "a5", name: "Cash (WealthSimple)", category: "Cash", value: 600, notes: "" },
    { id: "a6", name: "Stocks & Crypto (WS)", category: "Investment", value: 32000, notes: "" },
    { id: "a7", name: "Cash (Canaccord & Ventum)", category: "Cash", value: 1500, notes: "" },
    { id: "a8", name: "Cash (TD)", category: "Cash", value: 20000, notes: "" },
  ],
  liabilities: [{ id: "l1", name: "Credit Cards", category: "Debt", value: 0, notes: "" }],
  taxEvents: [
    { id: "t1", ticker: "APXC", year: 2025, sharesSold: 5000, soldPrice: 0.98, purchasePrice: 0.15, gain: 4150, taxOwed: 798.88 },
    { id: "t2", ticker: "APXC", year: 2025, sharesSold: 5000, soldPrice: 1.90, purchasePrice: 0.15, gain: 8750, taxOwed: 1684.38 },
    { id: "t3", ticker: "APXC", year: 2025, sharesSold: 5000, soldPrice: 3.40, purchasePrice: 0.15, gain: 16250, taxOwed: 3128.13 },
    { id: "t4", ticker: "APXC", year: 2025, sharesSold: 5000, soldPrice: 4.92, purchasePrice: 0.15, gain: 23850, taxOwed: 4591.13 },
  ],
  taxSettings: { province: "BC", annualIncome: 80000 },
};

const FP = { "CNSX:APXC": 2.23, "CNSX:SWIM": 0.01, "CVE:ZC": 0.58, "CNSX:CC": 0.48, "CVE:FTUR": 0.49, "CNSX:STCU": 1.05, "CVE:BEM": 0.13, "CNSX:BVCI": 0.20, "CNSX:DEMC": 0.13, "CVE:ALTN": 0.15, "CNSX:HM": 0.43, "CVE:SVP-H": 0.28, "CVE:KIB": 0.17 };

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function ld(k, f) { try { const r = localStorage.getItem(k); return r ? (JSON.parse(r) ?? f) : f; } catch { return f; } }
function $(v, c = "CAD", d = 2) { return new Intl.NumberFormat((CUR[c] || CUR.CAD).locale, { style: "currency", currency: c, minimumFractionDigits: d, maximumFractionDigits: d }).format(Number(v || 0)); }
function N(v, d = 0) { return new Intl.NumberFormat("en-CA", { minimumFractionDigits: d, maximumFractionDigits: d }).format(Number(v || 0)); }
function P(v) { const n = Number(v || 0); return `${n >= 0 ? "+" : ""}${N(n, 1)}%`; }
function gc(v, dk) { return v > 0 ? (dk ? "#34d399" : "#059669") : v < 0 ? (dk ? "#f87171" : "#dc2626") : (dk ? "#555" : "#aaa"); }
const CL = ["#6366f1","#f59e0b","#10b981","#ef4444","#8b5cf6","#ec4899","#14b8a6","#f97316","#06b6d4","#84cc16","#e879f9","#fb923c","#22d3ee","#a3e635"];
function dl(c, n, m) { const b = new Blob([c], { type: m }); const u = URL.createObjectURL(b); const a = document.createElement("a"); a.href = u; a.download = n; a.click(); URL.revokeObjectURL(u); }
function fmtDate(d) { if (!d) return "—"; try { const dt = new Date(d + "T00:00:00"); return dt.toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" }); } catch { return d; } }
const ICONS = { "Real Estate": Home, Cash: Wallet, Investment: TrendingUp, Vehicle: Car, Other: Package, Mortgage: Building2, Debt: CreditCard, Loan: Landmark };

function T(dk) {
  return dk
    ? { bg: "#0b0b16", s: "#141427", s2: "#1c1c34", bd: "#272748", fg: "#dfe1ec", fg2: "#f4f4f8", mt: "#7a7f9d", ib: "#1c1c34", ibd: "#33335a", acc: "#6366f1", gn: "#34d399", rd: "#f87171", dns: "rgba(220,38,38,0.12)", dnt: "#fca5a5", card: { background: "#141427", border: "1px solid #272748", borderRadius: 14 }, editBg: "#1c1c34" }
    : { bg: "#f0f1f5", s: "#fff", s2: "#f7f8fa", bd: "#e2e4ea", fg: "#1f2937", fg2: "#111827", mt: "#6b7280", ib: "#fff", ibd: "#d1d5db", acc: "#4f46e5", gn: "#059669", rd: "#dc2626", dns: "#fef2f2", dnt: "#991b1b", card: { background: "#fff", border: "1px solid #e2e4ea", borderRadius: 14 }, editBg: "#f9fafb" };
}

// ─── EDITABLE CELL ───────────────────────────────────────────────────────────
function EC({ value, onChange, editing, type = "text", step, style: sx }) {
  if (!editing) return <span style={sx}>{typeof value === "number" && type === "number" ? value : value || "—"}</span>;
  return <input style={{ height: 28, borderRadius: 6, border: `1px solid #6366f1`, background: "transparent", color: "inherit", padding: "0 6px", fontSize: 12, width: "100%", outline: "none", fontVariantNumeric: "tabular-nums", ...sx }} type={type} step={step} value={value ?? ""} onChange={e => onChange(type === "number" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value)} />;
}

// ─── PIE CHART WITH CLICK DETAIL ─────────────────────────────────────────────
function PieDetail({ data, dark, detail, onSelect }) {
  const [hov, setHov] = useState(null);
  const total = data.reduce((s, d) => s + d.value, 0);
  const t = T(dark);
  if (!data.length || total <= 0) return null;
  const sz = 150, cx = 75, cy = 75, r = 58;
  let cum = -Math.PI / 2;
  const sl = data.map((d, i) => {
    const a = (d.value / total) * 2 * Math.PI, sa = cum; cum += a;
    const x1 = cx + r * Math.cos(sa), y1 = cy + r * Math.sin(sa), x2 = cx + r * Math.cos(cum), y2 = cy + r * Math.sin(cum);
    return { p: `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${a > Math.PI ? 1 : 0} 1 ${x2} ${y2} Z`, c: CL[i % CL.length], l: d.label, pct: ((d.value / total) * 100).toFixed(1), i, val: d.value, items: d.items || [] };
  });
  const sel = sl.find(s => s.l === detail);
  return (
    <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
      <svg width={sz} height={sz} viewBox={`0 0 ${sz} ${sz}`} style={{ cursor: "pointer", flexShrink: 0 }}>
        {sl.map(s => <path key={s.i} d={s.p} fill={s.c} stroke={t.bg} strokeWidth={2} opacity={hov === null || hov === s.i ? 1 : 0.25} style={{ transition: "opacity .2s", transformOrigin: `${cx}px ${cy}px`, transform: (detail === s.l) ? "scale(1.03)" : "scale(1)" }} onMouseEnter={() => setHov(s.i)} onMouseLeave={() => setHov(null)} onClick={() => onSelect(s.l === detail ? null : s.l)} />)}
        <circle cx={cx} cy={cy} r={30} fill={t.s} />
        {(hov !== null || detail) && <text x={cx} y={cy + 4} textAnchor="middle" fill={t.fg} fontSize="12" fontWeight="700">{detail ? sl.find(s => s.l === detail)?.pct : sl[hov]?.pct}%</text>}
      </svg>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "3px 14px", fontSize: 11, flex: 1, minWidth: 180, alignContent: "flex-start" }}>
        {sl.slice(0, 14).map(s => (
          <div key={s.i} style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer", opacity: (!detail && hov === null) || hov === s.i || detail === s.l ? 1 : 0.3, fontWeight: detail === s.l ? 700 : 400, transition: "all .15s", width: "calc(50% - 7px)" }} onMouseEnter={() => setHov(s.i)} onMouseLeave={() => setHov(null)} onClick={() => onSelect(s.l === detail ? null : s.l)}>
            <span style={{ width: 7, height: 7, borderRadius: 2, background: s.c, flexShrink: 0 }} />
            <span style={{ color: t.fg, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.l}</span>
            <span style={{ color: t.mt, marginLeft: "auto", flexShrink: 0 }}>{s.pct}%</span>
          </div>
        ))}
      </div>
      {sel && (
        <div style={{ ...t.card, padding: 14, minWidth: 220, maxWidth: 300, flex: "0 0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: t.fg2 }}>{sel.l}</div>
            <button onClick={() => onSelect(null)} style={{ background: "none", border: "none", cursor: "pointer", color: t.mt, padding: 2 }}><X size={14} /></button>
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: sel.c, marginBottom: 2, fontVariantNumeric: "tabular-nums" }}>{$(sel.val)}</div>
          <div style={{ fontSize: 10, color: t.mt, marginBottom: 10 }}>{sel.pct}% of portfolio</div>
          {sel.items.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {sel.items.map((it, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, padding: "4px 0", borderBottom: `1px solid ${t.bd}` }}>
                  <div>
                    <div style={{ fontWeight: 600, color: t.fg }}>{it.label}</div>
                    <div style={{ color: t.mt, fontSize: 10 }}>{it.sub}</div>
                  </div>
                  <div style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                    <div style={{ fontWeight: 600, color: t.fg }}>{$(it.value)}</div>
                    {it.pnl !== undefined && <div style={{ color: gc(it.pnl, dark), fontWeight: 600, fontSize: 10 }}>{$(it.pnl)}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── LINE CHART ──────────────────────────────────────────────────────────────
function LineChart({ points, dark }) {
  const t = T(dark);
  if (points.length < 2) return <div style={{ color: t.mt, fontSize: 12, padding: 12 }}>Net worth snapshots daily when you open the app.</div>;
  const vals = points.map(p => p.value), minV = Math.min(...vals), maxV = Math.max(...vals), range = maxV - minV || 1;
  const W = 560, H = 160, pl = 65, pr = 10, pt = 10, pb = 24, cw = W - pl - pr, ch = H - pt - pb;
  const pts = points.map((p, i) => ({ x: pl + (i / (points.length - 1)) * cw, y: pt + ch - ((p.value - minV) / range) * ch, ...p }));
  const path = pts.map((p, i) => `${i ? "L" : "M"} ${p.x} ${p.y}`).join(" ");
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ maxWidth: W }}>
      {[0, 1, 2, 3].map(i => { const v = minV + (range * i) / 3, y = pt + ch - (i / 3) * ch; return <g key={i}><line x1={pl} x2={W - pr} y1={y} y2={y} stroke={t.bd} strokeWidth={0.5} /><text x={pl - 6} y={y + 3} textAnchor="end" fill={t.mt} fontSize="8">{$(v, "CAD", 0)}</text></g>; })}
      <defs><linearGradient id="ag" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={t.acc} stopOpacity={0.2} /><stop offset="100%" stopColor={t.acc} stopOpacity={0} /></linearGradient></defs>
      <path d={`${path} L ${pts.at(-1).x} ${pt + ch} L ${pts[0].x} ${pt + ch} Z`} fill="url(#ag)" />
      <path d={path} fill="none" stroke={t.acc} strokeWidth={2} strokeLinejoin="round" />
      {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={2.5} fill={t.acc} stroke={t.s} strokeWidth={1}><title>{p.date}: {$(p.value)}</title></circle>)}
    </svg>
  );
}

// ─── VESTING TIMELINE ────────────────────────────────────────────────────────
function Vesting({ events, dark }) {
  const t = T(dark), now = new Date().toISOString().split("T")[0];
  if (!events.length) return <div style={{ color: t.mt, fontSize: 12 }}>No vesting events.</div>;
  return (<div style={{ display: "flex", flexDirection: "column", gap: 0 }}>{events.map((e, i) => {
    const past = e.date < now;
    return (<div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", opacity: past ? 0.35 : 1 }}>
      <div style={{ width: 90, fontSize: 11, color: t.mt, fontWeight: 600, flexShrink: 0, paddingTop: 3 }}>{fmtDate(e.date)}</div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}><div style={{ width: 10, height: 10, borderRadius: "50%", background: past ? t.mt : t.acc }} />{i < events.length - 1 && <div style={{ width: 2, height: 30, background: t.bd }} />}</div>
      <div style={{ paddingBottom: 12 }}><div style={{ fontWeight: 600, fontSize: 12 }}>{e.company}</div><div style={{ fontSize: 11, color: t.mt }}>{N(e.amount)} shares · {$(e.currentValue)}{past ? " · Vested" : ""}</div></div>
    </div>);
  })}</div>);
}

// ─── EXCEL PARSER ────────────────────────────────────────────────────────────
let sj = false;
function loadSJ() { return new Promise(r => { if (sj || window.XLSX) { sj = true; r(); return; } const s = document.createElement("script"); s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"; s.onload = () => { sj = true; r(); }; document.head.appendChild(s); }); }
function parseXL(wb) {
  const res = { stocks: [], options: [], promissoryNotes: [] }, sheet = wb.Sheets[wb.SheetNames[0]]; if (!sheet) return res;
  const rows = window.XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null }); let sec = null;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i], a = String(row?.[0] || "").trim();
    if (a === "Options") { sec = "options"; continue; } if (a.startsWith("Stocks &")) { sec = "stocks"; continue; } if (a.startsWith("Promissory")) { sec = "promissory"; continue; }
    if (a.startsWith("Total") || a === "TOTAL" || a === "TAXES" || !a || a.startsWith("Stocks sold")) { if (a.startsWith("Stocks sold")) sec = null; continue; }
    let gf = null; const cell = sheet[window.XLSX.utils.encode_cell({ r: i, c: 4 })]; if (cell?.f) { const m = cell.f.match(/GOOGLEFINANCE\("([^"]+)"\)/i); if (m) gf = m[1]; }
    if (sec === "options") { const ex = Number(row[2]) || 0; res.options.push({ id: crypto.randomUUID(), company: a, gfTicker: gf, amount: Number(row[1]) || 0, exercisePrice: ex, expiry: row[6] ? dStr(row[6]) : null, type: !ex ? "RSU" : "Option", notes: "" }); }
    else if (sec === "stocks") { const wa = Number(row[7]) || 0; res.stocks.push({ id: crypto.randomUUID(), company: a, gfTicker: gf, shares: Number(row[1]) || 0, costBasis: Number(row[2]) || 0, broker: String(row[10] || ""), notes: "", warrants: wa > 0 ? { amount: wa, exercise: Number(row[8]) || 0, expiry: row[11] ? dStr(row[11]) : null } : null }); }
    else if (sec === "promissory") { res.promissoryNotes.push({ id: crypto.randomUUID(), company: a, gfTicker: gf, shares: Number(row[1]) || 0, costBasis: Number(row[2]) || 0, notes: "" }); }
  }
  return res;
}
function dStr(v) { if (!v) return null; if (typeof v === "number") return new Date((v - 25569) * 86400000).toISOString().split("T")[0]; return String(v).split("T")[0]; }

// ═════════════════════════════════════════════════════════════════════════════
// MAIN APP
// ═════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [data, setData] = useState(() => ld(SK, DD));
  const [settings, setSettings] = useState(() => ld(SSK, { currency: "CAD", dark: true, tab: "portfolio" }));
  const [prices, setPrices] = useState(() => ld(PK, FP));
  const [nwH, setNwH] = useState(() => ld(NK, []));
  const [pSt, setPSt] = useState("idle");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("totalValue");
  const [sortDir, setSortDir] = useState("desc");
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(null); // which section is being edited
  const [pieDetail, setPieDetail] = useState(null);
  const [taxCalc, setTaxCalc] = useState({ gains: "", income: String(data.taxSettings?.annualIncome || 80000), province: data.taxSettings?.province || "BC" });

  const dk = settings.dark, cur = settings.currency, tab = settings.tab || "portfolio";
  const t = T(dk);
  const upd = useCallback((k, v) => setSettings(p => ({ ...p, [k]: v })), []);
  const updData = useCallback((section, id, field, val) => {
    setData(p => ({ ...p, [section]: (p[section] || []).map(x => x.id === id ? { ...x, [field]: val } : x) }));
  }, []);
  const addItem = useCallback((section, item) => setData(p => ({ ...p, [section]: [...(p[section] || []), { id: crypto.randomUUID(), ...item }] })), []);
  const delItem = useCallback((section, id) => setData(p => ({ ...p, [section]: (p[section] || []).filter(x => x.id !== id) })), []);

  useEffect(() => { localStorage.setItem(SK, JSON.stringify(data)); }, [data]);
  useEffect(() => { localStorage.setItem(SSK, JSON.stringify(settings)); }, [settings]);
  useEffect(() => { localStorage.setItem(PK, JSON.stringify(prices)); }, [prices]);
  useEffect(() => { localStorage.setItem(NK, JSON.stringify(nwH)); }, [nwH]);

  const allTk = useMemo(() => { const s = new Set(); [...(data.options || []), ...(data.stocks || []), ...(data.promissoryNotes || [])].forEach(x => x.gfTicker && s.add(x.gfTicker.toUpperCase())); return [...s]; }, [data]);

  const fetchP = useCallback(async () => {
    setPSt("loading"); const u = { ...prices }; let ok = 0;
    for (const tk of allTk) { try { const yt = y2c(tk); if (!yt) continue; const r = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${yt}?range=1d&interval=1d`); if (!r.ok) continue; const d = await r.json(), p = d?.chart?.result?.[0]?.meta?.regularMarketPrice; if (p) { u[tk] = p; ok++; } } catch {} }
    setPrices(u); setPSt(ok > 0 ? "done" : "error");
  }, [allTk, prices]);

  useEffect(() => { fetchP(); }, []);

  const gp = useCallback(tk => !tk ? 0 : (prices[tk.toUpperCase()] || FP[tk.toUpperCase()] || 0), [prices]);

  // Enriched data
  const eS = useMemo(() => (data.stocks || []).map(s => { const p = gp(s.gfTicker), mv = s.shares * p, cost = s.shares * s.costBasis, pnl = mv - cost, pp = cost > 0 ? pnl / cost * 100 : 0; let wv = 0; if (s.warrants) wv = s.warrants.amount * Math.max(0, p - s.warrants.exercise); return { ...s, price: p, mv, cost, pnl, pp, wv, totalValue: mv + wv }; }), [data.stocks, gp]);
  const eO = useMemo(() => (data.options || []).map(o => { const p = gp(o.gfTicker), intr = o.type === "RSU" ? p : Math.max(0, p - o.exercisePrice), value = o.amount * intr; return { ...o, price: p, intrinsic: intr, value }; }), [data.options, gp]);
  const eN = useMemo(() => (data.promissoryNotes || []).map(n => { const p = gp(n.gfTicker), mv = n.shares * p, cost = n.shares * n.costBasis; return { ...n, price: p, mv, cost, pnl: mv - cost }; }), [data.promissoryNotes, gp]);
  const aT = useMemo(() => (data.assets || []).reduce((s, a) => s + Number(a.value || 0), 0), [data.assets]);
  const lT = useMemo(() => (data.liabilities || []).reduce((s, l) => s + Number(l.value || 0), 0), [data.liabilities]);

  const totals = useMemo(() => {
    const sv = eS.reduce((s, x) => s + x.totalValue, 0), ov = eO.reduce((s, x) => s + x.value, 0), nv = eN.reduce((s, x) => s + (x.price > 0 ? x.mv : x.cost), 0);
    const port = sv + ov + nv, nw = port + aT - lT, sc = eS.reduce((s, x) => s + x.cost, 0), nc = eN.reduce((s, x) => s + x.cost, 0), tc = sc + nc, tp = port - tc;
    return { sv, ov, nv, port, nw, aT, lT, tc, tp, pp: tc > 0 ? tp / tc * 100 : 0 };
  }, [eS, eO, eN, aT, lT]);

  // NW history
  useEffect(() => { if (!totals.nw) return; const today = new Date().toISOString().split("T")[0]; setNwH(p => { const last = p.at(-1); if (last?.date === today) return p.map(x => x.date === today ? { ...x, value: totals.nw } : x); return [...p, { date: today, value: totals.nw }].slice(-365); }); }, [totals.nw]);

  // Allocation with drill-down items
  const allocData = useMemo(() => {
    const m = {};
    eS.forEach(s => { if (!m[s.company]) m[s.company] = { value: 0, items: [] }; m[s.company].value += s.totalValue; m[s.company].items.push({ label: `${N(s.shares)} shares${s.warrants ? ` + ${N(s.warrants.amount)} warrants` : ""}`, sub: `${s.broker} · ${s.gfTicker || "N/A"}${s.warrants?.expiry ? ` · Exp ${fmtDate(s.warrants.expiry)}` : ""}`, value: s.totalValue, pnl: s.pnl }); });
    eO.forEach(o => { if (!m[o.company]) m[o.company] = { value: 0, items: [] }; m[o.company].value += o.value; m[o.company].items.push({ label: `${N(o.amount)} ${o.type}${o.exercisePrice ? ` @ ${$(o.exercisePrice, "CAD", 3)}` : ""}`, sub: o.expiry ? `Exp: ${fmtDate(o.expiry)}` : (o.notes || "RSU"), value: o.value }); });
    return Object.entries(m).filter(([, v]) => v.value > 0).sort((a, b) => b[1].value - a[1].value).map(([l, v]) => ({ label: l, value: v.value, items: v.items }));
  }, [eS, eO]);

  const vestE = useMemo(() => { const ev = []; (data.options || []).forEach(o => { (o.vestingDates || []).forEach(v => { ev.push({ date: v.date, company: o.company, amount: v.amount, currentValue: v.amount * gp(o.gfTicker) }); }); }); return ev.sort((a, b) => (a.date || "").localeCompare(b.date || "")); }, [data.options, gp]);

  const taxByYear = useMemo(() => {
    const m = {};
    (data.taxEvents || []).forEach(e => {
      const y = e.year || "Unknown";
      if (!m[y]) m[y] = { gains: 0, count: 0 };
      m[y].gains += Number(e.gain) || 0;
      m[y].count++;
    });
    return m;
  }, [data.taxEvents]);

  // Sort/filter
  const fsort = useCallback((items, keys) => { const q = search.trim().toLowerCase(); let l = items; if (q) l = items.filter(i => keys.some(k => String(i[k] || "").toLowerCase().includes(q))); return [...l].sort((a, b) => { const av = a[sortKey], bv = b[sortKey]; if (typeof av === "string") return sortDir === "asc" ? String(av || "").localeCompare(String(bv || "")) : String(bv || "").localeCompare(String(av || "")); return sortDir === "asc" ? (av || 0) - (bv || 0) : (bv || 0) - (av || 0); }); }, [search, sortKey, sortDir]);
  function ts(k) { if (sortKey === k) setSortDir(p => p === "asc" ? "desc" : "asc"); else { setSortKey(k); setSortDir("desc"); } }
  const ar = k => sortKey === k ? (sortDir === "asc" ? " ↑" : " ↓") : "";

  async function handleUpload(e) { const f = e.target.files?.[0]; if (!f) return; setUploading(true); try { await loadSJ(); const p = parseXL(window.XLSX.read(await f.arrayBuffer(), { type: "array" })); if (!p.stocks.length && !p.options.length) { alert("No positions found."); return; } if (window.confirm(`Found ${p.stocks.length} stocks, ${p.options.length} options, ${p.promissoryNotes.length} notes. Replace?`)) { setData(prev => ({ ...prev, ...p })); setTimeout(fetchP, 500); } } catch (err) { alert("Error: " + err.message); } finally { setUploading(false); e.target.value = ""; } }

  // Tax calculator
  const taxResult = useMemo(() => {
    const gains = Number(taxCalc.gains) || 0;
    const income = Number(taxCalc.income) || 0;
    const taxableGain = gains * 0.5; // 50% inclusion
    const totalIncome = income + taxableGain;
    const taxOnTotal = calcTax(totalIncome, taxCalc.province);
    const taxOnIncome = calcTax(income, taxCalc.province);
    const marginalTax = taxOnTotal.total - taxOnIncome.total;
    const effectiveRate = gains > 0 ? (marginalTax / gains * 100) : 0;
    return { taxableGain, marginalTax, effectiveRate, fedPortion: taxOnTotal.fed - taxOnIncome.fed, provPortion: taxOnTotal.prov - taxOnIncome.prov };
  }, [taxCalc]);

  // ─── STYLES ──────────────────────────────────────────────────────────────
  const _ = {
    page: { minHeight: "100vh", background: t.bg, color: t.fg, fontFamily: "'DM Sans',-apple-system,BlinkMacSystemFont,sans-serif", transition: "background .2s" },
    wrap: { maxWidth: 1480, margin: "0 auto", padding: "20px 20px 60px" },
    h1: { margin: 0, fontSize: 24, fontWeight: 800, color: t.fg2, letterSpacing: -0.5 },
    bar: { display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" },
    grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginBottom: 16 },
    panel: { ...t.card, padding: 18, marginBottom: 16 },
    st: { margin: 0, marginBottom: 12, fontSize: 14, fontWeight: 700, color: t.fg2, display: "flex", alignItems: "center", gap: 8 },
    inp: { height: 34, borderRadius: 8, border: `1px solid ${t.ibd}`, background: t.ib, color: t.fg, padding: "0 10px", fontSize: 12, outline: "none" },
    sel: { height: 34, borderRadius: 8, border: `1px solid ${t.ibd}`, background: t.ib, color: t.fg, padding: "0 8px", fontSize: 12, cursor: "pointer", outline: "none" },
    btn: (bg, fg, bd) => ({ height: 32, border: bd || "none", borderRadius: 8, padding: "0 11px", background: bg, color: fg, fontWeight: 600, fontSize: 11, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }),
    tab: on => ({ height: 32, border: "none", borderRadius: 8, padding: "0 12px", background: on ? t.acc : "transparent", color: on ? "#fff" : t.mt, fontWeight: 600, fontSize: 11, cursor: "pointer", transition: "all .15s", display: "inline-flex", alignItems: "center", gap: 5 }),
    th: { textAlign: "left", fontSize: 10, textTransform: "uppercase", letterSpacing: 0.4, color: t.mt, padding: "7px 6px", borderBottom: `1px solid ${t.bd}`, cursor: "pointer", userSelect: "none", fontWeight: 700 },
    td: { padding: "8px 6px", borderBottom: `1px solid ${dk ? "#1c1c34" : "#f0f2f5"}`, fontSize: 12, verticalAlign: "middle" },
    mn: { fontVariantNumeric: "tabular-nums" },
    badge: (bg, fg) => ({ display: "inline-block", padding: "1px 6px", borderRadius: 4, fontSize: 10, fontWeight: 600, background: bg, color: fg }),
    editBtn: { height: 30, border: `1px solid ${t.bd}`, borderRadius: 8, padding: "0 10px", background: t.s, color: t.fg, fontWeight: 600, fontSize: 11, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 },
    dot: c => ({ width: 7, height: 7, borderRadius: "50%", background: c, display: "inline-block" }),
  };

  const stC = pSt === "done" ? t.gn : pSt === "error" ? t.rd : pSt === "loading" ? t.acc : t.mt;
  const TABS = [["portfolio", "Portfolio", BarChart3], ["options", "Options", Briefcase], ["notes", "Notes", FileText], ["assets", "Assets", Home], ["tax", "Tax", Calculator], ["vesting", "Vesting", Calendar], ["networth", "Net Worth", PieIcon]];

  // Edit section toggle
  const isEd = sec => editing === sec;
  const toggleEd = sec => setEditing(prev => prev === sec ? null : sec);

  function SectionHeader({ title, icon: Icon, section, children }) {
    return (
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 8, flexWrap: "wrap" }}>
        <h2 style={_.st}>{Icon && <Icon size={16} style={{ color: t.acc }} />} {title}</h2>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {children}
          {section && (
            <button style={_.editBtn} onClick={() => toggleEd(section)}>
              {isEd(section) ? <><Check size={12} /> Done</> : <><Edit3 size={12} /> Edit</>}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={_.page}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <div style={_.wrap}>

        {/* HEADER */}
        <header style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 18, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: t.acc, display: "flex", alignItems: "center", justifyContent: "center" }}><TrendingUp size={18} color="#fff" /></div>
            <div><h1 style={_.h1}>Equity Tracker</h1><div style={{ color: t.mt, fontSize: 11, display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>{new Date().toLocaleDateString("en-CA", { month: "long", day: "numeric", year: "numeric" })}<span style={_.dot(stC)} />{pSt === "done" ? "Live" : pSt === "loading" ? "Fetching…" : "Cached"}</div></div>
          </div>
          <div style={_.bar}>
            <select style={_.sel} value={cur} onChange={e => upd("currency", e.target.value)}>{Object.keys(CUR).map(c => <option key={c}>{c}</option>)}</select>
            <button style={_.btn(dk ? "#272748" : "#e2e4ea", t.fg)} onClick={() => upd("dark", !dk)}>{dk ? <Sun size={14} /> : <Moon size={14} />}</button>
            <button style={_.btn(t.acc, "#fff")} onClick={fetchP}><RefreshCw size={12} /> Prices</button>
            <button style={_.btn(t.s, t.fg, `1px solid ${t.bd}`)} onClick={() => dl(JSON.stringify(data, null, 2), "equity.json", "application/json")}><Download size={12} /> JSON</button>
            <label style={{ ..._.btn(t.s, t.fg, `1px solid ${t.bd}`), cursor: "pointer" }}><Upload size={12} /> {uploading ? "…" : "Excel"}<input type="file" accept=".xlsx,.xls" onChange={handleUpload} style={{ display: "none" }} /></label>
          </div>
        </header>

        {/* TABS */}
        <div style={{ display: "flex", gap: 4, marginBottom: 14, flexWrap: "wrap" }}>
          {TABS.map(([k, l, Ic]) => <button key={k} style={_.tab(tab === k)} onClick={() => { upd("tab", k); setEditing(null); setPieDetail(null); }}><Ic size={13} /> {l}</button>)}
        </div>

        {/* ═══ PORTFOLIO ═══ */}
        {tab === "portfolio" && (<>
          <div style={_.grid}>
            <Cd dk={dk} icon={DollarSign} title="Portfolio" value={$(totals.port, cur)} />
            <Cd dk={dk} icon={TrendingUp} title="Stocks + Warrants" value={$(totals.sv, cur)} sub={`${eS.length} positions`} />
            <Cd dk={dk} icon={Briefcase} title="Options + RSUs" value={$(totals.ov, cur)} sub={`${eO.length} grants`} />
            <Cd dk={dk} icon={totals.tp >= 0 ? TrendingUp : TrendingDown} title="Unrealized P&L" value={$(totals.tp, cur)} sub={P(totals.pp)} color={gc(totals.tp, dk)} />
          </div>

          <div style={_.panel}>
            <SectionHeader title="Allocation" icon={PieIcon} />
            <PieDetail data={allocData} dark={dk} detail={pieDetail} onSelect={setPieDetail} />
          </div>

          <div style={_.panel}>
            <SectionHeader title="Stock Holdings" icon={BarChart3} section="stocks">
              <input style={{ ..._.inp, width: 200 }} value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" />
              {isEd("stocks") && <button style={_.btn(t.acc, "#fff")} onClick={() => addItem("stocks", { company: "New Position", gfTicker: "", shares: 0, costBasis: 0, broker: "", notes: "", warrants: null })}><Plus size={12} /> Add</button>}
            </SectionHeader>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1000 }}>
                <thead><tr>{[["company","Company"],["gfTicker","Ticker"],["shares","Shares"],["costBasis","Cost"],["price","Price"],["mv","Mkt Val"],["pnl","P&L"],["wv","Warrants"],["totalValue","Total"],["broker","Broker"]].map(([k,l]) => <th key={k} style={_.th} onClick={() => ts(k)}>{l}{ar(k)}</th>)}<th style={_.th}>%</th>{isEd("stocks") && <th style={_.th}></th>}</tr></thead>
                <tbody>{fsort(eS, ["company","gfTicker","broker"]).map(s => {
                  const al = totals.port > 0 ? s.totalValue / totals.port * 100 : 0, ed = isEd("stocks");
                  return (<tr key={s.id} style={{ background: ed ? t.editBg : "transparent" }}>
                    <td style={_.td}><EC editing={ed} value={s.company} onChange={v => updData("stocks", s.id, "company", v)} style={{ fontWeight: 600 }} /></td>
                    <td style={{ ..._.td, fontSize: 11 }}><EC editing={ed} value={s.gfTicker} onChange={v => updData("stocks", s.id, "gfTicker", v)} /></td>
                    <td style={{ ..._.td, ..._.mn }}><EC editing={ed} value={s.shares} type="number" onChange={v => updData("stocks", s.id, "shares", v)} /></td>
                    <td style={{ ..._.td, ..._.mn }}>{ed ? <EC editing value={s.costBasis} type="number" step="0.0001" onChange={v => updData("stocks", s.id, "costBasis", v)} /> : $(s.costBasis, "CAD", 3)}</td>
                    <td style={{ ..._.td, ..._.mn, fontWeight: 600 }}>{$(s.price, "CAD", 3)}</td>
                    <td style={{ ..._.td, ..._.mn, fontWeight: 600 }}>{$(s.mv)}</td>
                    <td style={{ ..._.td, ..._.mn, fontWeight: 600, color: gc(s.pnl, dk) }}>{$(s.pnl)}<div style={{ fontSize: 10, color: t.mt }}>{P(s.pp)}</div></td>
                    <td style={{ ..._.td, ..._.mn }}>{s.wv > 0 ? $(s.wv) : "—"}{s.warrants && <div style={{ fontSize: 10, color: t.mt }}>{N(s.warrants.amount)}@{s.warrants.exercise}</div>}</td>
                    <td style={{ ..._.td, ..._.mn, fontWeight: 700 }}>{$(s.totalValue)}</td>
                    <td style={_.td}><EC editing={ed} value={s.broker} onChange={v => updData("stocks", s.id, "broker", v)} /></td>
                    <td style={{ ..._.td, ..._.mn, fontWeight: 600 }}>{N(al, 1)}%</td>
                    {ed && <td style={_.td}><button onClick={() => delItem("stocks", s.id)} style={{ background: "none", border: "none", cursor: "pointer", color: t.rd, padding: 2 }}><Trash2 size={13} /></button></td>}
                  </tr>);
                })}</tbody>
              </table>
            </div>
          </div>
        </>)}

        {/* ═══ OPTIONS ═══ */}
        {tab === "options" && (<div style={_.panel}>
          <SectionHeader title="Options & RSUs" icon={Briefcase} section="options">
            {isEd("options") && <button style={_.btn(t.acc, "#fff")} onClick={() => addItem("options", { company: "New Grant", gfTicker: "", amount: 0, exercisePrice: 0, expiry: null, type: "Option", notes: "" })}><Plus size={12} /> Add</button>}
          </SectionHeader>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 880 }}>
              <thead><tr>{[["company","Company"],["type","Type"],["gfTicker","Ticker"],["amount","Amount"],["exercisePrice","Strike"],["price","Price"],["intrinsic","Intrinsic"],["value","Value"],["expiry","Expiry"]].map(([k,l]) => <th key={k} style={_.th} onClick={() => ts(k)}>{l}{ar(k)}</th>)}{isEd("options") && <th style={_.th}></th>}</tr></thead>
              <tbody>{fsort(eO, ["company","gfTicker","type"]).map(o => { const exp = o.expiry && new Date(o.expiry) < new Date(), ed = isEd("options"); return (
                <tr key={o.id} style={{ opacity: exp ? 0.35 : 1, background: ed ? t.editBg : "transparent" }}>
                  <td style={_.td}><EC editing={ed} value={o.company} onChange={v => updData("options", o.id, "company", v)} style={{ fontWeight: 600 }} />{!ed && o.notes && <div style={{ fontSize: 10, color: t.mt }}>{o.notes}</div>}</td>
                  <td style={_.td}>{ed ? <select style={{ ..._.sel, height: 28, fontSize: 11 }} value={o.type} onChange={e => updData("options", o.id, "type", e.target.value)}><option>Option</option><option>RSU</option></select> : <span style={_.badge(o.type === "RSU" ? (dk ? "#1e3a5f" : "#dbeafe") : (dk ? "#2d2d4a" : "#f3f4f6"), o.type === "RSU" ? (dk ? "#93c5fd" : "#2563eb") : t.fg)}>{o.type}</span>}</td>
                  <td style={{ ..._.td, fontSize: 11 }}><EC editing={ed} value={o.gfTicker} onChange={v => updData("options", o.id, "gfTicker", v)} /></td>
                  <td style={{ ..._.td, ..._.mn }}><EC editing={ed} value={o.amount} type="number" onChange={v => updData("options", o.id, "amount", v)} /></td>
                  <td style={{ ..._.td, ..._.mn }}>{ed ? <EC editing value={o.exercisePrice} type="number" step="0.001" onChange={v => updData("options", o.id, "exercisePrice", v)} /> : o.type === "RSU" ? "—" : $(o.exercisePrice, "CAD", 3)}</td>
                  <td style={{ ..._.td, ..._.mn, fontWeight: 600 }}>{$(o.price, "CAD", 3)}</td>
                  <td style={{ ..._.td, ..._.mn, color: o.intrinsic > 0 ? t.gn : t.mt }}>{$(o.intrinsic, "CAD", 3)}</td>
                  <td style={{ ..._.td, ..._.mn, fontWeight: 700, color: gc(o.value, dk) }}>{$(o.value)}</td>
                  <td style={_.td}>{ed ? <EC editing value={o.expiry || ""} onChange={v => updData("options", o.id, "expiry", v || null)} /> : <>{o.expiry ? fmtDate(o.expiry) : "—"}{exp && <span style={{ ..._.badge(t.dns, t.dnt), marginLeft: 4 }}>Exp</span>}{!exp && o.exercisePrice > 0 && o.price > o.exercisePrice && <span style={{ ..._.badge(dk?"#064e3b":"#d1fae5", dk?"#6ee7b7":"#047857"), marginLeft: 4 }}>ITM</span>}</>}</td>
                  {ed && <td style={_.td}><button onClick={() => delItem("options", o.id)} style={{ background: "none", border: "none", cursor: "pointer", color: t.rd }}><Trash2 size={13} /></button></td>}
                </tr>); })}</tbody>
            </table>
          </div>
        </div>)}

        {/* ═══ NOTES ═══ */}
        {tab === "notes" && (<div style={_.panel}>
          <SectionHeader title="Promissory Notes" icon={FileText} section="promissoryNotes">
            {isEd("promissoryNotes") && <button style={_.btn(t.acc, "#fff")} onClick={() => addItem("promissoryNotes", { company: "New Note", gfTicker: "", shares: 0, costBasis: 0, notes: "" })}><Plus size={12} /> Add</button>}
          </SectionHeader>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr>{[["company","Company"],["gfTicker","Ticker"],["shares","Shares"],["costBasis","Cost"],["price","Price"],["mv","Value"],["pnl","P&L"]].map(([k,l]) => <th key={k} style={_.th} onClick={() => ts(k)}>{l}{ar(k)}</th>)}{isEd("promissoryNotes") && <th style={_.th}></th>}</tr></thead>
              <tbody>{fsort(eN, ["company","gfTicker"]).map(n => { const ed = isEd("promissoryNotes"); return (
                <tr key={n.id} style={{ background: ed ? t.editBg : "transparent" }}>
                  <td style={{ ..._.td, fontWeight: 600 }}><EC editing={ed} value={n.company} onChange={v => updData("promissoryNotes", n.id, "company", v)} /></td>
                  <td style={{ ..._.td, fontSize: 11 }}><EC editing={ed} value={n.gfTicker} onChange={v => updData("promissoryNotes", n.id, "gfTicker", v)} /></td>
                  <td style={{ ..._.td, ..._.mn }}><EC editing={ed} value={n.shares} type="number" onChange={v => updData("promissoryNotes", n.id, "shares", v)} /></td>
                  <td style={{ ..._.td, ..._.mn }}>{ed ? <EC editing value={n.costBasis} type="number" step="0.001" onChange={v => updData("promissoryNotes", n.id, "costBasis", v)} /> : $(n.costBasis, "CAD", 3)}</td>
                  <td style={{ ..._.td, ..._.mn }}>{n.price > 0 ? $(n.price, "CAD", 3) : "—"}</td>
                  <td style={{ ..._.td, ..._.mn, fontWeight: 600 }}>{n.price > 0 ? $(n.mv) : $(n.cost)}</td>
                  <td style={{ ..._.td, ..._.mn, fontWeight: 600, color: gc(n.pnl, dk) }}>{n.price > 0 ? $(n.pnl) : "—"}</td>
                  {ed && <td style={_.td}><button onClick={() => delItem("promissoryNotes", n.id)} style={{ background: "none", border: "none", cursor: "pointer", color: t.rd }}><Trash2 size={13} /></button></td>}
                </tr>); })}</tbody>
            </table>
          </div>
        </div>)}

        {/* ═══ ASSETS ═══ */}
        {tab === "assets" && (<>
          <div style={_.grid}>
            <Cd dk={dk} icon={Home} title="Assets" value={$(aT, cur)} sub={`${(data.assets||[]).length} items`} />
            <Cd dk={dk} icon={CreditCard} title="Liabilities" value={$(lT, cur)} color={lT > 0 ? t.rd : undefined} />
            <Cd dk={dk} icon={Coins} title="Net (excl. portfolio)" value={$(aT - lT, cur)} />
          </div>
          <div style={_.panel}>
            <SectionHeader title="Assets" icon={Home} section="assets">
              {isEd("assets") && <button style={_.btn(t.acc, "#fff")} onClick={() => addItem("assets", { name: "New Asset", category: "Cash", value: 0, notes: "" })}><Plus size={12} /> Add</button>}
            </SectionHeader>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr>{["","Name","Category","Value","Notes"].map(h => <th key={h} style={_.th}>{h}</th>)}{isEd("assets") && <th style={_.th}></th>}</tr></thead>
              <tbody>{(data.assets || []).map(a => { const ed = isEd("assets"), Ic = ICONS[a.category] || Package; return (
                <tr key={a.id} style={{ background: ed ? t.editBg : "transparent" }}>
                  <td style={{ ..._.td, width: 30 }}><Ic size={15} style={{ color: t.acc }} /></td>
                  <td style={{ ..._.td, fontWeight: 600 }}><EC editing={ed} value={a.name} onChange={v => updData("assets", a.id, "name", v)} /></td>
                  <td style={_.td}>{ed ? <select style={{ ..._.sel, height: 28, fontSize: 11 }} value={a.category} onChange={e => updData("assets", a.id, "category", e.target.value)}>{["Real Estate","Cash","Investment","Vehicle","Other"].map(c => <option key={c}>{c}</option>)}</select> : <span style={_.badge(dk ? "#2d2d4a" : "#f3f4f6", t.fg)}>{a.category}</span>}</td>
                  <td style={{ ..._.td, ..._.mn, fontWeight: 600 }}>{ed ? <EC editing value={a.value} type="number" onChange={v => updData("assets", a.id, "value", v)} /> : $(a.value, cur)}</td>
                  <td style={{ ..._.td, color: t.mt, fontSize: 11 }}><EC editing={ed} value={a.notes} onChange={v => updData("assets", a.id, "notes", v)} /></td>
                  {ed && <td style={_.td}><button onClick={() => delItem("assets", a.id)} style={{ background: "none", border: "none", cursor: "pointer", color: t.rd }}><Trash2 size={13} /></button></td>}
                </tr>); })}</tbody>
            </table>
          </div>
          <div style={_.panel}>
            <SectionHeader title="Liabilities" icon={CreditCard} section="liabilities">
              {isEd("liabilities") && <button style={_.btn(t.acc, "#fff")} onClick={() => addItem("liabilities", { name: "New Liability", category: "Debt", value: 0, notes: "" })}><Plus size={12} /> Add</button>}
            </SectionHeader>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr>{["","Name","Category","Amount","Notes"].map(h => <th key={h} style={_.th}>{h}</th>)}{isEd("liabilities") && <th style={_.th}></th>}</tr></thead>
              <tbody>{(data.liabilities || []).map(l => { const ed = isEd("liabilities"), Ic = ICONS[l.category] || CreditCard; return (
                <tr key={l.id} style={{ background: ed ? t.editBg : "transparent" }}>
                  <td style={{ ..._.td, width: 30 }}><Ic size={15} style={{ color: t.rd }} /></td>
                  <td style={{ ..._.td, fontWeight: 600 }}><EC editing={ed} value={l.name} onChange={v => updData("liabilities", l.id, "name", v)} /></td>
                  <td style={_.td}>{ed ? <select style={{ ..._.sel, height: 28, fontSize: 11 }} value={l.category} onChange={e => updData("liabilities", l.id, "category", e.target.value)}>{["Mortgage","Debt","Loan","Other"].map(c => <option key={c}>{c}</option>)}</select> : <span style={_.badge(dk ? "#2d2d4a" : "#f3f4f6", t.fg)}>{l.category}</span>}</td>
                  <td style={{ ..._.td, ..._.mn, fontWeight: 600, color: t.rd }}>{ed ? <EC editing value={l.value} type="number" onChange={v => updData("liabilities", l.id, "value", v)} /> : $(l.value, cur)}</td>
                  <td style={{ ..._.td, color: t.mt, fontSize: 11 }}><EC editing={ed} value={l.notes} onChange={v => updData("liabilities", l.id, "notes", v)} /></td>
                  {ed && <td style={_.td}><button onClick={() => delItem("liabilities", l.id)} style={{ background: "none", border: "none", cursor: "pointer", color: t.rd }}><Trash2 size={13} /></button></td>}
                </tr>); })}</tbody>
            </table>
          </div>
        </>)}

        {/* ═══ TAX ═══ */}
        {tab === "tax" && (<>
          <div style={_.panel}>
            <SectionHeader title="Capital Gains Tax Calculator" icon={Calculator} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginBottom: 16 }}>
              <div><div style={{ fontSize: 10, color: t.mt, fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>Province</div><select style={{ ..._.sel, width: "100%" }} value={taxCalc.province} onChange={e => setTaxCalc(p => ({ ...p, province: e.target.value }))}>{Object.entries(PROVINCES).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}</select></div>
              <div><div style={{ fontSize: 10, color: t.mt, fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>Annual Income ($)</div><input style={{ ..._.inp, width: "100%" }} type="number" value={taxCalc.income} onChange={e => setTaxCalc(p => ({ ...p, income: e.target.value }))} /></div>
              <div><div style={{ fontSize: 10, color: t.mt, fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>Capital Gains ($)</div><input style={{ ..._.inp, width: "100%" }} type="number" value={taxCalc.gains} onChange={e => setTaxCalc(p => ({ ...p, gains: e.target.value }))} placeholder="Enter total gains" /></div>
            </div>
            {Number(taxCalc.gains) > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
                <Cd dk={dk} icon={Calculator} title="Taxable Amount" value={$(taxResult.taxableGain)} sub="50% inclusion" />
                <Cd dk={dk} icon={DollarSign} title="Federal Tax" value={$(taxResult.fedPortion)} />
                <Cd dk={dk} icon={Landmark} title="Provincial Tax" value={$(taxResult.provPortion)} sub={PROVINCES[taxCalc.province]?.name} />
                <Cd dk={dk} icon={CreditCard} title="Total Tax" value={$(taxResult.marginalTax)} sub={`Effective: ${N(taxResult.effectiveRate, 1)}%`} color={t.rd} />
              </div>
            )}
            <div style={{ fontSize: 10, color: t.mt, marginTop: 10 }}>Estimate only — uses 50% capital gains inclusion rate. Consult a tax professional.</div>
          </div>

          {/* Yearly Realized Gains Summary */}
          {Object.keys(taxByYear).length > 0 && (
            <div style={_.panel}>
              <SectionHeader title="Realized Gains by Year" icon={BarChart3} />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
                {Object.entries(taxByYear).map(([year, d]) => (
                  <div key={year} style={{ ...t.card, padding: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: t.fg2 }}>{year}</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: t.gn, fontVariantNumeric: "tabular-nums", marginTop: 2 }}>{$(d.gains)} gains</div>
                      <div style={{ fontSize: 11, color: t.mt }}>{d.count} transaction{d.count !== 1 ? "s" : ""}</div>
                    </div>
                    <button style={_.btn(t.acc, "#fff")} onClick={() => setTaxCalc(p => ({ ...p, gains: String(d.gains) }))}>
                      <ChevronRight size={12} /> Use in calculator
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={_.panel}>
            <SectionHeader title="Realized Gains" icon={FileText} section="taxEvents">
              {isEd("taxEvents") && <button style={_.btn(t.acc, "#fff")} onClick={() => addItem("taxEvents", { ticker: "", year: 2026, sharesSold: 0, soldPrice: 0, purchasePrice: 0, gain: 0, taxOwed: 0 })}><Plus size={12} /> Add</button>}
            </SectionHeader>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr>{["Year","Ticker","Shares","Sold @","Bought @","Gain","Est. Tax"].map(h => <th key={h} style={_.th}>{h}</th>)}{isEd("taxEvents") && <th style={_.th}></th>}</tr></thead>
              <tbody>{(data.taxEvents || []).map(e => { const ed = isEd("taxEvents"); return (
                <tr key={e.id} style={{ background: ed ? t.editBg : "transparent" }}>
                  <td style={{ ..._.td, fontWeight: 600 }}><EC editing={ed} value={e.year} type="number" onChange={v => updData("taxEvents", e.id, "year", v)} /></td>
                  <td style={{ ..._.td, fontWeight: 600 }}><EC editing={ed} value={e.ticker} onChange={v => updData("taxEvents", e.id, "ticker", v?.toUpperCase())} /></td>
                  <td style={{ ..._.td, ..._.mn }}><EC editing={ed} value={e.sharesSold} type="number" onChange={v => { updData("taxEvents", e.id, "sharesSold", v); const g = v * (e.soldPrice - e.purchasePrice); updData("taxEvents", e.id, "gain", g); }} /></td>
                  <td style={{ ..._.td, ..._.mn }}>{ed ? <EC editing value={e.soldPrice} type="number" step="0.01" onChange={v => { updData("taxEvents", e.id, "soldPrice", v); updData("taxEvents", e.id, "gain", e.sharesSold * (v - e.purchasePrice)); }} /> : $(e.soldPrice)}</td>
                  <td style={{ ..._.td, ..._.mn }}>{ed ? <EC editing value={e.purchasePrice} type="number" step="0.01" onChange={v => { updData("taxEvents", e.id, "purchasePrice", v); updData("taxEvents", e.id, "gain", e.sharesSold * (e.soldPrice - v)); }} /> : $(e.purchasePrice)}</td>
                  <td style={{ ..._.td, ..._.mn, fontWeight: 600, color: t.gn }}>{$(e.gain)}</td>
                  <td style={{ ..._.td, ..._.mn, color: t.rd }}>{$(e.taxOwed)}</td>
                  {ed && <td style={_.td}><button onClick={() => delItem("taxEvents", e.id)} style={{ background: "none", border: "none", cursor: "pointer", color: t.rd }}><Trash2 size={13} /></button></td>}
                </tr>); })}</tbody>
            </table>
          </div>
        </>)}

        {/* ═══ VESTING ═══ */}
        {tab === "vesting" && (<>
          <div style={_.grid}><Cd dk={dk} icon={Calendar} title="Upcoming Vesting" value={$(vestE.filter(e => e.date >= new Date().toISOString().split("T")[0]).reduce((s, e) => s + e.currentValue, 0))} sub={`${vestE.filter(e => e.date >= new Date().toISOString().split("T")[0]).length} events`} /></div>
          <div style={_.panel}><SectionHeader title="Vesting Schedule" icon={Calendar} /><Vesting events={vestE} dark={dk} /></div>
        </>)}

        {/* ═══ NET WORTH ═══ */}
        {tab === "networth" && (<>
          <div style={_.grid}>
            <Cd dk={dk} icon={Coins} title="Net Worth" value={$(totals.nw, cur)} />
            <Cd dk={dk} icon={BarChart3} title="Portfolio" value={$(totals.port, cur)} />
            <Cd dk={dk} icon={Home} title="Other Assets" value={$(aT, cur)} />
            <Cd dk={dk} icon={CreditCard} title="Liabilities" value={$(lT, cur)} color={lT > 0 ? t.rd : undefined} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
            <div style={_.panel}><h2 style={_.st}><PieIcon size={15} style={{ color: t.acc }} /> Breakdown</h2><PieDetail data={[
              ...(totals.sv > 0 ? [{ label: "Stocks + Warrants", value: totals.sv, items: [] }] : []),
              ...(totals.ov > 0 ? [{ label: "Options + RSUs", value: totals.ov, items: [] }] : []),
              ...(data.assets || []).filter(a => a.value > 0).map(a => ({ label: a.name, value: a.value, items: [] })),
            ]} dark={dk} detail={pieDetail} onSelect={setPieDetail} /></div>
            <div style={_.panel}><h2 style={_.st}><TrendingUp size={15} style={{ color: t.acc }} /> History</h2><LineChart points={nwH} dark={dk} /></div>
          </div>
        </>)}

        <div style={{ textAlign: "center", color: t.mt, fontSize: 10, marginTop: 16 }}>Prices via Yahoo Finance · All values {cur}</div>
      </div>
    </div>
  );
}

function Cd({ dk, icon: Icon, title, value, sub, color }) {
  const t = T(dk);
  return (<div style={{ ...t.card, padding: 14, display: "flex", gap: 12, alignItems: "flex-start" }}>
    {Icon && <div style={{ width: 32, height: 32, borderRadius: 8, background: dk ? "#1c1c34" : "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon size={16} style={{ color: color || t.acc }} /></div>}
    <div><div style={{ color: t.mt, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 3 }}>{title}</div><div style={{ fontSize: 18, fontWeight: 700, color: color || t.fg2, fontVariantNumeric: "tabular-nums" }}>{value}</div>{sub && <div style={{ marginTop: 1, fontSize: 11, color: color || t.mt, fontWeight: 600 }}>{sub}</div>}</div>
  </div>);
}
