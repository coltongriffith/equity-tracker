import React, { useEffect, useMemo, useState, useCallback } from "react";

// ─── CONSTANTS ───────────────────────────────────────────────────────────────
const STORAGE_KEY = "equity-tracker-data-v3";
const SETTINGS_KEY = "equity-tracker-settings-v3";
const PRICE_CACHE_KEY = "equity-tracker-prices-v3";
const NW_HISTORY_KEY = "equity-tracker-nw-history";

const CURRENCIES = { CAD: { locale: "en-CA", rate: 1 }, USD: { locale: "en-US", rate: 0.74 }, AUD: { locale: "en-AU", rate: 1.13 }, GBP: { locale: "en-GB", rate: 0.58 }, EUR: { locale: "de-DE", rate: 0.68 } };

function convertToYahoo(gf) { if (!gf) return null; const [ex, sym] = gf.split(":"); if (!sym) return null; const s = sym.toUpperCase().replace(".H", "-H"); switch (ex.toUpperCase()) { case "CVE": return s + ".V"; case "CNSX": return s + ".CN"; case "TSE": return s + ".TO"; default: return s; } }

// ─── DEFAULT DATA (from spreadsheet) ─────────────────────────────────────────
const DEFAULT_DATA = {
  options: [
    { id: "o1", company: "Apex Critical Metals", gfTicker: "CNSX:APXC", amount: 150000, exercisePrice: 0.85, expiry: "2030-03-14", type: "Option", notes: "" },
    { id: "o2", company: "SWMBRD Sports", gfTicker: "CNSX:SWIM", amount: 50000, exercisePrice: 0.105, expiry: "2026-09-12", type: "Option", notes: "" },
    { id: "o3", company: "Zimtu Capital", gfTicker: "CVE:ZC", amount: 20000, exercisePrice: 1.125, expiry: "2026-06-10", type: "Option", notes: "" },
    { id: "o4", company: "Zimtu Capital", gfTicker: "CVE:ZC", amount: 8000, exercisePrice: 1.15, expiry: "2027-03-24", type: "Option", notes: "" },
    { id: "o5", company: "Core Silver Corp", gfTicker: "CNSX:CC", amount: 20000, exercisePrice: 0.61, expiry: "2029-07-21", type: "Option", notes: "" },
    { id: "o6", company: "Zimtu Capital", gfTicker: "CVE:ZC", amount: 50000, exercisePrice: 0, expiry: null, type: "RSU", notes: "Grant: Jul 15 2025 · Vest: Jul 29 2026", vestingDates: [{ date: "2026-07-29", pct: 100, amount: 50000 }] },
    { id: "o7", company: "Apex Critical Metals", gfTicker: "CNSX:APXC", amount: 50000, exercisePrice: 0, expiry: null, type: "RSU", notes: "Grant: Sep 8 2025 · 25% quarterly", vestingDates: [{ date: "2026-05-08", pct: 25, amount: 12500 }, { date: "2026-09-08", pct: 25, amount: 12500 }, { date: "2027-01-08", pct: 25, amount: 12500 }, { date: "2027-05-08", pct: 25, amount: 12500 }] },
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
  liabilities: [
    { id: "l1", name: "Credit Cards", category: "Debt", value: 0, notes: "" },
  ],
  taxEvents: [
    { id: "t1", ticker: "APXC", year: 2025, sharesSold: 5000, soldPrice: 0.98, purchasePrice: 0.15, gain: 4150, taxOwed: 798.88 },
    { id: "t2", ticker: "APXC", year: 2025, sharesSold: 5000, soldPrice: 1.90, purchasePrice: 0.15, gain: 8750, taxOwed: 1684.38 },
    { id: "t3", ticker: "APXC", year: 2025, sharesSold: 5000, soldPrice: 3.40, purchasePrice: 0.15, gain: 16250, taxOwed: 3128.13 },
    { id: "t4", ticker: "APXC", year: 2025, sharesSold: 5000, soldPrice: 4.92, purchasePrice: 0.15, gain: 23850, taxOwed: 4591.13 },
  ],
};

const FALLBACK_PRICES = { "CNSX:APXC": 2.23, "CNSX:SWIM": 0.01, "CVE:ZC": 0.58, "CNSX:CC": 0.48, "CVE:FTUR": 0.49, "CNSX:STCU": 1.05, "CVE:BEM": 0.13, "CNSX:BVCI": 0.20, "CNSX:DEMC": 0.13, "CVE:ALTN": 0.15, "CNSX:HM": 0.43, "CVE:SVP-H": 0.28, "CVE:KIB": 0.17 };

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function ld(k, fb) { try { const r = localStorage.getItem(k); return r ? (JSON.parse(r) ?? fb) : fb; } catch { return fb; } }
function fmt(v, c = "CAD", d = 2) { const x = CURRENCIES[c] || CURRENCIES.CAD; return new Intl.NumberFormat(x.locale, { style: "currency", currency: c, minimumFractionDigits: d, maximumFractionDigits: d }).format(Number(v || 0)); }
function num(v, d = 0) { return new Intl.NumberFormat("en-CA", { minimumFractionDigits: d, maximumFractionDigits: d }).format(Number(v || 0)); }
function pf(v) { const n = Number(v || 0); return `${n >= 0 ? "+" : ""}${num(n, 1)}%`; }
function pc(v, dk) { return v > 0 ? (dk ? "#34d399" : "#059669") : v < 0 ? (dk ? "#f87171" : "#dc2626") : (dk ? "#6b7280" : "#9ca3af"); }
const CL = ["#6366f1","#f59e0b","#10b981","#ef4444","#8b5cf6","#ec4899","#14b8a6","#f97316","#06b6d4","#84cc16","#e879f9","#fb923c"];
function dlFile(c, n, m) { const b = new Blob([c], { type: m }); const u = URL.createObjectURL(b); const a = document.createElement("a"); a.href = u; a.download = n; a.click(); URL.revokeObjectURL(u); }
function dateStr(d) { return typeof d === "number" ? new Date((d - 25569) * 86400000).toISOString().split("T")[0] : d instanceof Date ? d.toISOString().split("T")[0] : String(d || "").split("T")[0]; }

function T(dk) {
  return dk ? { bg: "#0c0c18", s: "#161628", s2: "#1e1e36", bd: "#2a2a48", fg: "#e0e2eb", fg2: "#f4f4f8", mt: "#7c82a1", ib: "#1e1e36", ibd: "#33335a", acc: "#6366f1", gn: "#34d399", rd: "#f87171", dns: "rgba(220,38,38,0.15)", dnt: "#fca5a5", card: { background: "#161628", border: "1px solid #2a2a48", borderRadius: 12 } }
    : { bg: "#f0f1f5", s: "#ffffff", s2: "#f9fafb", bd: "#e2e4ea", fg: "#1f2937", fg2: "#111827", mt: "#6b7280", ib: "#fff", ibd: "#d1d5db", acc: "#4f46e5", gn: "#059669", rd: "#dc2626", dns: "#fee2e2", dnt: "#991b1b", card: { background: "#fff", border: "1px solid #e2e4ea", borderRadius: 12 } };
}

const ASSET_CATS = ["Real Estate", "Cash", "Investment", "Vehicle", "Other"];

// ─── PIE ─────────────────────────────────────────────────────────────────────
function Pie({ data, dark }) {
  const [hov, setHov] = useState(null);
  const total = data.reduce((s, d) => s + d.value, 0);
  if (!data.length || total <= 0) return null;
  const sz = 200, cx = 100, cy = 100, r = 76;
  let cum = -Math.PI / 2;
  const sl = data.map((d, i) => { const a = (d.value / total) * 2 * Math.PI, sa = cum; cum += a; const x1 = cx + r * Math.cos(sa), y1 = cy + r * Math.sin(sa), x2 = cx + r * Math.cos(cum), y2 = cy + r * Math.sin(cum); return { p: `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${a > Math.PI ? 1 : 0} 1 ${x2} ${y2} Z`, c: CL[i % CL.length], l: d.label, pct: ((d.value / total) * 100).toFixed(1), i }; });
  const t = T(dark);
  return (<div style={{ display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap" }}>
    <svg width={sz} height={sz} viewBox={`0 0 ${sz} ${sz}`}>{sl.map(s => <path key={s.i} d={s.p} fill={s.c} stroke={t.bg} strokeWidth={2} opacity={hov === null || hov === s.i ? 1 : 0.3} style={{ transition: "opacity .2s", cursor: "pointer" }} onMouseEnter={() => setHov(s.i)} onMouseLeave={() => setHov(null)} />)}<circle cx={cx} cy={cy} r={38} fill={t.s} />{hov !== null && <text x={cx} y={cy + 5} textAnchor="middle" fill={t.fg} fontSize="13" fontWeight="700">{sl[hov]?.pct}%</text>}</svg>
    <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>{sl.slice(0, 14).map(s => (<div key={s.i} style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", opacity: hov === null || hov === s.i ? 1 : 0.35 }} onMouseEnter={() => setHov(s.i)} onMouseLeave={() => setHov(null)}><span style={{ width: 8, height: 8, borderRadius: 2, background: s.c, flexShrink: 0 }} /><span style={{ color: t.fg, fontWeight: 500 }}>{s.l}</span><span style={{ color: t.mt }}>{s.pct}%</span></div>))}</div>
  </div>);
}

// ─── LINE CHART (NW History) ─────────────────────────────────────────────────
function LineChart({ points, dark }) {
  const t = T(dark);
  if (points.length < 2) return <div style={{ color: t.mt, fontSize: 12, padding: 16 }}>Need at least 2 snapshots. Net worth is recorded each time you open the app or refresh prices.</div>;
  const vals = points.map(p => p.value);
  const minV = Math.min(...vals), maxV = Math.max(...vals);
  const range = maxV - minV || 1;
  const W = 600, H = 180, pad = { l: 70, r: 20, t: 10, b: 30 };
  const cw = W - pad.l - pad.r, ch = H - pad.t - pad.b;
  const pts = points.map((p, i) => ({ x: pad.l + (i / (points.length - 1)) * cw, y: pad.t + ch - ((p.value - minV) / range) * ch, ...p }));
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = path + ` L ${pts[pts.length - 1].x} ${pad.t + ch} L ${pts[0].x} ${pad.t + ch} Z`;
  const ticks = 4;
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ maxWidth: W }}>
      {Array.from({ length: ticks }, (_, i) => { const v = minV + (range * i) / (ticks - 1); const y = pad.t + ch - (i / (ticks - 1)) * ch; return (<g key={i}><line x1={pad.l} x2={W - pad.r} y1={y} y2={y} stroke={t.bd} strokeWidth={0.5} /><text x={pad.l - 8} y={y + 4} textAnchor="end" fill={t.mt} fontSize="9">{fmt(v, "CAD", 0)}</text></g>); })}
      <defs><linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={t.acc} stopOpacity={0.25} /><stop offset="100%" stopColor={t.acc} stopOpacity={0} /></linearGradient></defs>
      <path d={areaPath} fill="url(#areaGrad)" />
      <path d={path} fill="none" stroke={t.acc} strokeWidth={2} strokeLinejoin="round" />
      {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={3} fill={t.acc} stroke={t.s} strokeWidth={1.5}><title>{p.date}: {fmt(p.value)}</title></circle>)}
      {pts.filter((_, i) => i === 0 || i === pts.length - 1 || i % Math.max(1, Math.floor(pts.length / 5)) === 0).map((p, i) => <text key={i} x={p.x} y={H - 6} textAnchor="middle" fill={t.mt} fontSize="8">{p.date?.slice(5)}</text>)}
    </svg>
  );
}

// ─── VESTING TIMELINE ────────────────────────────────────────────────────────
function VestingTimeline({ events, dark }) {
  const t = T(dark);
  if (!events.length) return <div style={{ color: t.mt, fontSize: 12 }}>No vesting events found. Add vestingDates to your RSUs/options.</div>;
  const now = new Date().toISOString().split("T")[0];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {events.map((e, i) => {
        const past = e.date < now;
        return (
          <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", opacity: past ? 0.4 : 1 }}>
            <div style={{ width: 72, fontSize: 11, color: t.mt, fontWeight: 600, fontVariantNumeric: "tabular-nums", flexShrink: 0, paddingTop: 2 }}>{e.date}</div>
            <div style={{ width: 10, display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: past ? t.mt : t.acc, border: `2px solid ${past ? t.bd : t.acc}` }} />
              {i < events.length - 1 && <div style={{ width: 2, height: 28, background: t.bd }} />}
            </div>
            <div style={{ paddingTop: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 12, color: t.fg }}>{e.company}</div>
              <div style={{ fontSize: 11, color: t.mt }}>{num(e.amount)} shares · {fmt(e.currentValue, "CAD")}{past ? " · Vested" : ""}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── EXCEL PARSER ────────────────────────────────────────────────────────────
let sjR = false;
function loadSJ() { return new Promise(r => { if (sjR || window.XLSX) { sjR = true; r(); return; } const s = document.createElement("script"); s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"; s.onload = () => { sjR = true; r(); }; document.head.appendChild(s); }); }
function parseExcel(wb) {
  const res = { stocks: [], options: [], promissoryNotes: [] };
  const sheet = wb.Sheets[wb.SheetNames[0]]; if (!sheet) return res;
  const rows = window.XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
  let sec = null;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i], a = String(row?.[0] || "").trim();
    if (a === "Options") { sec = "options"; continue; }
    if (a.startsWith("Stocks &")) { sec = "stocks"; continue; }
    if (a.startsWith("Promissory")) { sec = "promissory"; continue; }
    if (a.startsWith("Total") || a === "TOTAL" || a === "TAXES" || !a || a.startsWith("Stocks sold")) { if (a.startsWith("Stocks sold")) sec = null; continue; }
    let gf = null; const cell = sheet[window.XLSX.utils.encode_cell({ r: i, c: 4 })]; if (cell?.f) { const m = cell.f.match(/GOOGLEFINANCE\("([^"]+)"\)/i); if (m) gf = m[1]; }
    if (sec === "options") { const ex = Number(row[2]) || 0; res.options.push({ id: crypto.randomUUID(), company: a, gfTicker: gf, amount: Number(row[1]) || 0, exercisePrice: ex, expiry: row[6] ? dateStr(row[6]) : null, type: !ex ? "RSU" : "Option", notes: row[7] ? `Grant: ${dateStr(row[7])}` : "" }); }
    else if (sec === "stocks") { const wa = Number(row[7]) || 0; res.stocks.push({ id: crypto.randomUUID(), company: a, gfTicker: gf, shares: Number(row[1]) || 0, costBasis: Number(row[2]) || 0, broker: String(row[10] || ""), notes: "", warrants: wa > 0 ? { amount: wa, exercise: Number(row[8]) || 0, expiry: row[11] ? dateStr(row[11]) : null } : null }); }
    else if (sec === "promissory") { res.promissoryNotes.push({ id: crypto.randomUUID(), company: a, gfTicker: gf, shares: Number(row[1]) || 0, costBasis: Number(row[2]) || 0, notes: "" }); }
  }
  return res;
}

// ─── CARD COMPONENT ──────────────────────────────────────────────────────────
function Cd({ dk, title, value, sub, color }) {
  const t = T(dk);
  return (<div style={{ ...t.card, padding: 14 }}><div style={{ color: t.mt, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 5 }}>{title}</div><div style={{ fontSize: 20, fontWeight: 700, color: color || t.fg2, fontVariantNumeric: "tabular-nums" }}>{value}</div>{sub && <div style={{ marginTop: 2, fontSize: 11, color: color || t.mt, fontWeight: 600 }}>{sub}</div>}</div>);
}

// ─── INLINE EDIT ROW COMPONENT ───────────────────────────────────────────────
function AddRow({ fields, onAdd, dark }) {
  const t = T(dark);
  const [vals, setVals] = useState(fields.reduce((a, f) => ({ ...a, [f.key]: f.default || "" }), {}));
  const inp = { height: 32, borderRadius: 6, border: `1px solid ${t.ibd}`, background: t.ib, color: t.fg, padding: "0 8px", fontSize: 12, outline: "none", width: "100%" };
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end", marginTop: 12 }}>
      {fields.map(f => (
        <div key={f.key} style={{ flex: f.flex || 1, minWidth: f.minW || 100 }}>
          <div style={{ fontSize: 10, color: t.mt, fontWeight: 600, marginBottom: 3, textTransform: "uppercase" }}>{f.label}</div>
          {f.type === "select" ? (
            <select style={{ ...inp, cursor: "pointer" }} value={vals[f.key]} onChange={e => setVals(p => ({ ...p, [f.key]: e.target.value }))}>{f.options.map(o => <option key={o} value={o}>{o}</option>)}</select>
          ) : (
            <input style={inp} type={f.type || "text"} step={f.step} placeholder={f.placeholder} value={vals[f.key]} onChange={e => setVals(p => ({ ...p, [f.key]: e.target.value }))} />
          )}
        </div>
      ))}
      <button style={{ height: 32, border: "none", borderRadius: 6, padding: "0 14px", background: t.acc, color: "#fff", fontWeight: 600, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" }} onClick={() => { onAdd(vals); setVals(fields.reduce((a, f) => ({ ...a, [f.key]: f.default || "" }), {})); }}>+ Add</button>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN APP
// ═════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [data, setData] = useState(() => ld(STORAGE_KEY, DEFAULT_DATA));
  const [settings, setSettings] = useState(() => ld(SETTINGS_KEY, { currency: "CAD", dark: true, tab: "networth" }));
  const [prices, setPrices] = useState(() => ld(PRICE_CACHE_KEY, FALLBACK_PRICES));
  const [nwHistory, setNwHistory] = useState(() => ld(NW_HISTORY_KEY, []));
  const [pStatus, setPStatus] = useState("idle");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("totalValue");
  const [sortDir, setSortDir] = useState("desc");
  const [uploading, setUploading] = useState(false);

  const dk = settings.dark, cur = settings.currency, tab = settings.tab || "networth";
  const t = T(dk);

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }, [data]);
  useEffect(() => { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); }, [settings]);
  useEffect(() => { localStorage.setItem(PRICE_CACHE_KEY, JSON.stringify(prices)); }, [prices]);
  useEffect(() => { localStorage.setItem(NW_HISTORY_KEY, JSON.stringify(nwHistory)); }, [nwHistory]);

  const upd = useCallback((k, v) => setSettings(p => ({ ...p, [k]: v })), []);

  // Collect tickers
  const allTickers = useMemo(() => {
    const s = new Set();
    [...(data.options || []), ...(data.stocks || []), ...(data.promissoryNotes || [])].forEach(x => x.gfTicker && s.add(x.gfTicker.toUpperCase()));
    return [...s];
  }, [data]);

  // Fetch prices
  const fetchPrices = useCallback(async () => {
    setPStatus("loading");
    const u = { ...prices }; let ok = 0;
    for (const tk of allTickers) {
      try { const yt = convertToYahoo(tk); if (!yt) continue; const r = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${yt}?range=1d&interval=1d`); if (!r.ok) continue; const d = await r.json(); const p = d?.chart?.result?.[0]?.meta?.regularMarketPrice; if (p) { u[tk] = p; ok++; } } catch {}
    }
    setPrices(u); setPStatus(ok > 0 ? "done" : "error");
  }, [allTickers, prices]);

  useEffect(() => { fetchPrices(); }, []);

  const gp = useCallback((tk) => !tk ? 0 : (prices[tk.toUpperCase()] || FALLBACK_PRICES[tk.toUpperCase()] || 0), [prices]);

  // ─── ENRICHED DATA ─────────────────────────────────────────────────────────
  const eStocks = useMemo(() => (data.stocks || []).map(s => {
    const p = gp(s.gfTicker), mv = s.shares * p, cost = s.shares * s.costBasis, pnl = mv - cost, pnlPct = cost > 0 ? (pnl / cost) * 100 : 0;
    let wv = 0; if (s.warrants) wv = s.warrants.amount * Math.max(0, p - s.warrants.exercise);
    return { ...s, price: p, mv, cost, pnl, pnlPct, wv, totalValue: mv + wv };
  }), [data.stocks, gp]);

  const eOpts = useMemo(() => (data.options || []).map(o => {
    const p = gp(o.gfTicker), intr = o.type === "RSU" ? p : Math.max(0, p - o.exercisePrice), value = o.amount * intr;
    return { ...o, price: p, intrinsic: intr, value };
  }), [data.options, gp]);

  const eNotes = useMemo(() => (data.promissoryNotes || []).map(n => {
    const p = gp(n.gfTicker), mv = n.shares * p, cost = n.shares * n.costBasis;
    return { ...n, price: p, mv, cost, pnl: mv - cost };
  }), [data.promissoryNotes, gp]);

  const assetTotal = useMemo(() => (data.assets || []).reduce((s, a) => s + Number(a.value || 0), 0), [data.assets]);
  const liabilityTotal = useMemo(() => (data.liabilities || []).reduce((s, l) => s + Number(l.value || 0), 0), [data.liabilities]);

  const totals = useMemo(() => {
    const sv = eStocks.reduce((s, x) => s + x.totalValue, 0), ov = eOpts.reduce((s, x) => s + x.value, 0), nv = eNotes.reduce((s, x) => s + (x.price > 0 ? x.mv : x.cost), 0);
    const portfolio = sv + ov + nv;
    const netWorth = portfolio + assetTotal - liabilityTotal;
    const sc = eStocks.reduce((s, x) => s + x.cost, 0), nc = eNotes.reduce((s, x) => s + x.cost, 0), tc = sc + nc, tp = portfolio - tc;
    return { sv, ov, nv, portfolio, netWorth, assetTotal, liabilityTotal, tc, tp, pp: tc > 0 ? (tp / tc) * 100 : 0 };
  }, [eStocks, eOpts, eNotes, assetTotal, liabilityTotal]);

  // Record NW history (once per day)
  useEffect(() => {
    if (!totals.netWorth) return;
    const today = new Date().toISOString().split("T")[0];
    setNwHistory(prev => {
      const last = prev[prev.length - 1];
      if (last?.date === today) return prev.map(p => p.date === today ? { ...p, value: totals.netWorth } : p);
      return [...prev, { date: today, value: totals.netWorth }].slice(-365);
    });
  }, [totals.netWorth]);

  // Tax data
  const taxData = useMemo(() => {
    const events = data.taxEvents || [];
    const byYear = {};
    events.forEach(e => { if (!byYear[e.year]) byYear[e.year] = { gains: 0, tax: 0, events: [] }; byYear[e.year].gains += e.gain || 0; byYear[e.year].tax += e.taxOwed || 0; byYear[e.year].events.push(e); });
    return { events, byYear };
  }, [data.taxEvents]);

  // Vesting events
  const vestingEvents = useMemo(() => {
    const evts = [];
    (data.options || []).forEach(o => {
      if (o.vestingDates) {
        o.vestingDates.forEach(v => {
          evts.push({ date: v.date, company: o.company, amount: v.amount, gfTicker: o.gfTicker, currentValue: v.amount * gp(o.gfTicker) });
        });
      }
    });
    return evts.sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  }, [data.options, gp]);

  // Allocation
  const allocData = useMemo(() => {
    const m = {};
    eStocks.forEach(s => { m[s.company] = (m[s.company] || 0) + s.totalValue; });
    eOpts.forEach(o => { m[o.company] = (m[o.company] || 0) + o.value; });
    return Object.entries(m).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).map(([l, v]) => ({ label: l, value: v }));
  }, [eStocks, eOpts]);

  // Net worth breakdown for pie
  const nwBreakdown = useMemo(() => {
    const d = [];
    if (totals.sv > 0) d.push({ label: "Stocks + Warrants", value: totals.sv });
    if (totals.ov > 0) d.push({ label: "Options + RSUs", value: totals.ov });
    if (totals.nv > 0) d.push({ label: "Promissory Notes", value: totals.nv });
    (data.assets || []).forEach(a => { if (a.value > 0) d.push({ label: a.name, value: a.value }); });
    return d;
  }, [totals, data.assets]);

  // Sort/filter
  const fsort = useCallback((items, keys) => {
    const q = search.trim().toLowerCase();
    let l = items; if (q) l = items.filter(i => keys.some(k => String(i[k] || "").toLowerCase().includes(q)));
    return [...l].sort((a, b) => { const av = a[sortKey], bv = b[sortKey]; if (typeof av === "string") return sortDir === "asc" ? String(av || "").localeCompare(String(bv || "")) : String(bv || "").localeCompare(String(av || "")); return sortDir === "asc" ? (av || 0) - (bv || 0) : (bv || 0) - (av || 0); });
  }, [search, sortKey, sortDir]);

  function ts(k) { if (sortKey === k) setSortDir(p => p === "asc" ? "desc" : "asc"); else { setSortKey(k); setSortDir("desc"); } }
  const ar = k => sortKey === k ? (sortDir === "asc" ? " ↑" : " ↓") : "";
  function del(sec, id) { setData(p => ({ ...p, [sec]: (p[sec] || []).filter(x => x.id !== id) })); }

  async function handleUpload(e) {
    const f = e.target.files?.[0]; if (!f) return;
    setUploading(true);
    try { await loadSJ(); const wb = window.XLSX.read(await f.arrayBuffer(), { type: "array" }); const p = parseExcel(wb); if (!p.stocks.length && !p.options.length && !p.promissoryNotes.length) { alert("No positions found."); return; } if (window.confirm(`Found ${p.stocks.length} stocks, ${p.options.length} options, ${p.promissoryNotes.length} notes.\nReplace?`)) { setData(prev => ({ ...prev, ...p })); setTimeout(fetchPrices, 500); } }
    catch (err) { alert("Error: " + err.message); }
    finally { setUploading(false); e.target.value = ""; }
  }

  // ─── STYLES ──────────────────────────────────────────────────────────────
  const _ = {
    page: { minHeight: "100vh", background: t.bg, color: t.fg, fontFamily: "'DM Sans',-apple-system,BlinkMacSystemFont,sans-serif", transition: "background .25s" },
    wrap: { maxWidth: 1440, margin: "0 auto", padding: "24px 20px 64px" },
    h1: { margin: 0, fontSize: 26, fontWeight: 800, color: t.fg2, letterSpacing: -0.5 },
    sub: { marginTop: 4, color: t.mt, fontSize: 12, display: "flex", alignItems: "center", gap: 6 },
    bar: { display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center" },
    grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 20 },
    panel: { ...t.card, padding: 20, marginBottom: 18 },
    st: { margin: 0, marginBottom: 14, fontSize: 15, fontWeight: 700, color: t.fg2 },
    inp: { height: 36, borderRadius: 8, border: `1px solid ${t.ibd}`, background: t.ib, color: t.fg, padding: "0 10px", fontSize: 13, outline: "none" },
    sel: { height: 36, borderRadius: 8, border: `1px solid ${t.ibd}`, background: t.ib, color: t.fg, padding: "0 8px", fontSize: 13, cursor: "pointer", outline: "none" },
    btn: (bg, fg, bd) => ({ height: 34, border: bd || "none", borderRadius: 8, padding: "0 12px", background: bg, color: fg, fontWeight: 600, fontSize: 12, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }),
    tab: (on) => ({ height: 34, border: "none", borderRadius: 8, padding: "0 14px", background: on ? t.acc : "transparent", color: on ? "#fff" : t.mt, fontWeight: 600, fontSize: 12, cursor: "pointer", transition: "all .15s" }),
    th: { textAlign: "left", fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5, color: t.mt, padding: "8px 7px", borderBottom: `1px solid ${t.bd}`, cursor: "pointer", userSelect: "none", fontWeight: 700 },
    td: { padding: "9px 7px", borderBottom: `1px solid ${dk ? "#1e1e36" : "#f0f2f5"}`, fontSize: 12, verticalAlign: "top" },
    mn: { fontVariantNumeric: "tabular-nums" },
    xb: (bg, fg) => ({ height: 26, border: "none", borderRadius: 5, padding: "0 8px", background: bg, color: fg, fontWeight: 600, fontSize: 11, cursor: "pointer" }),
    badge: (bg, fg) => ({ display: "inline-block", padding: "1px 6px", borderRadius: 4, fontSize: 10, fontWeight: 600, background: bg, color: fg }),
    dot: c => ({ width: 7, height: 7, borderRadius: "50%", background: c, display: "inline-block" }),
  };

  const sc = pStatus === "done" ? t.gn : pStatus === "error" ? t.rd : pStatus === "loading" ? t.acc : t.mt;
  const stTxt = pStatus === "done" ? "Live" : pStatus === "error" ? "Cached" : pStatus === "loading" ? "Fetching…" : "—";

  const TABS = [["networth", "Net Worth"], ["stocks", "Stocks"], ["options", "Options"], ["notes", "Notes"], ["assets", "Assets"], ["tax", "Tax"], ["vesting", "Vesting"]];

  return (
    <div style={_.page}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <div style={_.wrap}>

        {/* HEADER */}
        <header style={{ display: "flex", justifyContent: "space-between", gap: 14, alignItems: "flex-start", marginBottom: 22, flexWrap: "wrap" }}>
          <div>
            <h1 style={_.h1}>Equity Tracker</h1>
            <div style={_.sub}>{new Date().toLocaleDateString("en-CA", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}<span style={{ opacity: 0.25 }}>|</span><span style={_.dot(sc)} /> {stTxt}</div>
          </div>
          <div style={_.bar}>
            <select style={_.sel} value={cur} onChange={e => upd("currency", e.target.value)}>{Object.keys(CURRENCIES).map(c => <option key={c}>{c}</option>)}</select>
            <button style={_.btn(dk ? "#2a2a48" : "#e2e4ea", t.fg)} onClick={() => upd("dark", !dk)}>{dk ? "☀️" : "🌙"}</button>
            <button style={_.btn(t.acc, "#fff")} onClick={fetchPrices} disabled={pStatus === "loading"}>↻ Refresh</button>
            <button style={_.btn(t.s, t.fg, `1px solid ${t.bd}`)} onClick={() => dlFile(JSON.stringify(data, null, 2), "equity-tracker.json", "application/json")}>JSON</button>
            <button style={_.btn(t.s, t.fg, `1px solid ${t.bd}`)} onClick={() => { const rows = [["Section","Company","Ticker","Shares","Cost","Price","Value","Broker"]]; eStocks.forEach(s => rows.push(["Stock", s.company, s.gfTicker, s.shares, s.costBasis, s.price, s.totalValue, s.broker])); eOpts.forEach(o => rows.push([o.type, o.company, o.gfTicker, o.amount, o.exercisePrice, o.price, o.value, ""])); dlFile(rows.map(r => r.join(",")).join("\n"), "equity-tracker.csv", "text/csv"); }}>CSV</button>
            <label style={{ ..._.btn(t.s, t.fg, `1px solid ${t.bd}`), cursor: "pointer" }}>{uploading ? "Reading…" : "📁 Excel"}<input type="file" accept=".xlsx,.xls" onChange={handleUpload} style={{ display: "none" }} /></label>
          </div>
        </header>

        {/* TABS */}
        <div style={{ display: "flex", gap: 4, marginBottom: 16, flexWrap: "wrap" }}>
          {TABS.map(([k, l]) => <button key={k} style={_.tab(tab === k)} onClick={() => { upd("tab", k); setSortKey(k === "options" ? "value" : "totalValue"); }}>{l}</button>)}
        </div>

        {/* ═══ NET WORTH TAB ═══ */}
        {tab === "networth" && (<>
          <div style={_.grid}>
            <Cd dk={dk} title="Net Worth" value={fmt(totals.netWorth, cur)} />
            <Cd dk={dk} title="Portfolio" value={fmt(totals.portfolio, cur)} sub={pf(totals.pp)} color={pc(totals.tp, dk)} />
            <Cd dk={dk} title="Other Assets" value={fmt(assetTotal, cur)} sub={`${(data.assets || []).length} items`} />
            <Cd dk={dk} title="Liabilities" value={fmt(liabilityTotal, cur)} color={liabilityTotal > 0 ? t.rd : undefined} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 18 }}>
            <div style={_.panel}><h2 style={_.st}>Net Worth Breakdown</h2><Pie data={nwBreakdown} dark={dk} /></div>
            <div style={_.panel}><h2 style={_.st}>Net Worth Over Time</h2><LineChart points={nwHistory} dark={dk} /></div>
          </div>
          <div style={_.panel}><h2 style={_.st}>Portfolio Allocation</h2><Pie data={allocData} dark={dk} /></div>
        </>)}

        {/* ═══ STOCKS TAB ═══ */}
        {tab === "stocks" && (<div style={_.panel}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 12, flexWrap: "wrap" }}>
            <h2 style={{ ..._.st, marginBottom: 0 }}>Stocks & Warrants <span style={{ color: t.mt, fontWeight: 400, fontSize: 12 }}>({fmt(totals.sv, cur)})</span></h2>
            <input style={{ ..._.inp, width: 260 }} value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" />
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1080 }}>
              <thead><tr>{[["company","Company"],["gfTicker","Ticker"],["shares","Shares"],["costBasis","Cost"],["price","Price"],["mv","Mkt Val"],["pnl","P&L"],["wv","Warrants"],["totalValue","Total"],["broker","Broker"]].map(([k,l]) => <th key={k} style={_.th} onClick={() => ts(k)}>{l}{ar(k)}</th>)}<th style={_.th}>%</th><th style={_.th}></th></tr></thead>
              <tbody>{fsort(eStocks, ["company","gfTicker","broker"]).map(s => { const al = totals.portfolio > 0 ? s.totalValue / totals.portfolio * 100 : 0; return (
                <tr key={s.id} onMouseEnter={e => e.currentTarget.style.background = dk ? "#1e1e36" : "#f9fafb"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <td style={_.td}><div style={{ fontWeight: 600 }}>{s.company}</div>{s.notes && <div style={{ fontSize: 10, color: t.mt }}>{s.notes}</div>}</td>
                  <td style={{ ..._.td, fontSize: 11 }}>{s.gfTicker || "—"}</td>
                  <td style={{ ..._.td, ..._.mn }}>{num(s.shares)}</td><td style={{ ..._.td, ..._.mn }}>{fmt(s.costBasis,"CAD",3)}</td>
                  <td style={{ ..._.td, ..._.mn, fontWeight: 600 }}>{fmt(s.price,"CAD",3)}</td><td style={{ ..._.td, ..._.mn, fontWeight: 600 }}>{fmt(s.mv,"CAD")}</td>
                  <td style={{ ..._.td, ..._.mn, fontWeight: 600, color: pc(s.pnl, dk) }}>{fmt(s.pnl,"CAD")}<div style={{ fontSize: 10, color: t.mt }}>{pf(s.pnlPct)}</div></td>
                  <td style={{ ..._.td, ..._.mn }}>{s.wv > 0 ? fmt(s.wv,"CAD") : "—"}{s.warrants && <div style={{ fontSize: 10, color: t.mt }}>{num(s.warrants.amount)}@{s.warrants.exercise}</div>}</td>
                  <td style={{ ..._.td, ..._.mn, fontWeight: 700 }}>{fmt(s.totalValue,"CAD")}</td><td style={_.td}>{s.broker || "—"}</td>
                  <td style={{ ..._.td, ..._.mn, fontWeight: 600 }}>{num(al,1)}%</td>
                  <td style={_.td}><button style={_.xb(t.dns, t.dnt)} onClick={() => del("stocks", s.id)}>✕</button></td>
                </tr>); })}{!eStocks.length && <tr><td colSpan={12} style={{ ..._.td, textAlign: "center", color: t.mt, padding: 28 }}>No positions.</td></tr>}</tbody>
            </table>
          </div>
        </div>)}

        {/* ═══ OPTIONS TAB ═══ */}
        {tab === "options" && (<div style={_.panel}>
          <h2 style={_.st}>Options & RSUs <span style={{ color: t.mt, fontWeight: 400, fontSize: 12 }}>({fmt(totals.ov, cur)})</span></h2>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 880 }}>
              <thead><tr>{[["company","Company"],["type","Type"],["gfTicker","Ticker"],["amount","Amount"],["exercisePrice","Strike"],["price","Price"],["intrinsic","Intrinsic"],["value","Value"],["expiry","Expiry"]].map(([k,l]) => <th key={k} style={_.th} onClick={() => ts(k)}>{l}{ar(k)}</th>)}<th style={_.th}></th></tr></thead>
              <tbody>{fsort(eOpts, ["company","gfTicker","type"]).map(o => { const exp = o.expiry && new Date(o.expiry) < new Date(); const itm = o.type !== "RSU" && o.exercisePrice > 0 && o.price > o.exercisePrice; const otm = o.type !== "RSU" && o.exercisePrice > 0 && o.price <= o.exercisePrice; return (
                <tr key={o.id} style={{ opacity: exp ? 0.35 : 1 }} onMouseEnter={e => e.currentTarget.style.background = dk ? "#1e1e36" : "#f9fafb"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <td style={_.td}><div style={{ fontWeight: 600 }}>{o.company}</div>{o.notes && <div style={{ fontSize: 10, color: t.mt }}>{o.notes}</div>}</td>
                  <td style={_.td}><span style={_.badge(o.type === "RSU" ? (dk ? "#1e3a5f" : "#dbeafe") : (dk ? "#2d2d4a" : "#f3f4f6"), o.type === "RSU" ? (dk ? "#93c5fd" : "#2563eb") : t.fg)}>{o.type}</span></td>
                  <td style={{ ..._.td, fontSize: 11 }}>{o.gfTicker || "—"}</td><td style={{ ..._.td, ..._.mn }}>{num(o.amount)}</td>
                  <td style={{ ..._.td, ..._.mn }}>{o.type === "RSU" ? "—" : fmt(o.exercisePrice,"CAD",3)}</td>
                  <td style={{ ..._.td, ..._.mn, fontWeight: 600 }}>{fmt(o.price,"CAD",3)}</td>
                  <td style={{ ..._.td, ..._.mn, color: o.intrinsic > 0 ? t.gn : t.mt }}>{fmt(o.intrinsic,"CAD",3)}</td>
                  <td style={{ ..._.td, ..._.mn, fontWeight: 700, color: pc(o.value, dk) }}>{fmt(o.value,"CAD")}</td>
                  <td style={_.td}>{o.expiry || "—"}{exp && <span style={{ ..._.badge(t.dns, t.dnt), marginLeft: 5 }}>Exp</span>}{!exp && itm && <span style={{ ..._.badge(dk?"#064e3b":"#d1fae5", dk?"#6ee7b7":"#047857"), marginLeft: 5 }}>ITM</span>}{!exp && otm && <span style={{ ..._.badge(t.dns, t.dnt), marginLeft: 5 }}>OTM</span>}</td>
                  <td style={_.td}><button style={_.xb(t.dns, t.dnt)} onClick={() => del("options", o.id)}>✕</button></td>
                </tr>); })}</tbody>
            </table>
          </div>
        </div>)}

        {/* ═══ NOTES TAB ═══ */}
        {tab === "notes" && (<div style={_.panel}>
          <h2 style={_.st}>Promissory Notes</h2>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 660 }}>
              <thead><tr>{[["company","Company"],["gfTicker","Ticker"],["shares","Shares"],["costBasis","Cost"],["price","Price"],["mv","Value"],["pnl","P&L"]].map(([k,l]) => <th key={k} style={_.th} onClick={() => ts(k)}>{l}{ar(k)}</th>)}<th style={_.th}></th></tr></thead>
              <tbody>{fsort(eNotes, ["company","gfTicker"]).map(n => (
                <tr key={n.id} onMouseEnter={e => e.currentTarget.style.background = dk ? "#1e1e36" : "#f9fafb"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <td style={_.td}><div style={{ fontWeight: 600 }}>{n.company}</div>{n.notes && <div style={{ fontSize: 10, color: t.mt }}>{n.notes}</div>}</td>
                  <td style={{ ..._.td, fontSize: 11 }}>{n.gfTicker || "Private"}</td><td style={{ ..._.td, ..._.mn }}>{num(n.shares)}</td>
                  <td style={{ ..._.td, ..._.mn }}>{fmt(n.costBasis,"CAD",3)}</td><td style={{ ..._.td, ..._.mn }}>{n.price > 0 ? fmt(n.price,"CAD",3) : "—"}</td>
                  <td style={{ ..._.td, ..._.mn, fontWeight: 600 }}>{n.price > 0 ? fmt(n.mv,"CAD") : fmt(n.cost,"CAD")}</td>
                  <td style={{ ..._.td, ..._.mn, fontWeight: 600, color: pc(n.pnl, dk) }}>{n.price > 0 ? fmt(n.pnl,"CAD") : "—"}</td>
                  <td style={_.td}><button style={_.xb(t.dns, t.dnt)} onClick={() => del("promissoryNotes", n.id)}>✕</button></td>
                </tr>))}</tbody>
            </table>
          </div>
        </div>)}

        {/* ═══ ASSETS TAB ═══ */}
        {tab === "assets" && (<>
          <div style={_.grid}>
            <Cd dk={dk} title="Total Assets" value={fmt(assetTotal, cur)} sub={`${(data.assets||[]).length} items`} />
            <Cd dk={dk} title="Total Liabilities" value={fmt(liabilityTotal, cur)} color={liabilityTotal > 0 ? t.rd : undefined} />
            <Cd dk={dk} title="Net (excl. portfolio)" value={fmt(assetTotal - liabilityTotal, cur)} />
          </div>
          <div style={_.panel}>
            <h2 style={_.st}>Assets</h2>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>{["Name","Category","Value","Notes",""].map(h => <th key={h} style={_.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {(data.assets || []).map(a => (
                    <tr key={a.id} onMouseEnter={e => e.currentTarget.style.background = dk ? "#1e1e36" : "#f9fafb"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <td style={{ ..._.td, fontWeight: 600 }}>{a.name}</td>
                      <td style={_.td}><span style={_.badge(dk ? "#2d2d4a" : "#f3f4f6", t.fg)}>{a.category}</span></td>
                      <td style={{ ..._.td, ..._.mn, fontWeight: 600 }}>{fmt(a.value, cur)}</td>
                      <td style={{ ..._.td, color: t.mt, fontSize: 11 }}>{a.notes}</td>
                      <td style={_.td}><button style={_.xb(t.dns, t.dnt)} onClick={() => del("assets", a.id)}>✕</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <AddRow dark={dk} fields={[
              { key: "name", label: "Name", placeholder: "Home equity", flex: 2, minW: 140 },
              { key: "category", label: "Category", type: "select", options: ASSET_CATS, default: "Cash" },
              { key: "value", label: "Value", type: "number", placeholder: "50000", step: "0.01" },
              { key: "notes", label: "Notes", placeholder: "Optional" },
            ]} onAdd={v => { if (!v.name) return; setData(p => ({ ...p, assets: [...(p.assets||[]), { id: crypto.randomUUID(), name: v.name, category: v.category || "Other", value: Number(v.value) || 0, notes: v.notes || "" }] })); }} />
          </div>
          <div style={_.panel}>
            <h2 style={_.st}>Liabilities</h2>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>{["Name","Category","Amount","Notes",""].map(h => <th key={h} style={_.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {(data.liabilities || []).map(l => (
                    <tr key={l.id} onMouseEnter={e => e.currentTarget.style.background = dk ? "#1e1e36" : "#f9fafb"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <td style={{ ..._.td, fontWeight: 600 }}>{l.name}</td>
                      <td style={_.td}><span style={_.badge(dk ? "#2d2d4a" : "#f3f4f6", t.fg)}>{l.category}</span></td>
                      <td style={{ ..._.td, ..._.mn, fontWeight: 600, color: t.rd }}>{fmt(l.value, cur)}</td>
                      <td style={{ ..._.td, color: t.mt, fontSize: 11 }}>{l.notes}</td>
                      <td style={_.td}><button style={_.xb(t.dns, t.dnt)} onClick={() => del("liabilities", l.id)}>✕</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <AddRow dark={dk} fields={[
              { key: "name", label: "Name", placeholder: "Mortgage", flex: 2, minW: 140 },
              { key: "category", label: "Category", type: "select", options: ["Mortgage","Debt","Loan","Other"], default: "Debt" },
              { key: "value", label: "Amount", type: "number", placeholder: "0", step: "0.01" },
              { key: "notes", label: "Notes", placeholder: "Optional" },
            ]} onAdd={v => { if (!v.name) return; setData(p => ({ ...p, liabilities: [...(p.liabilities||[]), { id: crypto.randomUUID(), name: v.name, category: v.category || "Other", value: Number(v.value) || 0, notes: v.notes || "" }] })); }} />
          </div>
        </>)}

        {/* ═══ TAX TAB ═══ */}
        {tab === "tax" && (<>
          <div style={_.grid}>
            {Object.entries(taxData.byYear).map(([year, d]) => (
              <Cd key={year} dk={dk} title={`${year} Gains`} value={fmt(d.gains, cur)} sub={`Tax: ~${fmt(d.tax, cur)}`} color={t.rd} />
            ))}
          </div>
          <div style={_.panel}>
            <h2 style={_.st}>Realized Gains (Taxable Events)</h2>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>{["Year","Ticker","Shares Sold","Sold Price","Purchase Price","Capital Gain","Est. Tax",""].map(h => <th key={h} style={_.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {(data.taxEvents || []).map(e => (
                    <tr key={e.id} onMouseEnter={ev => ev.currentTarget.style.background = dk ? "#1e1e36" : "#f9fafb"} onMouseLeave={ev => ev.currentTarget.style.background = "transparent"}>
                      <td style={{ ..._.td, fontWeight: 600 }}>{e.year}</td>
                      <td style={{ ..._.td, fontWeight: 600 }}>{e.ticker}</td>
                      <td style={{ ..._.td, ..._.mn }}>{num(e.sharesSold)}</td>
                      <td style={{ ..._.td, ..._.mn }}>{fmt(e.soldPrice,"CAD",2)}</td>
                      <td style={{ ..._.td, ..._.mn }}>{fmt(e.purchasePrice,"CAD",2)}</td>
                      <td style={{ ..._.td, ..._.mn, fontWeight: 600, color: t.gn }}>{fmt(e.gain,"CAD")}</td>
                      <td style={{ ..._.td, ..._.mn, color: t.rd }}>{fmt(e.taxOwed,"CAD")}</td>
                      <td style={_.td}><button style={_.xb(t.dns, t.dnt)} onClick={() => del("taxEvents", e.id)}>✕</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <AddRow dark={dk} fields={[
              { key: "year", label: "Year", type: "number", placeholder: "2026", default: "2026", minW: 70, flex: 0.5 },
              { key: "ticker", label: "Ticker", placeholder: "APXC" },
              { key: "sharesSold", label: "Shares", type: "number", placeholder: "5000" },
              { key: "soldPrice", label: "Sold @", type: "number", step: "0.01", placeholder: "2.50" },
              { key: "purchasePrice", label: "Bought @", type: "number", step: "0.01", placeholder: "0.15" },
            ]} onAdd={v => {
              const shares = Number(v.sharesSold) || 0, sp = Number(v.soldPrice) || 0, pp = Number(v.purchasePrice) || 0;
              const gain = shares * (sp - pp), tax = gain * 0.5 * 0.3853; // 50% inclusion rate × ~38.5% marginal (BC)
              setData(p => ({ ...p, taxEvents: [...(p.taxEvents||[]), { id: crypto.randomUUID(), year: Number(v.year) || 2026, ticker: v.ticker?.toUpperCase() || "", sharesSold: shares, soldPrice: sp, purchasePrice: pp, gain, taxOwed: Math.max(0, tax) }] }));
            }} />
            <div style={{ marginTop: 10, fontSize: 11, color: t.mt }}>Tax estimate uses 50% capital gains inclusion × ~38.5% marginal rate (BC). Adjust as needed.</div>
          </div>
        </>)}

        {/* ═══ VESTING TAB ═══ */}
        {tab === "vesting" && (<>
          <div style={_.grid}>
            <Cd dk={dk} title="Upcoming Vesting Value" value={fmt(vestingEvents.filter(e => e.date >= new Date().toISOString().split("T")[0]).reduce((s, e) => s + e.currentValue, 0), cur)} sub={`${vestingEvents.filter(e => e.date >= new Date().toISOString().split("T")[0]).length} events`} />
          </div>
          <div style={_.panel}>
            <h2 style={_.st}>Vesting Schedule</h2>
            <VestingTimeline events={vestingEvents} dark={dk} />
            <div style={{ marginTop: 16, fontSize: 11, color: t.mt }}>Add vestingDates arrays to your options/RSUs in the JSON data to populate this timeline.</div>
          </div>
        </>)}

        <div style={{ textAlign: "center", color: t.mt, fontSize: 11, marginTop: 20 }}>Prices via Yahoo Finance · All values {cur}</div>
      </div>
    </div>
  );
}
