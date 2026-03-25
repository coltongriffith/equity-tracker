import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";

// ─── constants ───────────────────────────────────────────────────────────────
const STORAGE_KEY = "equity-tracker-data-v2";
const SETTINGS_KEY = "equity-tracker-settings-v2";
const PRICE_CACHE_KEY = "equity-tracker-prices";

const CURRENCIES = {
  CAD: { symbol: "CA$", locale: "en-CA", rate: 1 },
  USD: { symbol: "US$", locale: "en-US", rate: 0.74 },
  AUD: { symbol: "A$", locale: "en-AU", rate: 1.13 },
  GBP: { symbol: "£", locale: "en-GB", rate: 0.58 },
  EUR: { symbol: "€", locale: "de-DE", rate: 0.68 },
};

function convertToYahoo(gfTicker) {
  if (!gfTicker) return null;
  const parts = gfTicker.split(":");
  if (parts.length < 2) return null;
  const [exchange, symbol] = parts;
  const sym = symbol.toUpperCase().replace(".H", "-H");
  switch (exchange.toUpperCase()) {
    case "CVE": return `${sym}.V`;
    case "CNSX": return `${sym}.CN`;
    case "TSE": return `${sym}.TO`;
    case "NYSEARCA": case "NYSE": case "NASDAQ": return sym;
    default: return `${sym}.V`;
  }
} 

// ─── default positions from your spreadsheet ─────────────────────────────────
const DEFAULT_DATA = {
  options: [
    { id: "o1", company: "Apex Critical Metals", gfTicker: "CNSX:APXC", amount: 150000, exercisePrice: 0.85, expiry: "2030-03-14", type: "Option", notes: "" },
    { id: "o2", company: "SWMBRD Sports", gfTicker: "CNSX:SWIM", amount: 50000, exercisePrice: 0.105, expiry: "2026-09-12", type: "Option", notes: "" },
    { id: "o3", company: "Zimtu Capital", gfTicker: "CVE:ZC", amount: 20000, exercisePrice: 1.125, expiry: "2026-06-10", type: "Option", notes: "" },
    { id: "o4", company: "Zimtu Capital", gfTicker: "CVE:ZC", amount: 8000, exercisePrice: 1.15, expiry: "2027-03-24", type: "Option", notes: "" },
    { id: "o5", company: "Core Silver Corp", gfTicker: "CNSX:CC", amount: 20000, exercisePrice: 0.61, expiry: "2029-07-21", type: "Option", notes: "" },
    { id: "o6", company: "Zimtu Capital", gfTicker: "CVE:ZC", amount: 50000, exercisePrice: 0, expiry: null, type: "RSU", notes: "Grant: Jul 15 2025 · Vest: Jul 29 2026" },
    { id: "o7", company: "Apex Critical Metals", gfTicker: "CNSX:APXC", amount: 50000, exercisePrice: 0, expiry: null, type: "RSU", notes: "Grant: Sep 8 2025 · Vest quarterly from May 2026" },
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
};

const FALLBACK_PRICES = {
  "CNSX:APXC": 2.23, "CNSX:SWIM": 0.01, "CVE:ZC": 0.58, "CNSX:CC": 0.48,
  "CVE:FTUR": 0.49, "CNSX:STCU": 1.05, "CVE:BEM": 0.13, "CNSX:BVCI": 0.20,
  "CNSX:DEMC": 0.13, "CVE:ALTN": 0.15, "CNSX:HM": 0.43, "CVE:SVP-H": 0.28,
  "CVE:KIB": 0.17,
};

// ─── persistence ─────────────────────────────────────────────────────────────
function load(key, fb) { try { const r = localStorage.getItem(key); if (!r) return fb; return JSON.parse(r) ?? fb; } catch { return fb; } }
const defaultSettings = { currency: "CAD", dark: true, tab: "stocks" };

// ─── formatting ──────────────────────────────────────────────────────────────
function fmt(v, c = "CAD", d = 2) { const x = CURRENCIES[c] || CURRENCIES.CAD; return new Intl.NumberFormat(x.locale, { style: "currency", currency: c, minimumFractionDigits: d, maximumFractionDigits: d }).format(Number(v || 0)); }
function num(v, d = 0) { return new Intl.NumberFormat("en-CA", { minimumFractionDigits: d, maximumFractionDigits: d }).format(Number(v || 0)); }
function pf(v) { const n = Number(v || 0); return `${n >= 0 ? "+" : ""}${num(n, 1)}%`; }
function pc(v, dk) { return v > 0 ? (dk ? "#34d399" : "#059669") : v < 0 ? (dk ? "#f87171" : "#dc2626") : (dk ? "#6b7280" : "#9ca3af"); }
const CL = ["#6366f1","#f59e0b","#10b981","#ef4444","#8b5cf6","#ec4899","#14b8a6","#f97316","#06b6d4","#84cc16","#e879f9","#fb923c"];

// ─── theme ───────────────────────────────────────────────────────────────────
function T(dk) {
  return dk ? {
    bg: "#0c0c18", s: "#161628", s2: "#1e1e36", bd: "#2a2a48", fg: "#e0e2eb", fg2: "#f4f4f8",
    mt: "#7c82a1", ib: "#1e1e36", ibd: "#33335a", acc: "#6366f1",
    gn: "#34d399", rd: "#f87171", dns: "rgba(220,38,38,0.15)", dnt: "#fca5a5",
    card: { background: "#161628", border: "1px solid #2a2a48", borderRadius: 12 },
  } : {
    bg: "#f0f1f5", s: "#ffffff", s2: "#f9fafb", bd: "#e2e4ea", fg: "#1f2937", fg2: "#111827",
    mt: "#6b7280", ib: "#fff", ibd: "#d1d5db", acc: "#4f46e5",
    gn: "#059669", rd: "#dc2626", dns: "#fee2e2", dnt: "#991b1b",
    card: { background: "#fff", border: "1px solid #e2e4ea", borderRadius: 12 },
  };
}

function dlFile(c, n, m) { const b = new Blob([c], { type: m }); const u = URL.createObjectURL(b); const a = document.createElement("a"); a.href = u; a.download = n; a.click(); URL.revokeObjectURL(u); }

// ─── Pie ─────────────────────────────────────────────────────────────────────
function Pie({ data, dark }) {
  const [hov, setHov] = useState(null);
  const total = data.reduce((s, d) => s + d.value, 0);
  if (!data.length || total <= 0) return null;
  const sz = 200, cx = sz / 2, cy = sz / 2, r = 76;
  let cum = -Math.PI / 2;
  const sl = data.map((d, i) => {
    const a = (d.value / total) * 2 * Math.PI; const sa = cum; cum += a;
    const x1 = cx + r * Math.cos(sa), y1 = cy + r * Math.sin(sa), x2 = cx + r * Math.cos(cum), y2 = cy + r * Math.sin(cum);
    return { p: `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${a > Math.PI ? 1 : 0} 1 ${x2} ${y2} Z`, c: CL[i % CL.length], l: d.label, pct: ((d.value / total) * 100).toFixed(1), i };
  });
  const t = T(dark);
  return (
    <div style={{ display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap" }}>
      <svg width={sz} height={sz} viewBox={`0 0 ${sz} ${sz}`}>
        {sl.map(s => <path key={s.i} d={s.p} fill={s.c} stroke={t.bg} strokeWidth={2} opacity={hov === null || hov === s.i ? 1 : 0.3} style={{ transition: "opacity .2s", cursor: "pointer" }} onMouseEnter={() => setHov(s.i)} onMouseLeave={() => setHov(null)} />)}
        <circle cx={cx} cy={cy} r={38} fill={t.s} />
        {hov !== null && <text x={cx} y={cy + 5} textAnchor="middle" fill={t.fg} fontSize="13" fontWeight="700">{sl[hov]?.pct}%</text>}
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
        {sl.slice(0, 14).map(s => (
          <div key={s.i} style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", opacity: hov === null || hov === s.i ? 1 : 0.35 }} onMouseEnter={() => setHov(s.i)} onMouseLeave={() => setHov(null)}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: s.c, flexShrink: 0 }} />
            <span style={{ color: t.fg, fontWeight: 500 }}>{s.l}</span>
            <span style={{ color: t.mt }}>{s.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Excel parser via SheetJS ────────────────────────────────────────────────
let sjReady = false;
function loadSJ() {
  return new Promise(r => {
    if (sjReady || window.XLSX) { sjReady = true; r(); return; }
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
    s.onload = () => { sjReady = true; r(); };
    document.head.appendChild(s);
  });
}

function parseExcel(wb) {
  const res = { stocks: [], options: [], promissoryNotes: [] };
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) return res;
  const rows = window.XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
  let sec = null;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]; const a = String(row?.[0] || "").trim();
    if (a === "Options") { sec = "options"; continue; }
    if (a.startsWith("Stocks &") || a.startsWith("Stocks &")) { sec = "stocks"; continue; }
    if (a.startsWith("Promissory")) { sec = "promissory"; continue; }
    if (a.startsWith("Total") || a === "TOTAL" || a === "TAXES" || !a || a.startsWith("Stocks sold")) { if (a.startsWith("Stocks sold")) sec = null; continue; }
    let gf = null;
    const cell = sheet[window.XLSX.utils.encode_cell({ r: i, c: 4 })];
    if (cell?.f) { const m = cell.f.match(/GOOGLEFINANCE\("([^"]+)"\)/i); if (m) gf = m[1]; }
    if (sec === "options") {
      const ex = Number(row[2]) || 0;
      res.options.push({ id: crypto.randomUUID(), company: a, gfTicker: gf, amount: Number(row[1]) || 0, exercisePrice: ex, expiry: row[6] ? fmtDt(row[6]) : null, type: !ex ? "RSU" : "Option", notes: row[7] ? `Grant: ${fmtDt(row[7])}` : "" });
    } else if (sec === "stocks") {
      const wa = Number(row[7]) || 0;
      res.stocks.push({ id: crypto.randomUUID(), company: a, gfTicker: gf, shares: Number(row[1]) || 0, costBasis: Number(row[2]) || 0, broker: String(row[10] || ""), notes: "", warrants: wa > 0 ? { amount: wa, exercise: Number(row[8]) || 0, expiry: row[11] ? fmtDt(row[11]) : null } : null });
    } else if (sec === "promissory") {
      res.promissoryNotes.push({ id: crypto.randomUUID(), company: a, gfTicker: gf, shares: Number(row[1]) || 0, costBasis: Number(row[2]) || 0, notes: "" });
    }
  }
  return res;
}
function fmtDt(v) { if (!v) return null; if (typeof v === "number") { return new Date((v - 25569) * 86400000).toISOString().split("T")[0]; } if (v instanceof Date) return v.toISOString().split("T")[0]; return String(v).split("T")[0]; }

// ─── App ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [data, setData] = useState(() => load(STORAGE_KEY, DEFAULT_DATA));
  const [settings, setSettings] = useState(() => load(SETTINGS_KEY, defaultSettings));
  const [prices, setPrices] = useState(() => load(PRICE_CACHE_KEY, FALLBACK_PRICES));
  const [pStatus, setPStatus] = useState("idle");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("totalValue");
  const [sortDir, setSortDir] = useState("desc");
  const [uploading, setUploading] = useState(false);

  const dk = settings.dark, cur = settings.currency, tab = settings.tab || "stocks";
  const t = T(dk);

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }, [data]);
  useEffect(() => { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); }, [settings]);
  useEffect(() => { localStorage.setItem(PRICE_CACHE_KEY, JSON.stringify(prices)); }, [prices]);

  const upd = useCallback((k, v) => setSettings(p => ({ ...p, [k]: v })), []);

  const allTickers = useMemo(() => {
    const s = new Set();
    [...(data.options || []), ...(data.stocks || []), ...(data.promissoryNotes || [])].forEach(x => x.gfTicker && s.add(x.gfTicker.toUpperCase()));
    return [...s];
  }, [data]);

  const fetchPrices = useCallback(async () => {
    setPStatus("loading");
    const u = { ...prices }; let ok = 0;
    for (const tk of allTickers) {
      try {
        const yt = convertToYahoo(tk); if (!yt) continue;
        const r = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${yt}?range=1d&interval=1d`);
        if (!r.ok) continue;
        const d = await r.json(); const p = d?.chart?.result?.[0]?.meta?.regularMarketPrice;
        if (p) { u[tk] = p; ok++; }
      } catch {}
    }
    setPrices(u); setPStatus(ok > 0 ? "done" : "error");
  }, [allTickers, prices]);

  useEffect(() => { fetchPrices(); }, []);

  const gp = useCallback((tk) => {
    if (!tk) return 0;
    return prices[tk.toUpperCase()] || FALLBACK_PRICES[tk.toUpperCase()] || 0;
  }, [prices]);

  // ─── enriched ────────────────────────────────────────────────────────────
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

  const totals = useMemo(() => {
    const sv = eStocks.reduce((s, x) => s + x.totalValue, 0), ov = eOpts.reduce((s, x) => s + x.value, 0), nv = eNotes.reduce((s, x) => s + x.mv, 0);
    const sc = eStocks.reduce((s, x) => s + x.cost, 0), nc = eNotes.reduce((s, x) => s + x.cost, 0);
    const tot = sv + ov + nv, tc = sc + nc, tp = tot - tc;
    return { sv, ov, nv, tot, tc, tp, pp: tc > 0 ? (tp / tc) * 100 : 0 };
  }, [eStocks, eOpts, eNotes]);

  const allocData = useMemo(() => {
    const m = {};
    eStocks.forEach(s => { m[s.company] = (m[s.company] || 0) + s.totalValue; });
    eOpts.forEach(o => { m[o.company] = (m[o.company] || 0) + o.value; });
    return Object.entries(m).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).map(([l, v]) => ({ label: l, value: v }));
  }, [eStocks, eOpts]);

  const fsort = useCallback((items, keys) => {
    const q = search.trim().toLowerCase();
    let l = items;
    if (q) l = items.filter(i => keys.some(k => String(i[k] || "").toLowerCase().includes(q)));
    return [...l].sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      if (typeof av === "string") return sortDir === "asc" ? String(av || "").localeCompare(String(bv || "")) : String(bv || "").localeCompare(String(av || ""));
      return sortDir === "asc" ? (av || 0) - (bv || 0) : (bv || 0) - (av || 0);
    });
  }, [search, sortKey, sortDir]);

  function ts(k) { if (sortKey === k) setSortDir(p => p === "asc" ? "desc" : "asc"); else { setSortKey(k); setSortDir("desc"); } }
  const ar = k => sortKey === k ? (sortDir === "asc" ? " ↑" : " ↓") : "";

  async function handleUpload(e) {
    const f = e.target.files?.[0]; if (!f) return;
    setUploading(true);
    try {
      await loadSJ();
      const buf = await f.arrayBuffer();
      const wb = window.XLSX.read(buf, { type: "array" });
      const p = parseExcel(wb);
      if (!p.stocks.length && !p.options.length && !p.promissoryNotes.length) { alert("No positions found. Check file format."); return; }
      if (window.confirm(`Found ${p.stocks.length} stocks, ${p.options.length} options, ${p.promissoryNotes.length} notes.\nReplace current data?`)) {
        setData(p); setTimeout(fetchPrices, 500);
      }
    } catch (err) { alert("Error: " + err.message); }
    finally { setUploading(false); e.target.value = ""; }
  }

  function del(sec, id) { setData(p => ({ ...p, [sec]: p[sec].filter(x => x.id !== id) })); }

  // ─── styles ──────────────────────────────────────────────────────────────
  const _ = {
    page: { minHeight: "100vh", background: t.bg, color: t.fg, fontFamily: "'DM Sans',-apple-system,BlinkMacSystemFont,sans-serif", transition: "background .25s" },
    wrap: { maxWidth: 1440, margin: "0 auto", padding: "24px 20px 64px" },
    h1: { margin: 0, fontSize: 26, fontWeight: 800, color: t.fg2, letterSpacing: -0.5 },
    sub: { marginTop: 4, color: t.mt, fontSize: 12, display: "flex", alignItems: "center", gap: 6 },
    bar: { display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center" },
    grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12, marginBottom: 20 },
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
  const st = pStatus === "done" ? "Live" : pStatus === "error" ? "Cached" : pStatus === "loading" ? "Fetching…" : "—";

  return (
    <div style={_.page}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <div style={_.wrap}>

        <header style={{ display: "flex", justifyContent: "space-between", gap: 14, alignItems: "flex-start", marginBottom: 22, flexWrap: "wrap" }}>
          <div>
            <h1 style={_.h1}>Equity Tracker</h1>
            <div style={_.sub}>
              {new Date().toLocaleDateString("en-CA", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
              <span style={{ opacity: 0.25 }}>|</span>
              <span style={_.dot(sc)} /> {st}
            </div>
          </div>
          <div style={_.bar}>
            <select style={_.sel} value={cur} onChange={e => upd("currency", e.target.value)}>{Object.keys(CURRENCIES).map(c => <option key={c}>{c}</option>)}</select>
            <button style={_.btn(dk ? "#2a2a48" : "#e2e4ea", t.fg)} onClick={() => upd("dark", !dk)}>{dk ? "☀️" : "🌙"}</button>
            <button style={_.btn(t.acc, "#fff")} onClick={fetchPrices} disabled={pStatus === "loading"}>↻ Refresh</button>
            <button style={_.btn(t.s, t.fg, `1px solid ${t.bd}`)} onClick={() => dlFile(JSON.stringify(data, null, 2), "equity-tracker.json", "application/json")}>JSON</button>
            <button style={_.btn(t.s, t.fg, `1px solid ${t.bd}`)} onClick={() => {
              const rows = [["Section","Company","Ticker","Shares","CostBasis","Price","Value","Broker","Notes"]];
              eStocks.forEach(s => rows.push(["Stock", s.company, s.gfTicker, s.shares, s.costBasis, s.price, s.totalValue, s.broker, s.notes]));
              eOpts.forEach(o => rows.push([o.type, o.company, o.gfTicker, o.amount, o.exercisePrice, o.price, o.value, "", o.notes]));
              eNotes.forEach(n => rows.push(["Note", n.company, n.gfTicker, n.shares, n.costBasis, n.price, n.mv, "", n.notes]));
              dlFile(rows.map(r => r.join(",")).join("\n"), "equity-tracker.csv", "text/csv");
            }}>CSV</button>
            <label style={{ ..._.btn(t.s, t.fg, `1px solid ${t.bd}`), cursor: "pointer" }}>
              {uploading ? "Reading…" : "📁 Upload Excel"}
              <input type="file" accept=".xlsx,.xls" onChange={handleUpload} style={{ display: "none" }} />
            </label>
          </div>
        </header>

        <div style={_.grid}>
          <Cd dk={dk} t={t} title="Total Portfolio" value={fmt(totals.tot, cur)} />
          <Cd dk={dk} t={t} title="Stocks + Warrants" value={fmt(totals.sv, cur)} sub={`${eStocks.length} positions`} />
          <Cd dk={dk} t={t} title="Options + RSUs" value={fmt(totals.ov, cur)} sub={`${eOpts.length} grants`} />
          <Cd dk={dk} t={t} title="Unrealized P&L" value={fmt(totals.tp, cur)} sub={pf(totals.pp)} color={pc(totals.tp, dk)} />
        </div>

        {allocData.length > 1 && <div style={_.panel}><h2 style={_.st}>Allocation by Company</h2><Pie data={allocData} dark={dk} /></div>}

        <div style={{ display: "flex", gap: 5, marginBottom: 14 }}>
          {[["stocks", "Stocks & Warrants"], ["options", "Options & RSUs"], ["notes", "Promissory Notes"]].map(([k, l]) => (
            <button key={k} style={_.tab(tab === k)} onClick={() => { upd("tab", k); setSortKey(k === "options" ? "value" : "totalValue"); }}>{l}</button>
          ))}
        </div>

        <div style={{ marginBottom: 12 }}>
          <input style={{ ..._.inp, width: 280, maxWidth: "100%" }} value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" />
        </div>

        {tab === "stocks" && (
          <div style={_.panel}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1080 }}>
                <thead><tr>
                  {[["company","Company"],["gfTicker","Ticker"],["shares","Shares"],["costBasis","Cost"],["price","Price"],["mv","Mkt Val"],["pnl","P&L"],["wv","Warrants"],["totalValue","Total"],["broker","Broker"]].map(([k, l]) => (
                    <th key={k} style={_.th} onClick={() => ts(k)}>{l}{ar(k)}</th>
                  ))}
                  <th style={_.th}>%</th><th style={_.th}></th>
                </tr></thead>
                <tbody>
                  {fsort(eStocks, ["company", "gfTicker", "broker"]).map(s => {
                    const al = totals.tot > 0 ? s.totalValue / totals.tot * 100 : 0;
                    return (
                      <tr key={s.id} onMouseEnter={e => e.currentTarget.style.background = dk ? "#1e1e36" : "#f9fafb"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                        <td style={_.td}><div style={{ fontWeight: 600 }}>{s.company}</div>{s.notes && <div style={{ fontSize: 10, color: t.mt, marginTop: 1 }}>{s.notes}</div>}</td>
                        <td style={{ ..._.td, fontSize: 11 }}>{s.gfTicker || "—"}</td>
                        <td style={{ ..._.td, ..._.mn }}>{num(s.shares)}</td>
                        <td style={{ ..._.td, ..._.mn }}>{fmt(s.costBasis, "CAD", 3)}</td>
                        <td style={{ ..._.td, ..._.mn, fontWeight: 600 }}>{fmt(s.price, "CAD", 3)}</td>
                        <td style={{ ..._.td, ..._.mn, fontWeight: 600 }}>{fmt(s.mv, "CAD")}</td>
                        <td style={{ ..._.td, ..._.mn, fontWeight: 600, color: pc(s.pnl, dk) }}>{fmt(s.pnl, "CAD")}<div style={{ fontSize: 10, color: t.mt }}>{pf(s.pnlPct)}</div></td>
                        <td style={{ ..._.td, ..._.mn }}>{s.wv > 0 ? fmt(s.wv, "CAD") : "—"}{s.warrants && <div style={{ fontSize: 10, color: t.mt }}>{num(s.warrants.amount)}@{s.warrants.exercise}</div>}</td>
                        <td style={{ ..._.td, ..._.mn, fontWeight: 700 }}>{fmt(s.totalValue, "CAD")}</td>
                        <td style={_.td}>{s.broker || "—"}</td>
                        <td style={{ ..._.td, ..._.mn, fontWeight: 600 }}>{num(al, 1)}%</td>
                        <td style={_.td}><button style={_.xb(t.dns, dk ? t.dnt : t.dnt)} onClick={() => del("stocks", s.id)}>✕</button></td>
                      </tr>
                    );
                  })}
                  {!eStocks.length && <tr><td colSpan={12} style={{ ..._.td, textAlign: "center", color: t.mt, padding: 28 }}>No positions.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "options" && (
          <div style={_.panel}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 880 }}>
                <thead><tr>
                  {[["company","Company"],["type","Type"],["gfTicker","Ticker"],["amount","Amount"],["exercisePrice","Strike"],["price","Price"],["intrinsic","Intrinsic"],["value","Value"],["expiry","Expiry"]].map(([k, l]) => (
                    <th key={k} style={_.th} onClick={() => ts(k)}>{l}{ar(k)}</th>
                  ))}
                  <th style={_.th}></th>
                </tr></thead>
                <tbody>
                  {fsort(eOpts, ["company", "gfTicker", "type"]).map(o => {
                    const exp = o.expiry && new Date(o.expiry) < new Date();
                    const itm = o.type !== "RSU" && o.exercisePrice > 0 && o.price > o.exercisePrice;
                    const otm = o.type !== "RSU" && o.exercisePrice > 0 && o.price <= o.exercisePrice;
                    return (
                      <tr key={o.id} style={{ opacity: exp ? 0.35 : 1 }} onMouseEnter={e => e.currentTarget.style.background = dk ? "#1e1e36" : "#f9fafb"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                        <td style={_.td}><div style={{ fontWeight: 600 }}>{o.company}</div>{o.notes && <div style={{ fontSize: 10, color: t.mt, marginTop: 1 }}>{o.notes}</div>}</td>
                        <td style={_.td}><span style={_.badge(o.type === "RSU" ? (dk ? "#1e3a5f" : "#dbeafe") : (dk ? "#2d2d4a" : "#f3f4f6"), o.type === "RSU" ? (dk ? "#93c5fd" : "#2563eb") : t.fg)}>{o.type}</span></td>
                        <td style={{ ..._.td, fontSize: 11 }}>{o.gfTicker || "—"}</td>
                        <td style={{ ..._.td, ..._.mn }}>{num(o.amount)}</td>
                        <td style={{ ..._.td, ..._.mn }}>{o.type === "RSU" ? "—" : fmt(o.exercisePrice, "CAD", 3)}</td>
                        <td style={{ ..._.td, ..._.mn, fontWeight: 600 }}>{fmt(o.price, "CAD", 3)}</td>
                        <td style={{ ..._.td, ..._.mn, color: o.intrinsic > 0 ? t.gn : t.mt }}>{fmt(o.intrinsic, "CAD", 3)}</td>
                        <td style={{ ..._.td, ..._.mn, fontWeight: 700, color: pc(o.value, dk) }}>{fmt(o.value, "CAD")}</td>
                        <td style={_.td}>
                          {o.expiry || "—"}
                          {exp && <span style={{ ..._.badge(t.dns, dk ? t.dnt : t.dnt), marginLeft: 5 }}>Exp</span>}
                          {!exp && itm && <span style={{ ..._.badge(dk ? "#064e3b" : "#d1fae5", dk ? "#6ee7b7" : "#047857"), marginLeft: 5 }}>ITM</span>}
                          {!exp && otm && <span style={{ ..._.badge(t.dns, dk ? t.dnt : t.dnt), marginLeft: 5 }}>OTM</span>}
                        </td>
                        <td style={_.td}><button style={_.xb(t.dns, dk ? t.dnt : t.dnt)} onClick={() => del("options", o.id)}>✕</button></td>
                      </tr>
                    );
                  })}
                  {!eOpts.length && <tr><td colSpan={10} style={{ ..._.td, textAlign: "center", color: t.mt, padding: 28 }}>No options.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "notes" && (
          <div style={_.panel}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 660 }}>
                <thead><tr>
                  {[["company","Company"],["gfTicker","Ticker"],["shares","Shares"],["costBasis","Cost"],["price","Price"],["mv","Value"],["pnl","P&L"]].map(([k, l]) => (
                    <th key={k} style={_.th} onClick={() => ts(k)}>{l}{ar(k)}</th>
                  ))}
                  <th style={_.th}></th>
                </tr></thead>
                <tbody>
                  {fsort(eNotes, ["company", "gfTicker"]).map(n => (
                    <tr key={n.id} onMouseEnter={e => e.currentTarget.style.background = dk ? "#1e1e36" : "#f9fafb"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <td style={_.td}><div style={{ fontWeight: 600 }}>{n.company}</div>{n.notes && <div style={{ fontSize: 10, color: t.mt, marginTop: 1 }}>{n.notes}</div>}</td>
                      <td style={{ ..._.td, fontSize: 11 }}>{n.gfTicker || "Private"}</td>
                      <td style={{ ..._.td, ..._.mn }}>{num(n.shares)}</td>
                      <td style={{ ..._.td, ..._.mn }}>{fmt(n.costBasis, "CAD", 3)}</td>
                      <td style={{ ..._.td, ..._.mn }}>{n.price > 0 ? fmt(n.price, "CAD", 3) : "—"}</td>
                      <td style={{ ..._.td, ..._.mn, fontWeight: 600 }}>{n.price > 0 ? fmt(n.mv, "CAD") : fmt(n.cost, "CAD")}</td>
                      <td style={{ ..._.td, ..._.mn, fontWeight: 600, color: pc(n.pnl, dk) }}>{n.price > 0 ? fmt(n.pnl, "CAD") : "—"}</td>
                      <td style={_.td}><button style={_.xb(t.dns, dk ? t.dnt : t.dnt)} onClick={() => del("promissoryNotes", n.id)}>✕</button></td>
                    </tr>
                  ))}
                  {!eNotes.length && <tr><td colSpan={8} style={{ ..._.td, textAlign: "center", color: t.mt, padding: 28 }}>No notes.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div style={{ textAlign: "center", color: t.mt, fontSize: 11, marginTop: 20 }}>
          Prices via Yahoo Finance · Fallback from last spreadsheet · All values {cur}
        </div>
      </div>
    </div>
  );
}

function Cd({ dk, t, title, value, sub, color }) {
  const th = T(dk);
  return (
    <div style={{ ...th.card, padding: 14 }}>
      <div style={{ color: th.mt, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 5 }}>{title}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: color || th.fg2, fontVariantNumeric: "tabular-nums" }}>{value}</div>
      {sub && <div style={{ marginTop: 2, fontSize: 11, color: color || th.mt, fontWeight: 600 }}>{sub}</div>}
    </div>
  );
}
