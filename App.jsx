import React from "react";
import { useState, useMemo } from "react";

const TODAY = new Date("2026-03-25");

function fmt(date) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });
}

function fmtCurrency(val) {
  if (val === null || val === undefined || isNaN(val)) return "—";
  return val.toLocaleString("en-CA", { style: "currency", currency: "CAD", minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtNum(val) {
  if (!val) return "—";
  return val.toLocaleString();
}

function daysBetween(a, b) {
  if (!a || !b) return null;
  return Math.round((new Date(b) - new Date(a)) / (1000 * 60 * 60 * 24));
}

const COMP_GRANTS = [
  { company: "Apex Critical Metals", ticker: "APXC", type: "Option", totalShares: 150000, exercisePrice: 0.85, currentPrice: 2.23, grantDate: "2025-03-14", expiryDate: "2030-03-14", vestingSchedule: [{ pct: 0.33, date: "2025-07-14", label: "33% @ 4 mo" }, { pct: 0.33, date: "2025-11-14", label: "33% @ 8 mo" }, { pct: 0.34, date: "2026-03-14", label: "34% @ 12 mo" }], role: "Director", postTermWindow: "90 days", source: "Agreement Mar 14, 2025" },
  { company: "Apex Critical Metals", ticker: "APXC", type: "Option", totalShares: 50000, exercisePrice: 1.97, currentPrice: 2.23, grantDate: "2025-09-08", expiryDate: "2030-09-08", vestingSchedule: [{ pct: 0.33, date: "2026-01-08", label: "33% @ 4 mo" }, { pct: 0.33, date: "2026-05-08", label: "33% @ 8 mo" }, { pct: 0.34, date: "2026-09-08", label: "34% @ 12 mo" }], role: "Director", postTermWindow: "90 days", source: "Agreement Sep 8, 2025" },
  { company: "Apex Critical Metals", ticker: "APXC", type: "RSU", totalShares: 50000, exercisePrice: 0, currentPrice: 2.23, grantDate: "2025-09-08", expiryDate: null, vestingSchedule: [{ pct: 0.25, date: "2026-01-08", label: "25% Q1" }, { pct: 0.25, date: "2026-05-08", label: "25% Q2" }, { pct: 0.25, date: "2026-09-08", label: "25% Q3" }, { pct: 0.25, date: "2027-01-08", label: "25% Q4" }], role: "Director", postTermWindow: "Forfeit unvested", source: "RSU Agreement Sep 8, 2025" },
  { company: "Core Silver Corp", ticker: "CORE", type: "Option", totalShares: 25000, exercisePrice: 0.81, currentPrice: 0.48, grantDate: "2026-01-14", expiryDate: "2030-01-14", vestingSchedule: [{ pct: 1.0, date: "2026-01-14", label: "100% immediate" }], role: "Officer & Director", postTermWindow: "Until expiry", source: "Agreement Jan 14, 2026" },
  { company: "Core Silver Corp", ticker: "CORE", type: "Option", totalShares: 20000, exercisePrice: 0.61, currentPrice: 0.48, grantDate: "2024-07-21", expiryDate: "2029-07-21", vestingSchedule: [{ pct: 1.0, date: "2024-07-21", label: "Assumed vested" }], role: "Director", postTermWindow: "90 days (assumed)", source: "Spreadsheet" },
  { company: "SWMBRD Sports", ticker: "SWMBRD", type: "Option", totalShares: 50000, exercisePrice: 0.105, currentPrice: 0.01, grantDate: "2024-09-12", expiryDate: "2026-09-12", vestingSchedule: [{ pct: 1.0, date: "2024-09-12", label: "Assumed vested" }], role: "Consultant", postTermWindow: "Unknown", source: "Spreadsheet" },
  { company: "Zimtu Capital", ticker: "ZC", type: "Option", totalShares: 20000, exercisePrice: 1.125, currentPrice: 0.58, grantDate: "2024-06-10", expiryDate: "2026-06-10", vestingSchedule: [{ pct: 1.0, date: "2024-06-10", label: "Assumed vested" }], role: "Employee", postTermWindow: "Unknown", source: "Spreadsheet" },
  { company: "Zimtu Capital", ticker: "ZC", type: "Option", totalShares: 8000, exercisePrice: 1.15, currentPrice: 0.58, grantDate: "2025-03-24", expiryDate: "2027-03-24", vestingSchedule: [{ pct: 1.0, date: "2025-03-24", label: "Assumed vested" }], role: "Employee", postTermWindow: "Unknown", source: "Spreadsheet" },
  { company: "Zimtu Capital", ticker: "ZC", type: "RSU", totalShares: 50000, exercisePrice: 0, currentPrice: 0.58, grantDate: "2025-07-15", expiryDate: null, vestingSchedule: [{ pct: 1.0, date: "2026-07-29", label: "100% on vest date" }], role: "Employee", postTermWindow: "Forfeit unvested", source: "Spreadsheet" },
  { company: "Zimtu Capital", ticker: "ZC", type: "Option", totalShares: 125000, exercisePrice: 0.14, currentPrice: 0.58, grantDate: "2025-07-15", expiryDate: "2030-07-15", vestingSchedule: [{ pct: 1.0, date: "2025-07-15", label: "Assumed vested" }], role: "Employee", postTermWindow: "Unknown", source: "Spreadsheet" },
  { company: "Future Fuels Inc.", ticker: "FFLI", type: "Option", totalShares: 50000, exercisePrice: 1.2, currentPrice: 0.49, grantDate: "2023-10-20", expiryDate: "2028-10-20", vestingSchedule: [{ pct: 1.0, date: "2023-10-20", label: "Assumed vested" }], role: "Consultant", postTermWindow: "Unknown", source: "Spreadsheet" },
  { company: "Future Fuels Inc.", ticker: "FFLI", type: "RSU", totalShares: 50000, exercisePrice: 0, currentPrice: 0.49, grantDate: null, expiryDate: null, vestingSchedule: [{ pct: 1.0, date: "2026-01-01", label: "Assumed vested" }], role: "Consultant", postTermWindow: "Unknown", source: "Spreadsheet" },
  { company: "Star Copper", ticker: "STCU", type: "Option", totalShares: 50000, exercisePrice: 0.94, currentPrice: 1.05, grantDate: "2025-06-09", expiryDate: "2027-06-09", vestingSchedule: [{ pct: 1.0, date: "2025-06-09", label: "Assumed vested" }], role: "Consultant", postTermWindow: "Unknown", source: "Spreadsheet" },
];

const STOCKS = [
  { company: "Apex Critical Metals", ticker: "APXC", shares: 75000, costBasis: 0.10, currentPrice: 2.23, broker: "—" },
  { company: "Brasnova Energy", ticker: "BRAS", shares: 2500, costBasis: 0.22, currentPrice: 0.13, broker: "Cannacord" },
  { company: "Blockchain Venture", ticker: "BVC", shares: 1333, costBasis: 0.75, currentPrice: 0.20, broker: "Cannacord" },
  { company: "Star Copper", ticker: "STCU", shares: 10000, costBasis: 0.25, currentPrice: 1.05, broker: "Cannacord" },
  { company: "Discovery Energy Metals", ticker: "DERA", shares: 50000, costBasis: 0.10, currentPrice: 0.13, broker: "Ventum" },
  { company: "Aeonian Resources", ticker: "AER", shares: 6000, costBasis: 0.05, currentPrice: 0.15, broker: "Cannacord" },
  { company: "Guide AI Health", ticker: "GAID", shares: 150000, costBasis: 0.05, currentPrice: 0.05, broker: "Cannacord" },
  { company: "Core Silver Corp", ticker: "CORE", shares: 40000, costBasis: 0.25, currentPrice: 0.48, broker: "Cannacord" },
  { company: "HM Exploration", ticker: "HME", shares: 90909, costBasis: 0.11, currentPrice: 0.43, broker: "Cannacord" },
  { company: "Future Fuels Inc.", ticker: "FFLI", shares: 12500, costBasis: 0.40, currentPrice: 0.49, broker: "Ventum" },
  { company: "Sceptre Ventures", ticker: "SV", shares: 700, costBasis: 0, currentPrice: 0.28, broker: "Ventum" },
  { company: "1490660 LTD", ticker: "1490660", shares: 50000, costBasis: 0.10, currentPrice: 0.28, broker: "Cannacord" },
  { company: "Kiboko Gold", ticker: "KBG", shares: 62500, costBasis: 0.08, currentPrice: 0.17, broker: "Ventum" },
];

const WARRANTS = [
  { company: "Brasnova Energy", ticker: "BRAS", shares: 2500, exercisePrice: 0.60, currentPrice: 0.13, expiry: "2026-09-13", broker: "Cannacord" },
  { company: "Blockchain Venture", ticker: "BVC", shares: 1333, exercisePrice: 0.92, currentPrice: 0.20, expiry: null, broker: "Cannacord" },
  { company: "Future Fuels Inc.", ticker: "FFLI", shares: 10000, exercisePrice: 0.40, currentPrice: 0.49, expiry: "2026-12-19", broker: "Cannacord" },
  { company: "Star Copper", ticker: "STCU", shares: 20000, exercisePrice: 0.32, currentPrice: 1.05, expiry: "2027-04-09", broker: "Cannacord" },
  { company: "Discovery Energy Metals", ticker: "DERA", shares: 20000, exercisePrice: 0.15, currentPrice: 0.13, expiry: null, broker: "Ventum" },
  { company: "Aeonian Resources", ticker: "AER", shares: 6000, exercisePrice: 0.10, currentPrice: 0.15, expiry: null, broker: "Cannacord" },
  { company: "Core Silver Corp", ticker: "CORE", shares: 40000, exercisePrice: 0.315, currentPrice: 0.48, expiry: "2027-08-05", broker: "Cannacord" },
  { company: "HM Exploration", ticker: "HME", shares: 45455, exercisePrice: 0.16, currentPrice: 0.43, expiry: "2028-11-15", broker: "Cannacord" },
  { company: "Future Fuels Inc.", ticker: "FFLI", shares: 12500, exercisePrice: 0.60, currentPrice: 0.49, expiry: null, broker: "Ventum" },
  { company: "1490660 LTD", ticker: "1490660", shares: 50000, exercisePrice: 0.15, currentPrice: 0.28, expiry: null, broker: "Cannacord" },
  { company: "Kiboko Gold", ticker: "KBG", shares: 62500, exercisePrice: 0.12, currentPrice: 0.17, expiry: null, broker: "Ventum" },
];

const PROMISSORY = [
  { company: "SWMBRD Sports", ticker: "SWMBRD", shares: 100000, costBasis: 0.035, currentPrice: 0.01 },
  { company: "Crown Minerals", ticker: "CWMN", shares: 1600000, costBasis: 0.02, currentPrice: null },
  { company: "Capacitor Metals", ticker: "CAPM", shares: 250000, costBasis: 0.02, currentPrice: null },
];

function getVestedShares(item) {
  let v = 0;
  for (const vs of item.vestingSchedule) {
    if (new Date(vs.date) <= TODAY) v += Math.floor(item.totalShares * vs.pct);
  }
  return v;
}

function Badge({ text, bg, color, border }) {
  return <span style={{ display: "inline-block", padding: "2px 9px", borderRadius: 99, fontSize: 9, fontWeight: 600, letterSpacing: "0.03em", background: bg, color, border: `1px solid ${border}` }}>{text}</span>;
}

const SX = {
  ITM: { bg: "#0d3320", color: "#34d399", border: "#166534" },
  Vested: { bg: "#0d3320", color: "#34d399", border: "#166534" },
  OTM: { bg: "#331a1a", color: "#f87171", border: "#5f1e1e" },
  Vesting: { bg: "#332b1a", color: "#fbbf24", border: "#5f4a1e" },
  Expiring: { bg: "#332b1a", color: "#fb923c", border: "#5f3a1e" },
  Gain: { bg: "#0d3320", color: "#34d399", border: "#166534" },
  Loss: { bg: "#331a1a", color: "#f87171", border: "#5f1e1e" },
  Private: { bg: "#1a1a33", color: "#818cf8", border: "#2e2e5f" },
  Flat: { bg: "#1a1a1a", color: "#6b7280", border: "#333" },
};

function SB({ status }) { const s = SX[status] || SX.Flat; return <Badge text={status} {...s} />; }

function ProgBar({ pct }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
      <div style={{ flex: 1, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", borderRadius: 2, background: pct === 100 ? "#34d399" : "linear-gradient(90deg,#60a5fa,#a78bfa)" }} />
      </div>
      <span style={{ fontSize: 9, color: "#6b7280", minWidth: 28, textAlign: "right" }}>{Math.round(pct)}%</span>
    </div>
  );
}

function SecHead({ title, count, color = "#60a5fa" }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "24px 0 8px", padding: "0 0 5px", borderBottom: `1px solid ${color}22` }}>
      <h2 style={{ margin: 0, fontSize: 12, fontWeight: 700, color, letterSpacing: "0.04em", textTransform: "uppercase" }}>{title}</h2>
      <span style={{ fontSize: 9, color: "#4b5563" }}>{count} positions</span>
    </div>
  );
}

function Card({ label, value, sub, color }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: "11px 13px" }}>
      <div style={{ fontSize: 8, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 17, fontWeight: 700, color, marginBottom: 1 }}>{value}</div>
      <div style={{ fontSize: 9, color: "#4b5563" }}>{sub}</div>
    </div>
  );
}

function getGrantStatus(g) {
  const v = getVestedShares(g);
  if (g.type === "RSU") return v > 0 ? "Vested" : "Vesting";
  if (g.expiryDate && daysBetween(TODAY, g.expiryDate) < 90) return "Expiring";
  if (v > 0 && g.currentPrice > g.exercisePrice) return "ITM";
  if (g.currentPrice <= g.exercisePrice) return "OTM";
  return "Vesting";
}

export default function App() {
  const [tab, setTab] = useState("all");
  const [expGrant, setExpGrant] = useState(null);

  const gs = useMemo(() => {
    let ti = 0, ep = 0, vc = 0, uvc = 0;
    for (const g of COMP_GRANTS) {
      const v = getVestedShares(g);
      vc += v; uvc += g.totalShares - v;
      if (g.type === "RSU") { ti += g.totalShares * g.currentPrice; ep += v * g.currentPrice; }
      else { const sp = g.currentPrice - g.exercisePrice; if (sp > 0) { ti += g.totalShares * sp; if (v > 0) ep += v * sp; } }
    }
    return { ti, ep, vc, uvc };
  }, []);

  const sv = STOCKS.reduce((s, x) => s + x.shares * x.currentPrice, 0);
  const sc = STOCKS.reduce((s, x) => s + x.shares * x.costBasis, 0);
  const wv = WARRANTS.reduce((s, w) => { const sp = w.currentPrice - w.exercisePrice; return sp > 0 ? s + w.shares * sp : s; }, 0);
  const pv = PROMISSORY.reduce((s, p) => s + p.shares * (p.currentPrice || 0), 0);
  const pc = PROMISSORY.reduce((s, p) => s + p.shares * p.costBasis, 0);
  const total = gs.ti + sv + wv + pv;

  const tabs = [{ k: "all", l: "Overview" }, { k: "grants", l: "Options & RSUs" }, { k: "stocks", l: "Stocks" }, { k: "warrants", l: "Warrants" }, { k: "private", l: "Private" }];

  return (
    <div style={{ fontFamily: "'JetBrains Mono','SF Mono',monospace", background: "#0a0a0f", color: "#e5e7eb", minHeight: "100vh", padding: "18px 14px" }}>
      <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&display=swap" rel="stylesheet" />

      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 2 }}>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#f9fafb", letterSpacing: "-0.02em" }}>EQUITY TRACKER</h1>
          <span style={{ fontSize: 9, color: "#6b7280" }}>{fmt(TODAY)}</span>
        </div>
        <p style={{ margin: 0, fontSize: 10, color: "#4b5563" }}>Colton Griffith — Full portfolio</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))", gap: 8, marginBottom: 16 }}>
        <Card label="Total Equity" value={fmtCurrency(total)} sub="All positions" color="#f9fafb" />
        <Card label="Grants Intrinsic" value={fmtCurrency(gs.ti)} sub="ITM options + RSUs" color="#34d399" />
        <Card label="Exercisable Now" value={fmtCurrency(gs.ep)} sub="Vested & ITM" color="#60a5fa" />
        <Card label="Stocks" value={fmtCurrency(sv)} sub={`P&L: ${fmtCurrency(sv - sc)}`} color="#a78bfa" />
        <Card label="Warrants ITM" value={fmtCurrency(wv)} sub="Exercisable value" color="#fbbf24" />
        <Card label="Private" value={fmtCurrency(pv)} sub={`Cost: ${fmtCurrency(pc)}`} color="#818cf8" />
      </div>

      <div style={{ display: "flex", gap: 4, marginBottom: 14, flexWrap: "wrap" }}>
        {tabs.map(t => (
          <button key={t.k} onClick={() => setTab(t.k)} style={{
            padding: "4px 12px", borderRadius: 5,
            border: tab === t.k ? "1px solid rgba(96,165,250,0.4)" : "1px solid rgba(255,255,255,0.08)",
            background: tab === t.k ? "rgba(96,165,250,0.1)" : "transparent",
            color: tab === t.k ? "#60a5fa" : "#6b7280",
            fontSize: 10, fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
          }}>{t.l}</button>
        ))}
      </div>

      {(tab === "all" || tab === "grants") && (<>
        <SecHead title="Compensation Grants" count={COMP_GRANTS.length} color="#60a5fa" />
        <div style={{ border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(100px,1.3fr) 48px 58px 56px 58px 58px minmax(70px,1fr) 64px", padding: "7px 12px", background: "rgba(255,255,255,0.02)", borderBottom: "1px solid rgba(255,255,255,0.06)", fontSize: 8, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>
            <span>Company</span><span>Type</span><span>Shares</span><span>Strike</span><span>Price</span><span>Spread</span><span>Vested</span><span>Status</span>
          </div>
          {COMP_GRANTS.map((g, i) => {
            const v = getVestedShares(g);
            const sp = g.type === "RSU" ? g.currentPrice : g.currentPrice - g.exercisePrice;
            const st = getGrantStatus(g);
            const isE = expGrant === i;
            return (<div key={i}>
              <div onClick={() => setExpGrant(isE ? null : i)} style={{ display: "grid", gridTemplateColumns: "minmax(100px,1.3fr) 48px 58px 56px 58px 58px minmax(70px,1fr) 64px", padding: "9px 12px", borderBottom: "1px solid rgba(255,255,255,0.03)", cursor: "pointer", background: isE ? "rgba(255,255,255,0.02)" : "transparent", alignItems: "center", fontSize: 11 }}>
                <div><div style={{ fontWeight: 600, color: "#f9fafb", fontSize: 10 }}>{g.ticker}</div><div style={{ fontSize: 8, color: "#4b5563" }}>{g.company}</div></div>
                <span style={{ color: g.type === "RSU" ? "#a78bfa" : "#60a5fa", fontSize: 9, fontWeight: 500 }}>{g.type}</span>
                <span style={{ color: "#d1d5db", fontSize: 10 }}>{fmtNum(g.totalShares)}</span>
                <span style={{ color: "#6b7280", fontSize: 10 }}>{g.type === "RSU" ? "—" : `$${g.exercisePrice}`}</span>
                <span style={{ color: "#d1d5db", fontSize: 10 }}>${g.currentPrice}</span>
                <span style={{ color: sp > 0 ? "#34d399" : sp < 0 ? "#f87171" : "#6b7280", fontWeight: 500, fontSize: 10 }}>{sp > 0 ? "+" : ""}{sp.toFixed(2)}</span>
                <ProgBar pct={g.totalShares > 0 ? (v / g.totalShares) * 100 : 0} />
                <SB status={st} />
              </div>
              {isE && (
                <div style={{ padding: "10px 12px 10px 24px", background: "rgba(255,255,255,0.015)", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px 16px", fontSize: 10, color: "#9ca3af" }}>
                  <div>
                    <div style={{ color: "#6b7280", fontSize: 8, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>Vesting</div>
                    {g.vestingSchedule.map((vs, vi) => (<div key={vi} style={{ display: "flex", gap: 5, marginBottom: 1, color: new Date(vs.date) <= TODAY ? "#34d399" : "#6b7280" }}><span>{new Date(vs.date) <= TODAY ? "✓" : "○"}</span><span>{fmt(vs.date)}</span><span style={{ color: "#4b5563" }}>— {vs.label}</span></div>))}
                  </div>
                  <div>
                    <div style={{ color: "#6b7280", fontSize: 8, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>Details</div>
                    <div>Vested: <span style={{ color: "#d1d5db" }}>{fmtNum(v)}</span></div>
                    <div>Unvested: <span style={{ color: "#d1d5db" }}>{fmtNum(g.totalShares - v)}</span></div>
                    <div>Value: <span style={{ color: sp > 0 ? "#34d399" : "#f87171" }}>{fmtCurrency(v * Math.max(sp, 0))}</span></div>
                    {g.expiryDate && <div>Expires: <span style={{ color: "#d1d5db" }}>{fmt(g.expiryDate)} ({daysBetween(TODAY, g.expiryDate)}d)</span></div>}
                  </div>
                  <div>
                    <div style={{ color: "#6b7280", fontSize: 8, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>Termination</div>
                    <div>Role: <span style={{ color: "#d1d5db" }}>{g.role}</span></div>
                    <div>Window: <span style={{ color: "#d1d5db" }}>{g.postTermWindow}</span></div>
                    <div style={{ marginTop: 2, fontSize: 8, color: "#4b5563" }}>{g.source}</div>
                  </div>
                </div>
              )}
            </div>);
          })}
        </div>
      </>)}

      {(tab === "all" || tab === "stocks") && (<>
        <SecHead title="Brokerage Stocks" count={STOCKS.length} color="#a78bfa" />
        <div style={{ border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(100px,1.3fr) 64px 56px 58px 72px 72px 56px", padding: "7px 12px", background: "rgba(255,255,255,0.02)", borderBottom: "1px solid rgba(255,255,255,0.06)", fontSize: 8, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>
            <span>Company</span><span>Shares</span><span>Cost</span><span>Price</span><span>Value</span><span>P&L</span><span></span>
          </div>
          {STOCKS.map((s, i) => { const vl = s.shares * s.currentPrice; const ct = s.shares * s.costBasis; const pl = vl - ct; return (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "minmax(100px,1.3fr) 64px 56px 58px 72px 72px 56px", padding: "9px 12px", borderBottom: "1px solid rgba(255,255,255,0.03)", alignItems: "center", fontSize: 10 }}>
              <div><div style={{ fontWeight: 600, color: "#f9fafb", fontSize: 10 }}>{s.ticker}</div><div style={{ fontSize: 8, color: "#4b5563" }}>{s.broker}</div></div>
              <span style={{ color: "#d1d5db" }}>{fmtNum(s.shares)}</span>
              <span style={{ color: "#6b7280" }}>${s.costBasis}</span>
              <span style={{ color: "#d1d5db" }}>${s.currentPrice}</span>
              <span style={{ color: "#d1d5db" }}>{fmtCurrency(vl)}</span>
              <span style={{ color: pl >= 0 ? "#34d399" : "#f87171", fontWeight: 500 }}>{fmtCurrency(pl)}</span>
              <SB status={pl >= 0 ? (pl === 0 ? "Flat" : "Gain") : "Loss"} />
            </div>); })}
        </div>
      </>)}

      {(tab === "all" || tab === "warrants") && (<>
        <SecHead title="Warrants" count={WARRANTS.length} color="#fbbf24" />
        <div style={{ border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(100px,1.3fr) 60px 56px 58px 56px 68px 56px", padding: "7px 12px", background: "rgba(255,255,255,0.02)", borderBottom: "1px solid rgba(255,255,255,0.06)", fontSize: 8, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>
            <span>Company</span><span>Qty</span><span>Strike</span><span>Price</span><span>Spread</span><span>Value</span><span></span>
          </div>
          {WARRANTS.map((w, i) => { const sp = w.currentPrice - w.exercisePrice; const vl = sp > 0 ? w.shares * sp : 0; return (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "minmax(100px,1.3fr) 60px 56px 58px 56px 68px 56px", padding: "9px 12px", borderBottom: "1px solid rgba(255,255,255,0.03)", alignItems: "center", fontSize: 10 }}>
              <div><div style={{ fontWeight: 600, color: "#f9fafb", fontSize: 10 }}>{w.ticker}</div><div style={{ fontSize: 8, color: "#4b5563" }}>{w.expiry ? fmt(w.expiry) : "No exp"}</div></div>
              <span style={{ color: "#d1d5db" }}>{fmtNum(w.shares)}</span>
              <span style={{ color: "#6b7280" }}>${w.exercisePrice}</span>
              <span style={{ color: "#d1d5db" }}>${w.currentPrice}</span>
              <span style={{ color: sp > 0 ? "#34d399" : "#f87171", fontWeight: 500 }}>{sp > 0 ? "+" : ""}{sp.toFixed(2)}</span>
              <span style={{ color: "#d1d5db" }}>{fmtCurrency(vl)}</span>
              <SB status={sp > 0 ? "ITM" : "OTM"} />
            </div>); })}
        </div>
      </>)}

      {(tab === "all" || tab === "private") && (<>
        <SecHead title="Private / Promissory" count={PROMISSORY.length} color="#818cf8" />
        <div style={{ border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(120px,1.5fr) 90px 72px 68px 72px 56px", padding: "7px 12px", background: "rgba(255,255,255,0.02)", borderBottom: "1px solid rgba(255,255,255,0.06)", fontSize: 8, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>
            <span>Company</span><span>Shares</span><span>Cost</span><span>Price</span><span>P&L</span><span></span>
          </div>
          {PROMISSORY.map((p, i) => { const vl = p.shares * (p.currentPrice || 0); const ct = p.shares * p.costBasis; const pl = vl - ct; return (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "minmax(120px,1.5fr) 90px 72px 68px 72px 56px", padding: "9px 12px", borderBottom: "1px solid rgba(255,255,255,0.03)", alignItems: "center", fontSize: 10 }}>
              <div><div style={{ fontWeight: 600, color: "#f9fafb", fontSize: 10 }}>{p.ticker}</div><div style={{ fontSize: 8, color: "#4b5563" }}>{p.company}</div></div>
              <span style={{ color: "#d1d5db" }}>{fmtNum(p.shares)}</span>
              <span style={{ color: "#6b7280" }}>{fmtCurrency(ct)}</span>
              <span style={{ color: "#d1d5db" }}>{p.currentPrice ? `$${p.currentPrice}` : "Private"}</span>
              <span style={{ color: p.currentPrice ? (pl >= 0 ? "#34d399" : "#f87171") : "#6b7280", fontWeight: 500 }}>{p.currentPrice ? fmtCurrency(pl) : "N/A"}</span>
              <SB status={p.currentPrice ? (pl >= 0 ? "Gain" : "Loss") : "Private"} />
            </div>); })}
        </div>
      </>)}

      <div style={{ marginTop: 16, fontSize: 8, color: "#374151", lineHeight: 1.6 }}>
        Prices from personal spreadsheet — not live. Click grant rows to expand vesting details. Not financial or legal advice.
      </div>
    </div>
  );
}
