import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { TrendingUp, TrendingDown, DollarSign, Home, Landmark, Coins, BarChart3, PieChart as PieIcon, FileText, Calendar, Calculator, Edit3, Check, X, ChevronRight, Briefcase, CreditCard, Car, Package, Building2, Wallet, CircleDot, Plus, Trash2, Upload, Download, Sun, Moon, RefreshCw, LogOut, Clock, AlertTriangle, CheckCircle2, HelpCircle, Info, ChevronDown } from "lucide-react";
import { supabase } from "./supabaseClient";

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

function y2c(gf) {
  if (!gf) return null;
  const raw = String(gf).trim().toUpperCase();
  if (!raw) return null;
  if ((/^[A-Z0-9.\-]+$/).test(raw) && !raw.includes(":")) return raw.replace(".H", "-H");
  const [ex, sym] = raw.split(":");
  if (!sym) return raw.replace(".H", "-H");
  const s = sym.replace(".H", "-H");
  if (ex === "CVE" || ex === "TSXV") return s + ".V";
  if (ex === "CNSX" || ex === "CSE") return s + ".CN";
  if (ex === "TSE" || ex === "TSX") return s + ".TO";
  return s;
}

// ─── DEFAULT DATA (empty for new users) ──────────────────────────────────────
const DD = {
  options: [],
  stocks: [],
  promissoryNotes: [],
  assets: [],
  liabilities: [],
  taxEvents: [],
  vestingEvents: [],
  taxSettings: { province: "BC", annualIncome: 0 },
};

const FP = {};

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

function TickerInput({ editing, value, companyValue, onChange, onPick, dark }) {
  const t = T(dark);
  const [q, setQ] = useState(value || "");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const boxRef = useRef(null);

  useEffect(() => { setQ(value || ""); }, [value]);

  useEffect(() => {
    if (!editing) return;
    const term = String(q || "").trim();
    if (term.length < 2) { setResults([]); setLoading(false); return; }
    const ctl = new AbortController();
    setLoading(true);
    const id = setTimeout(async () => {
      try {
        const r = await fetch(`/api/ticker-search?q=${encodeURIComponent(term)}`, { signal: ctl.signal });
        const d = await r.json();
        setResults(Array.isArray(d?.results) ? d.results : []);
        setOpen(true);
      } catch (e) {
        if (e?.name !== "AbortError") setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => { clearTimeout(id); ctl.abort(); };
  }, [q, editing]);

  useEffect(() => {
    if (!editing) return;
    const onDoc = e => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [editing]);

  if (!editing) return <span>{value || "—"}</span>;

  return (
    <div ref={boxRef} style={{ position: "relative", minWidth: 180 }}>
      <input
        style={{ height: 28, borderRadius: 6, border: `1px solid #6366f1`, background: "transparent", color: "inherit", padding: "0 6px", fontSize: 12, width: "100%", outline: "none", fontVariantNumeric: "tabular-nums" }}
        value={q}
        placeholder="Type company or ticker"
        onFocus={() => { if (results.length) setOpen(true); }}
        onChange={e => {
          const v = e.target.value.toUpperCase();
          setQ(v);
          onChange(v);
          setOpen(true);
        }}
      />
      {(open && (loading || results.length > 0 || (q || "").trim().length >= 2)) && (
        <div style={{ position: "absolute", top: 31, left: 0, right: 0, zIndex: 40, background: t.s, border: `1px solid ${t.bd}`, borderRadius: 8, boxShadow: "0 10px 30px rgba(0,0,0,0.18)", overflow: "hidden", maxHeight: 260, overflowY: "auto" }}>
          {loading && <div style={{ padding: 10, fontSize: 11, color: t.mt }}>Searching…</div>}
          {!loading && results.length === 0 && <div style={{ padding: 10, fontSize: 11, color: t.mt }}>No matches</div>}
          {!loading && results.map((r, i) => (
            <button
              key={`${r.symbol}-${i}`}
              type="button"
              onMouseDown={e => e.preventDefault()}
              onClick={() => {
                onPick(r);
                setQ(r.symbol || "");
                setOpen(false);
              }}
              style={{ width: "100%", textAlign: "left", padding: "10px 12px", border: "none", borderTop: i ? `1px solid ${t.bd}` : "none", background: "transparent", cursor: "pointer", color: t.fg }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
                <div style={{ fontWeight: 700, fontSize: 12 }}>{r.symbol}</div>
                <div style={{ fontSize: 10, color: t.mt }}>{r.exchange || ""}</div>
              </div>
              <div style={{ fontSize: 11, marginTop: 2, color: t.fg }}>{r.name || companyValue || "Unnamed company"}</div>
              <div style={{ fontSize: 10, marginTop: 3, color: t.mt, display: "flex", justifyContent: "space-between", gap: 8 }}>
                <span>{r.typeDisp || r.type || "Equity"}</span>
                <span>{r.currency || ""}{r.price != null ? ` · ${r.price}` : ""}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
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

// ─── VESTING HELPERS ─────────────────────────────────────────────────────────
function daysUntil(dateStr) {
  if (!dateStr) return null;
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  return Math.ceil((target - now) / 86400000);
}
function relTime(dateStr) {
  const d = daysUntil(dateStr);
  if (d === null) return "No date";
  if (d < 0) return `Vested ${Math.abs(d)} days ago`;
  if (d === 0) return "Vesting today!";
  if (d === 1) return "Vesting tomorrow";
  if (d <= 30) return `Vesting in ${d} days`;
  if (d <= 365) return `Vesting in ${Math.round(d / 30)} months`;
  return `Vesting in ${(d / 365).toFixed(1)} years`;
}
function vestStatus(dateStr) {
  const d = daysUntil(dateStr);
  if (d === null) return "unknown";
  if (d < 0) return "vested";
  if (d <= 30) return "soon";
  if (d <= 90) return "upcoming";
  return "future";
}

const GLOSSARY = [
  { term: "Vesting", def: "When granted equity becomes legally yours. Until shares vest, they're promised but you can't sell or transfer them." },
  { term: "RSU", def: "Restricted Stock Unit — shares granted to you at no cost that vest over time. When they vest, you receive actual shares. Vesting triggers a taxable benefit." },
  { term: "Stock Option", def: "The right to buy shares at a fixed price (the strike/exercise price). Only valuable if the market price exceeds your strike price. You choose when to exercise." },
  { term: "Cliff", def: "A waiting period before any shares vest. Common: 1-year cliff means nothing vests for the first year, then a chunk vests at once." },
  { term: "Exercise", def: "Using your stock options to buy shares at the strike price. You pay cash and receive shares. The difference between market price and strike price may be taxable." },
  { term: "Grant Date", def: "When the equity was officially promised to you. Vesting typically starts from this date." },
  { term: "Strike / Exercise Price", def: "The price you pay per share when exercising options. RSUs have no strike price — they're free when vested." },
  { term: "Tax on Vesting (RSUs)", def: "In Canada, when RSUs vest, the full market value is taxed as employment income. Plan for a tax bill equal to ~30-50% of the vested value depending on your province and bracket." },
  { term: "Tax on Exercise (Options)", def: "When you exercise stock options, the difference between the market price and your strike price is a taxable benefit. If the company is a CCPC, you may defer tax until you sell." },
];

// ─── VESTING GLOSSARY ────────────────────────────────────────────────────────
function VestGlossary({ dark }) {
  const [open, setOpen] = useState(false);
  const t = T(dark);
  return (
    <div style={{ marginBottom: 16 }}>
      <button onClick={() => setOpen(!open)} style={{ background: "none", border: `1px solid ${t.bd}`, borderRadius: 8, padding: "6px 12px", cursor: "pointer", color: t.fg, fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
        <HelpCircle size={13} style={{ color: t.acc }} /> {open ? "Hide" : "Show"} Glossary <ChevronDown size={13} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
      </button>
      {open && (
        <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 8 }}>
          {GLOSSARY.map(g => (
            <div key={g.term} style={{ ...t.card, padding: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 12, color: t.fg2, marginBottom: 3 }}>{g.term}</div>
              <div style={{ fontSize: 11, color: t.mt, lineHeight: 1.5 }}>{g.def}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── VESTING PROGRESS BAR ────────────────────────────────────────────────────
function VestProgress({ grant, dark }) {
  const t = T(dark);
  const total = grant.totalAmount || 0;
  const vested = grant.vestedAmount || 0;
  const pct = total > 0 ? (vested / total) * 100 : 0;
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: t.mt, marginBottom: 3 }}>
        <span>{N(vested)} of {N(total)} shares vested</span>
        <span style={{ fontWeight: 600 }}>{pct.toFixed(0)}%</span>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: dark ? "#272748" : "#e5e7eb", overflow: "hidden" }}>
        <div style={{ height: "100%", borderRadius: 3, background: pct >= 100 ? t.gn : t.acc, width: `${Math.min(pct, 100)}%`, transition: "width .3s" }} />
      </div>
    </div>
  );
}

// ─── EXCEL PARSER ────────────────────────────────────────────────────────────
let sj = false;
function loadSJ() { return new Promise(r => { if (sj || window.XLSX) { sj = true; r(); return; } const s = document.createElement("script"); s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"; s.onload = () => { sj = true; r(); }; document.head.appendChild(s); }); }
function parseXL(wb) {
  const res = { stocks: [], options: [], promissoryNotes: [], vestingEvents: [] }, sheet = wb.Sheets[wb.SheetNames[0]]; if (!sheet) return res;
  const rows = window.XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null }); let sec = null;

  function extractTicker(sheet, row, col) {
    const addr = window.XLSX.utils.encode_cell({ r: row, c: col });
    const cell = sheet[addr];
    if (!cell) return null;
    const sources = [cell.f, cell.v, cell.w].filter(Boolean).map(String);
    for (const s of sources) {
      let m = s.match(/GOOGLEFINANCE\("([^"]+)"\)/i);
      if (m) return m[1].toUpperCase();
      m = s.match(/GOOGLEFINANCE\(""+([^"]+)""+\)/i);
      if (m) return m[1].toUpperCase();
      m = s.match(/GOOGLEFINANCE\(\\"+"?([A-Za-z]+:[A-Za-z0-9._-]+)/i);
      if (m) return m[1].toUpperCase();
    }
    return null;
  }

  // Try to parse vesting schedule text like "25% May 8, 2026" from extra columns
  function parseVestingCols(row) {
    const dates = [];
    // Check columns 8-11 (I through L) for vesting schedule text
    for (let c = 8; c <= 11; c++) {
      const v = String(row[c] || "").trim();
      if (!v || v === "NaN") continue;
      // Match patterns like "25% May 8, 2026" or "25% Sept 8, 2026"
      const m = v.match(/(\d+)%\s+(.+)/);
      if (m) {
        const pct = Number(m[1]);
        const dateText = m[2].trim();
        const d = tryParseDate(dateText);
        if (d) dates.push({ pct, date: d });
      }
    }
    return dates;
  }

  function tryParseDate(s) {
    if (!s) return null;
    // Try standard date parse
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
    return null;
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i], a = String(row?.[0] || "").trim();
    if (a === "Options") { sec = "options"; continue; } if (a.startsWith("Stocks &")) { sec = "stocks"; continue; } if (a.startsWith("Promissory")) { sec = "promissory"; continue; }
    if (a.startsWith("Total") || a === "TOTAL" || a === "TAXES" || !a || a.startsWith("Stocks sold")) { if (a.startsWith("Stocks sold")) sec = null; continue; }
    const gf = extractTicker(sheet, i, 4);
    if (sec === "options") {
      const ex = Number(row[2]) || 0;
      const isRSU = !ex;
      const amount = Number(row[1]) || 0;
      const expiry = row[6] ? dStr(row[6]) : null;
      const grantDate = row[7] ? dStr(row[7]) : null;
      res.options.push({ id: crypto.randomUUID(), company: a, gfTicker: gf, amount, exercisePrice: ex, expiry, type: isRSU ? "RSU" : "Option", notes: "" });

      // Generate vesting events
      const vestCols = parseVestingCols(row);
      if (vestCols.length > 0) {
        // RSU with explicit vesting schedule in columns (like "25% May 8, 2026")
        vestCols.forEach(vc => {
          res.vestingEvents.push({ id: crypto.randomUUID(), company: a, gfTicker: gf, type: isRSU ? "RSU" : "Option", amount: Math.round(amount * vc.pct / 100), exercisePrice: ex, date: vc.date, notes: `${vc.pct}% vest` });
        });
      } else if (isRSU && grantDate) {
        // RSU with grant date but no detailed schedule — single vest event
        // Use vesting start date (col 8) if available, otherwise grant date + 1 year
        const vestDate = row[8] ? dStr(row[8]) : null;
        res.vestingEvents.push({ id: crypto.randomUUID(), company: a, gfTicker: gf, type: "RSU", amount, exercisePrice: 0, date: vestDate || grantDate, notes: grantDate ? `Grant: ${fmtDate(grantDate)}` : "" });
      } else if (!isRSU && expiry) {
        // Stock option — the grant itself is a vesting event (fully vested at grant, exercisable until expiry)
        res.vestingEvents.push({ id: crypto.randomUUID(), company: a, gfTicker: gf, type: "Option", amount, exercisePrice: ex, date: expiry, notes: `Expires ${fmtDate(expiry)}` });
      }
    }
    else if (sec === "stocks") { const wa = Number(row[7]) || 0; res.stocks.push({ id: crypto.randomUUID(), company: a, gfTicker: gf, shares: Number(row[1]) || 0, costBasis: Number(row[2]) || 0, broker: String(row[10] || ""), notes: "", warrants: wa > 0 ? { amount: wa, exercise: Number(row[8]) || 0, expiry: row[11] ? dStr(row[11]) : null } : null }); }
    else if (sec === "promissory") { res.promissoryNotes.push({ id: crypto.randomUUID(), company: a, gfTicker: gf, shares: Number(row[1]) || 0, costBasis: Number(row[2]) || 0, notes: "" }); }
  }
  return res;
}
function dStr(v) { if (!v) return null; if (typeof v === "number") return new Date((v - 25569) * 86400000).toISOString().split("T")[0]; return String(v).split("T")[0]; }

// ─── EMPTY STATE ─────────────────────────────────────────────────────────────
function Empty({ icon: Icon, title, sub, dark, onAdd }) {
  const t = T(dark);
  return (
    <div style={{ textAlign: "center", padding: "36px 16px" }}>
      <div style={{ width: 48, height: 48, borderRadius: 12, background: dark ? "#1c1c34" : "#f3f4f6", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}><Icon size={22} style={{ color: t.mt }} /></div>
      <div style={{ fontWeight: 600, fontSize: 14, color: t.fg, marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 12, color: t.mt, maxWidth: 360, margin: "0 auto 16px" }}>{sub}</div>
      {onAdd && <button onClick={onAdd} style={{ height: 34, border: "none", borderRadius: 8, padding: "0 16px", background: t.acc, color: "#fff", fontWeight: 600, fontSize: 12, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5 }}><Plus size={13} /> Add your first</button>}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN APP
// ═════════════════════════════════════════════════════════════════════════════
export default function App({ session }) {
  const userId = session?.user?.id;
  const userEmail = session?.user?.email;

  const [data, setData] = useState(DD);
  const [settings, setSettings] = useState({ currency: "CAD", dark: true, tab: "portfolio" });
  const [prices, setPrices] = useState(FP);
  const [nwH, setNwH] = useState([]);
  const [pSt, setPSt] = useState("idle");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("totalValue");
  const [sortDir, setSortDir] = useState("desc");
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(null);
  const [pieDetail, setPieDetail] = useState(null);
  const [dbLoaded, setDbLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [taxCalc, setTaxCalc] = useState({ gains: "", income: "0", province: "BC" });
  const saveTimer = useRef(null);

  // ─── Load from Supabase on mount ─────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data: row } = await supabase.from("user_data").select("*").eq("user_id", userId).single();
      if (row) {
        setData(row.data || DD);
        setSettings(row.settings || { currency: "CAD", dark: true, tab: "portfolio" });
        setPrices(row.prices || FP);
        setNwH(row.nw_history || []);
        const d = row.data || DD;
        setTaxCalc(p => ({ ...p, income: String(d.taxSettings?.annualIncome || 0), province: d.taxSettings?.province || "BC" }));
      } else {
        // First time user — insert empty row
        await supabase.from("user_data").insert({ user_id: userId, data: DD, settings: { currency: "CAD", dark: true, tab: "portfolio" }, prices: FP, nw_history: [] });
      }
      setDbLoaded(true);
    })();
  }, [userId]);

  // ─── Save to Supabase (debounced 1.5s after last change) ────────────────
  const saveToDb = useCallback(() => {
    if (!userId || !dbLoaded) return;
    setSaving(true);
    supabase.from("user_data").update({ data, settings, prices, nw_history: nwH, }).eq("user_id", userId).then(() => setSaving(false));
  }, [userId, dbLoaded, data, settings, prices, nwH]);

  useEffect(() => {
    if (!dbLoaded) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(saveToDb, 1500);
    return () => clearTimeout(saveTimer.current);
  }, [data, settings, prices, nwH, saveToDb, dbLoaded]);

  // Also keep localStorage as offline fallback
  useEffect(() => { if (dbLoaded) localStorage.setItem(SK, JSON.stringify(data)); }, [data, dbLoaded]);
  useEffect(() => { if (dbLoaded) localStorage.setItem(SSK, JSON.stringify(settings)); }, [settings, dbLoaded]);

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  const dk = settings.dark, cur = settings.currency, tab = settings.tab || "portfolio";
  const t = T(dk);
  const upd = useCallback((k, v) => setSettings(p => ({ ...p, [k]: v })), []);
  const updData = useCallback((section, id, field, val) => {
    setData(p => ({ ...p, [section]: (p[section] || []).map(x => x.id === id ? { ...x, [field]: val } : x) }));
  }, []);
  const updRow = useCallback((section, id, patch) => {
    setData(p => ({ ...p, [section]: (p[section] || []).map(x => x.id === id ? { ...x, ...patch } : x) }));
  }, []);
  const addItem = useCallback((section, item) => setData(p => ({ ...p, [section]: [...(p[section] || []), { id: crypto.randomUUID(), ...item }] })), []);
  const delItem = useCallback((section, id) => setData(p => ({ ...p, [section]: (p[section] || []).filter(x => x.id !== id) })), []);

  const allTk = useMemo(() => { const s = new Set(); [...(data.options || []), ...(data.stocks || []), ...(data.promissoryNotes || [])].forEach(x => x.gfTicker && s.add(x.gfTicker.toUpperCase())); return [...s]; }, [data]);

  const fetchP = useCallback(async () => {
    if (!allTk.length) { setPSt("idle"); return; }
    setPSt("loading");
    try {
      const mapped = allTk.map(tk => y2c(tk)).filter(Boolean);
      const r = await fetch(`/api/prices?tickers=${encodeURIComponent(mapped.join(","))}`, { cache: "no-store" });
      if (!r.ok) throw new Error("price fetch failed");
      const d = await r.json();
      const next = { ...prices };
      let ok = 0;
      for (const q of (d.quotes || [])) {
        const reqTk = String(q.requestedTicker || "").toUpperCase();
        const matchOriginal = allTk.find(tk => y2c(tk) === reqTk);
        if (matchOriginal && Number.isFinite(Number(q.price))) {
          next[matchOriginal.toUpperCase()] = Number(q.price);
          ok++;
        }
      }
      setPrices(next);
      setPSt(ok > 0 ? "done" : "error");
    } catch {
      setPSt("error");
    }
  }, [allTk, prices]);

  useEffect(() => {
    if (!dbLoaded || !allTk.length) return;
    fetchP();
  }, [dbLoaded, allTk, fetchP]);

  useEffect(() => {
    if (!dbLoaded || !allTk.length) return;
    const onVisible = () => { if (document.visibilityState === "visible") fetchP(); };
    const onFocus = () => fetchP();
    const onOnline = () => fetchP();
    const id = setInterval(() => { if (document.visibilityState === "visible") fetchP(); }, 60000);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onOnline);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onOnline);
    };
  }, [dbLoaded, allTk, fetchP]);

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

  // Vesting: merge from options.vestingDates (legacy) + standalone vestingEvents
  const vestE = useMemo(() => {
    const ev = [];
    // From options with vestingDates
    (data.options || []).forEach(o => { (o.vestingDates || []).forEach(v => { ev.push({ id: `${o.id}-${v.date}`, date: v.date, company: o.company, gfTicker: o.gfTicker, type: o.type, amount: v.amount, exercisePrice: o.exercisePrice || 0, currentValue: v.amount * gp(o.gfTicker), source: "option", sourceId: o.id }); }); });
    // From standalone vestingEvents
    (data.vestingEvents || []).forEach(v => { ev.push({ ...v, currentValue: (v.amount || 0) * gp(v.gfTicker), source: "standalone" }); });
    return ev.sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  }, [data.options, data.vestingEvents, gp]);

  // Group vesting by grant (company + type) for progress bars
  const vestGrants = useMemo(() => {
    const m = {};
    vestE.forEach(e => {
      const key = `${e.company}-${e.type || "RSU"}`;
      if (!m[key]) m[key] = { company: e.company, type: e.type || "RSU", gfTicker: e.gfTicker, exercisePrice: e.exercisePrice || 0, totalAmount: 0, vestedAmount: 0, events: [], currentPrice: gp(e.gfTicker) };
      m[key].totalAmount += e.amount || 0;
      if (vestStatus(e.date) === "vested") m[key].vestedAmount += e.amount || 0;
      m[key].events.push(e);
    });
    return Object.values(m);
  }, [vestE, gp]);

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

  async function handleUpload(e) { const f = e.target.files?.[0]; if (!f) return; setUploading(true); try { await loadSJ(); const p = parseXL(window.XLSX.read(await f.arrayBuffer(), { type: "array" })); if (!p.stocks.length && !p.options.length) { alert("No positions found."); return; } if (window.confirm(`Found ${p.stocks.length} stocks, ${p.options.length} options, ${p.promissoryNotes.length} notes, ${(p.vestingEvents || []).length} vesting events. Replace?`)) { setData(prev => ({ ...prev, ...p })); setTimeout(fetchP, 500); } } catch (err) { alert("Error: " + err.message); } finally { setUploading(false); e.target.value = ""; } }

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
            {saving && <span style={{ fontSize: 10, color: t.mt }}>Saving…</span>}
            <button style={_.btn(t.s, t.mt, `1px solid ${t.bd}`)} onClick={handleSignOut} title={userEmail}><LogOut size={12} /></button>
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
            {allocData.length > 0 ? <PieDetail data={allocData} dark={dk} detail={pieDetail} onSelect={setPieDetail} /> : <Empty icon={PieIcon} title="No allocation data yet" sub="Add stock or option positions to see your portfolio breakdown." dark={dk} />}
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
                    <td style={{ ..._.td, fontSize: 11 }}><TickerInput editing={ed} dark={dk} value={s.gfTicker} companyValue={s.company} onChange={v => updData("stocks", s.id, "gfTicker", v)} onPick={r => updRow("stocks", s.id, { gfTicker: r.symbol || "", company: s.company && s.company !== "New Position" ? s.company : (r.name || s.company || "") })} /></td>
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
                })}{eS.length === 0 && <tr><td colSpan={12} style={{ padding: 0, border: "none" }}><Empty icon={BarChart3} title="No stock positions yet" sub="Add your holdings manually or upload an Excel file to get started." dark={dk} onAdd={() => { addItem("stocks", { company: "New Position", gfTicker: "", shares: 0, costBasis: 0, broker: "", notes: "", warrants: null }); toggleEd("stocks"); }} /></td></tr>}</tbody>
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
                  <td style={{ ..._.td, fontSize: 11 }}><TickerInput editing={ed} dark={dk} value={o.gfTicker} companyValue={o.company} onChange={v => updData("options", o.id, "gfTicker", v)} onPick={r => updRow("options", o.id, { gfTicker: r.symbol || "", company: o.company && o.company !== "New Grant" ? o.company : (r.name || o.company || "") })} /></td>
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
                  <td style={{ ..._.td, fontSize: 11 }}><TickerInput editing={ed} dark={dk} value={n.gfTicker} companyValue={n.company} onChange={v => updData("promissoryNotes", n.id, "gfTicker", v)} onPick={r => updRow("promissoryNotes", n.id, { gfTicker: r.symbol || "", company: n.company && n.company !== "New Note" ? n.company : (r.name || n.company || "") })} /></td>
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
          {/* Explainer */}
          <div style={{ ..._.panel, display: "flex", gap: 14, alignItems: "flex-start" }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: dk ? "#1c1c34" : "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Info size={18} style={{ color: t.acc }} /></div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, color: t.fg2, marginBottom: 4 }}>How Vesting Works</div>
              <div style={{ fontSize: 12, color: t.mt, lineHeight: 1.6 }}>
                Vesting is when your equity grants become yours to keep. RSUs and stock options typically vest on a schedule — once they vest, you own the shares (RSUs) or can exercise your right to buy them (options). 
                <strong style={{ color: t.fg }}> Vesting events may trigger taxes</strong> — RSUs are taxed as employment income when they vest, and exercising options creates a taxable benefit equal to the market price minus your strike price.
              </div>
            </div>
          </div>

          {/* Summary cards */}
          <div style={_.grid}>
            <Cd dk={dk} icon={Calendar} title="Upcoming Vesting" value={$(vestE.filter(e => vestStatus(e.date) !== "vested").reduce((s, e) => s + e.currentValue, 0))} sub={`${vestE.filter(e => vestStatus(e.date) !== "vested").length} events`} />
            <Cd dk={dk} icon={CheckCircle2} title="Already Vested" value={$(vestE.filter(e => vestStatus(e.date) === "vested").reduce((s, e) => s + e.currentValue, 0))} sub={`${vestE.filter(e => vestStatus(e.date) === "vested").length} events`} />
            <Cd dk={dk} icon={AlertTriangle} title="Vesting Within 90 Days" value={$(vestE.filter(e => { const s = vestStatus(e.date); return s === "soon" || s === "upcoming"; }).reduce((s, e) => s + e.currentValue, 0))} sub="Plan for potential tax event" color={vestE.some(e => vestStatus(e.date) === "soon") ? (dk ? "#fbbf24" : "#d97706") : undefined} />
          </div>

          {/* Tax alerts for upcoming vests */}
          {vestE.filter(e => vestStatus(e.date) === "soon").length > 0 && (
            <div style={{ ..._.panel, background: dk ? "rgba(251,191,36,0.08)" : "#fffbeb", border: `1px solid ${dk ? "#78350f" : "#fde68a"}`, display: "flex", gap: 12, alignItems: "flex-start" }}>
              <AlertTriangle size={18} style={{ color: dk ? "#fbbf24" : "#d97706", flexShrink: 0, marginTop: 2 }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: dk ? "#fbbf24" : "#92400e", marginBottom: 4 }}>Vesting events coming soon</div>
                {vestE.filter(e => vestStatus(e.date) === "soon").map((e, i) => (
                  <div key={i} style={{ fontSize: 12, color: dk ? "#fcd34d" : "#78350f", marginBottom: 2 }}>
                    <strong>{e.company}</strong> — {N(e.amount)} {e.type || "shares"} {relTime(e.date)} (worth {$(e.currentValue)} today)
                    {e.type === "RSU" && <span> → taxed as income at vest</span>}
                    {e.type === "Option" && e.exercisePrice > 0 && <span> → taxable benefit of {$(Math.max(0, gp(e.gfTicker) - e.exercisePrice) * e.amount)} if exercised</span>}
                  </div>
                ))}
                <div style={{ fontSize: 11, color: dk ? "#a16207" : "#92400e", marginTop: 6 }}>Consider setting aside cash for the tax bill. Use the Tax tab calculator to estimate.</div>
              </div>
            </div>
          )}

          {/* Glossary */}
          <VestGlossary dark={dk} />

          {/* Grant progress bars */}
          {vestGrants.length > 0 && (
            <div style={_.panel}>
              <SectionHeader title="Grant Progress" icon={BarChart3} />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
                {vestGrants.map((g, i) => (
                  <div key={i} style={{ ...t.card, padding: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: t.fg2 }}>{g.company}</div>
                      <span style={_.badge(g.type === "RSU" ? (dk ? "#1e3a5f" : "#dbeafe") : (dk ? "#2d2d4a" : "#f3f4f6"), g.type === "RSU" ? (dk ? "#93c5fd" : "#2563eb") : t.fg)}>{g.type}</span>
                    </div>
                    {g.exercisePrice > 0 && <div style={{ fontSize: 11, color: t.mt }}>Strike: {$(g.exercisePrice, "CAD", 3)} · Market: {$(g.currentPrice, "CAD", 3)}</div>}
                    <VestProgress grant={g} dark={dk} />
                    <div style={{ fontSize: 11, color: t.mt, marginTop: 4 }}>
                      Current value: <strong style={{ color: t.fg }}>{$((g.type === "RSU" ? g.currentPrice : Math.max(0, g.currentPrice - g.exercisePrice)) * g.vestedAmount)}</strong> vested
                      {g.totalAmount > g.vestedAmount && <> · <strong style={{ color: t.acc }}>{$((g.type === "RSU" ? g.currentPrice : Math.max(0, g.currentPrice - g.exercisePrice)) * (g.totalAmount - g.vestedAmount))}</strong> unvested</>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Editable vesting events table */}
          <div style={_.panel}>
            <SectionHeader title="Vesting Schedule" icon={Calendar} section="vestingEvents">
              {isEd("vestingEvents") && <button style={_.btn(t.acc, "#fff")} onClick={() => addItem("vestingEvents", { company: "", gfTicker: "", type: "RSU", amount: 0, exercisePrice: 0, date: "", notes: "" })}><Plus size={12} /> Add Event</button>}
            </SectionHeader>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>
                  {["Status", "Date", "Company", "Ticker", "Type", "Shares", "Strike", "Value", ""].map(h => <th key={h} style={_.th}>{h}</th>)}
                  {isEd("vestingEvents") && <th style={_.th}></th>}
                </tr></thead>
                <tbody>
                  {/* Show all events: from options (read-only) + standalone (editable) */}
                  {vestE.map((e, i) => {
                    const st = vestStatus(e.date);
                    const d = daysUntil(e.date);
                    const editable = e.source === "standalone" && isEd("vestingEvents");
                    const statusColors = {
                      vested: { bg: dk ? "#064e3b" : "#d1fae5", fg: dk ? "#6ee7b7" : "#047857", icon: CheckCircle2, label: "Vested" },
                      soon: { bg: dk ? "#78350f33" : "#fef3c7", fg: dk ? "#fbbf24" : "#d97706", icon: AlertTriangle, label: relTime(e.date) },
                      upcoming: { bg: dk ? "#1e3a5f" : "#dbeafe", fg: dk ? "#93c5fd" : "#2563eb", icon: Clock, label: relTime(e.date) },
                      future: { bg: dk ? "#2d2d4a" : "#f3f4f6", fg: t.mt, icon: Clock, label: relTime(e.date) },
                      unknown: { bg: dk ? "#2d2d4a" : "#f3f4f6", fg: t.mt, icon: HelpCircle, label: "No date" },
                    };
                    const sc = statusColors[st] || statusColors.unknown;
                    const StIcon = sc.icon;
                    return (
                      <tr key={e.id || i} style={{ background: editable ? t.editBg : "transparent", opacity: st === "vested" ? 0.5 : 1 }}>
                        <td style={_.td}>
                          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                            <StIcon size={13} style={{ color: sc.fg }} />
                            <span style={{ ..._.badge(sc.bg, sc.fg) }}>{sc.label}</span>
                          </div>
                        </td>
                        <td style={{ ..._.td, ..._.mn, fontWeight: 600 }}>{editable ? <EC editing value={e.date} onChange={v => updData("vestingEvents", e.id, "date", v)} /> : fmtDate(e.date)}</td>
                        <td style={{ ..._.td, fontWeight: 600 }}>{editable ? <EC editing value={e.company} onChange={v => updData("vestingEvents", e.id, "company", v)} /> : e.company}</td>
                        <td style={{ ..._.td, fontSize: 11 }}>{editable ? <EC editing value={e.gfTicker} onChange={v => updData("vestingEvents", e.id, "gfTicker", v)} /> : (e.gfTicker || "—")}</td>
                        <td style={_.td}>{editable ? <select style={{ ..._.sel, height: 28, fontSize: 11 }} value={e.type || "RSU"} onChange={ev => updData("vestingEvents", e.id, "type", ev.target.value)}><option>RSU</option><option>Option</option></select> : <span style={_.badge(e.type === "RSU" ? (dk ? "#1e3a5f" : "#dbeafe") : (dk ? "#2d2d4a" : "#f3f4f6"), e.type === "RSU" ? (dk ? "#93c5fd" : "#2563eb") : t.fg)}>{e.type || "RSU"}</span>}</td>
                        <td style={{ ..._.td, ..._.mn }}>{editable ? <EC editing value={e.amount} type="number" onChange={v => updData("vestingEvents", e.id, "amount", v)} /> : N(e.amount)}</td>
                        <td style={{ ..._.td, ..._.mn }}>{editable ? <EC editing value={e.exercisePrice} type="number" step="0.001" onChange={v => updData("vestingEvents", e.id, "exercisePrice", v)} /> : (e.exercisePrice > 0 ? $(e.exercisePrice, "CAD", 3) : "—")}</td>
                        <td style={{ ..._.td, ..._.mn, fontWeight: 600 }}>{$(e.currentValue)}</td>
                        <td style={{ ..._.td, fontSize: 10, color: t.mt }}>
                          {st !== "vested" && e.type === "RSU" && "Taxed as income at vest"}
                          {st !== "vested" && e.type === "Option" && e.exercisePrice > 0 && `Benefit: ${$(Math.max(0, gp(e.gfTicker) - e.exercisePrice) * e.amount)}`}
                          {st === "vested" && e.source !== "standalone" && "From options tab"}
                        </td>
                        {isEd("vestingEvents") && <td style={_.td}>{e.source === "standalone" ? <button onClick={() => delItem("vestingEvents", e.id)} style={{ background: "none", border: "none", cursor: "pointer", color: t.rd }}><Trash2 size={13} /></button> : <span style={{ fontSize: 10, color: t.mt }}>linked</span>}</td>}
                      </tr>
                    );
                  })}
                  {vestE.length === 0 && (
                    <tr><td colSpan={10} style={{ padding: 0, border: "none" }}>
                      <Empty icon={Calendar} title="No vesting events yet" sub="Add vesting events to track when your equity grants become yours. You'll get alerts when events are approaching and reminders about tax implications." dark={dk} onAdd={() => { addItem("vestingEvents", { company: "", gfTicker: "", type: "RSU", amount: 0, exercisePrice: 0, date: "", notes: "" }); toggleEd("vestingEvents"); }} />
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
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
