import React, { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "equity-tracker-stocks";

const defaultStocks = [
  {
    id: crypto.randomUUID(),
    company: "Apex Critical Metals",
    ticker: "APXC",
    shares: 5000,
    costBasis: 0.12,
    currentPrice: 0.18,
    broker: "Canaccord",
    notes: "",
  },
  {
    id: crypto.randomUUID(),
    company: "Example Mining Co.",
    ticker: "EXM",
    shares: 12000,
    costBasis: 0.08,
    currentPrice: 0.11,
    broker: "RBC Direct",
    notes: "",
  },
];

function loadStocks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultStocks;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? parsed : defaultStocks;
  } catch {
    return defaultStocks;
  }
}

function currency(value) {
  const n = Number(value || 0);
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 2,
  }).format(n);
}

function number(value, decimals = 0) {
  return new Intl.NumberFormat("en-CA", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Number(value || 0));
}

function pnlColor(value) {
  if (value > 0) return "#0f9d58";
  if (value < 0) return "#d93025";
  return "#5f6368";
}

function blankForm() {
  return {
    id: null,
    company: "",
    ticker: "",
    shares: "",
    costBasis: "",
    currentPrice: "",
    broker: "",
    notes: "",
  };
}

function SummaryCard({ title, value, subvalue }) {
  return (
    <div style={styles.card}>
      <div style={styles.cardTitle}>{title}</div>
      <div style={styles.cardValue}>{value}</div>
      {subvalue ? <div style={styles.cardSub}>{subvalue}</div> : null}
    </div>
  );
}

function SectionTitle({ children }) {
  return <h2 style={styles.sectionTitle}>{children}</h2>;
}

export default function App() {
  const TODAY = new Date();

  const [stocks, setStocks] = useState(loadStocks);
  const [form, setForm] = useState(blankForm());
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("marketValue");
  const [sortDir, setSortDir] = useState("desc");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stocks));
  }, [stocks]);

  const enrichedStocks = useMemo(() => {
    return stocks.map((stock) => {
      const shares = Number(stock.shares || 0);
      const costBasis = Number(stock.costBasis || 0);
      const currentPrice = Number(stock.currentPrice || 0);

      const marketValue = shares * currentPrice;
      const totalCost = shares * costBasis;
      const pnl = marketValue - totalCost;
      const pnlPct = totalCost > 0 ? (pnl / totalCost) * 100 : 0;

      return {
        ...stock,
        shares,
        costBasis,
        currentPrice,
        marketValue,
        totalCost,
        pnl,
        pnlPct,
      };
    });
  }, [stocks]);

  const filteredStocks = useMemo(() => {
    const q = search.trim().toLowerCase();

    const filtered = enrichedStocks.filter((s) => {
      if (!q) return true;
      return (
        s.company.toLowerCase().includes(q) ||
        s.ticker.toLowerCase().includes(q) ||
        (s.broker || "").toLowerCase().includes(q)
      );
    });

    const sorted = [...filtered].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];

      if (typeof aVal === "string" || typeof bVal === "string") {
        const aa = String(aVal || "").toLowerCase();
        const bb = String(bVal || "").toLowerCase();
        if (aa < bb) return sortDir === "asc" ? -1 : 1;
        if (aa > bb) return sortDir === "asc" ? 1 : -1;
        return 0;
      }

      return sortDir === "asc" ? aVal - bVal : bVal - aVal;
    });

    return sorted;
  }, [enrichedStocks, search, sortKey, sortDir]);

  const totals = useMemo(() => {
    const totalMarketValue = enrichedStocks.reduce((sum, s) => sum + s.marketValue, 0);
    const totalCost = enrichedStocks.reduce((sum, s) => sum + s.totalCost, 0);
    const totalPnl = totalMarketValue - totalCost;
    const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

    return {
      totalMarketValue,
      totalCost,
      totalPnl,
      totalPnlPct,
      totalPositions: enrichedStocks.length,
    };
  }, [enrichedStocks]);

  function updateForm(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function resetForm() {
    setForm(blankForm());
    setEditingId(null);
  }

  function handleSubmit(e) {
    e.preventDefault();

    const payload = {
      id: editingId || crypto.randomUUID(),
      company: form.company.trim(),
      ticker: form.ticker.trim().toUpperCase(),
      shares: Number(form.shares || 0),
      costBasis: Number(form.costBasis || 0),
      currentPrice: Number(form.currentPrice || 0),
      broker: form.broker.trim(),
      notes: form.notes.trim(),
    };

    if (!payload.company || !payload.ticker) return;

    if (editingId) {
      setStocks((prev) => prev.map((s) => (s.id === editingId ? payload : s)));
    } else {
      setStocks((prev) => [payload, ...prev]);
    }

    resetForm();
  }

  function handleEdit(stock) {
    setEditingId(stock.id);
    setForm({
      id: stock.id,
      company: stock.company || "",
      ticker: stock.ticker || "",
      shares: stock.shares ?? "",
      costBasis: stock.costBasis ?? "",
      currentPrice: stock.currentPrice ?? "",
      broker: stock.broker || "",
      notes: stock.notes || "",
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleDelete(id) {
    setStocks((prev) => prev.filter((s) => s.id !== id));
    if (editingId === id) resetForm();
  }

  function clearAll() {
    const ok = window.confirm("Delete all stock positions?");
    if (!ok) return;
    setStocks([]);
    resetForm();
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(stocks, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "equity-tracker-stocks.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function importJson(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result);
        if (!Array.isArray(parsed)) throw new Error("Invalid file");
        setStocks(parsed);
        resetForm();
      } catch {
        alert("Could not import JSON file.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  function toggleSort(nextKey) {
    if (sortKey === nextKey) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(nextKey);
      setSortDir("desc");
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <div>
            <div style={styles.kicker}>Equity Tracker</div>
            <h1 style={styles.h1}>Portfolio Dashboard</h1>
            <div style={styles.meta}>Updated {TODAY.toLocaleDateString("en-CA")}</div>
          </div>

          <div style={styles.headerButtons}>
            <button style={styles.secondaryButton} onClick={exportJson}>
              Export JSON
            </button>
            <label style={styles.secondaryButton}>
              Import JSON
              <input
                type="file"
                accept=".json"
                onChange={importJson}
                style={{ display: "none" }}
              />
            </label>
            <button style={styles.dangerButton} onClick={clearAll}>
              Clear All
            </button>
          </div>
        </header>

        <div style={styles.summaryGrid}>
          <SummaryCard title="Total Market Value" value={currency(totals.totalMarketValue)} />
          <SummaryCard title="Total Cost" value={currency(totals.totalCost)} />
          <SummaryCard
            title="Total P&L"
            value={currency(totals.totalPnl)}
            subvalue={`${number(totals.totalPnlPct, 2)}%`}
          />
          <SummaryCard title="Positions" value={number(totals.totalPositions)} />
        </div>

        <div style={styles.panel}>
          <SectionTitle>{editingId ? "Edit Stock Position" : "Add Stock Position"}</SectionTitle>

          <form onSubmit={handleSubmit} style={styles.formGrid}>
            <div style={styles.field}>
              <label style={styles.label}>Company</label>
              <input
                style={styles.input}
                value={form.company}
                onChange={(e) => updateForm("company", e.target.value)}
                placeholder="Apex Critical Metals"
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Ticker</label>
              <input
                style={styles.input}
                value={form.ticker}
                onChange={(e) => updateForm("ticker", e.target.value)}
                placeholder="APXC"
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Shares</label>
              <input
                style={styles.input}
                type="number"
                value={form.shares}
                onChange={(e) => updateForm("shares", e.target.value)}
                placeholder="5000"
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Cost Basis</label>
              <input
                style={styles.input}
                type="number"
                step="0.0001"
                value={form.costBasis}
                onChange={(e) => updateForm("costBasis", e.target.value)}
                placeholder="0.12"
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Current Price</label>
              <input
                style={styles.input}
                type="number"
                step="0.0001"
                value={form.currentPrice}
                onChange={(e) => updateForm("currentPrice", e.target.value)}
                placeholder="0.18"
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Broker</label>
              <input
                style={styles.input}
                value={form.broker}
                onChange={(e) => updateForm("broker", e.target.value)}
                placeholder="Canaccord"
              />
            </div>

            <div style={{ ...styles.field, gridColumn: "1 / -1" }}>
              <label style={styles.label}>Notes</label>
              <textarea
                style={styles.textarea}
                rows={3}
                value={form.notes}
                onChange={(e) => updateForm("notes", e.target.value)}
                placeholder="Optional notes"
              />
            </div>

            <div style={styles.formActions}>
              <button type="submit" style={styles.primaryButton}>
                {editingId ? "Save Changes" : "Add Position"}
              </button>
              <button type="button" style={styles.secondaryButton} onClick={resetForm}>
                Cancel
              </button>
            </div>
          </form>
        </div>

        <div style={styles.panel}>
          <div style={styles.tableHeader}>
            <SectionTitle>Stocks</SectionTitle>

            <div style={styles.tableControls}>
              <input
                style={styles.search}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search company, ticker, broker"
              />
            </div>
          </div>

          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th} onClick={() => toggleSort("company")}>Company</th>
                  <th style={styles.th} onClick={() => toggleSort("ticker")}>Ticker</th>
                  <th style={styles.th} onClick={() => toggleSort("shares")}>Shares</th>
                  <th style={styles.th} onClick={() => toggleSort("costBasis")}>Cost</th>
                  <th style={styles.th} onClick={() => toggleSort("currentPrice")}>Current</th>
                  <th style={styles.th} onClick={() => toggleSort("marketValue")}>Value</th>
                  <th style={styles.th} onClick={() => toggleSort("pnl")}>P&L</th>
                  <th style={styles.th}>Broker</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStocks.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={styles.emptyCell}>
                      No positions found.
                    </td>
                  </tr>
                ) : (
                  filteredStocks.map((stock) => (
                    <tr key={stock.id}>
                      <td style={styles.td}>
                        <div style={{ fontWeight: 600 }}>{stock.company}</div>
                        {stock.notes ? <div style={styles.notes}>{stock.notes}</div> : null}
                      </td>
                      <td style={styles.td}>{stock.ticker}</td>
                      <td style={styles.td}>{number(stock.shares)}</td>
                      <td style={styles.td}>{currency(stock.costBasis)}</td>
                      <td style={styles.td}>{currency(stock.currentPrice)}</td>
                      <td style={styles.td}>{currency(stock.marketValue)}</td>
                      <td style={{ ...styles.td, color: pnlColor(stock.pnl), fontWeight: 600 }}>
                        {currency(stock.pnl)}
                        <div style={styles.notes}>{number(stock.pnlPct, 2)}%</div>
                      </td>
                      <td style={styles.td}>{stock.broker || "—"}</td>
                      <td style={styles.td}>
                        <div style={styles.rowActions}>
                          <button style={styles.smallButton} onClick={() => handleEdit(stock)}>
                            Edit
                          </button>
                          <button
                            style={styles.smallDangerButton}
                            onClick={() => handleDelete(stock.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f6f7fb",
    color: "#1f2937",
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    padding: 24,
  },
  container: {
    maxWidth: 1300,
    margin: "0 auto",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    alignItems: "flex-start",
    marginBottom: 24,
    flexWrap: "wrap",
  },
  kicker: {
    fontSize: 12,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 1,
    color: "#6b7280",
    marginBottom: 8,
  },
  h1: {
    margin: 0,
    fontSize: 32,
    lineHeight: 1.1,
  },
  meta: {
    marginTop: 8,
    color: "#6b7280",
    fontSize: 14,
  },
  headerButtons: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 16,
    marginBottom: 24,
  },
  card: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    padding: 18,
    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
  },
  cardTitle: {
    color: "#6b7280",
    fontSize: 13,
    fontWeight: 600,
    marginBottom: 8,
  },
  cardValue: {
    fontSize: 28,
    fontWeight: 700,
  },
  cardSub: {
    marginTop: 6,
    color: "#6b7280",
    fontSize: 13,
  },
  panel: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
  },
  sectionTitle: {
    margin: 0,
    marginBottom: 16,
    fontSize: 20,
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: 14,
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: 600,
    color: "#374151",
  },
  input: {
    height: 42,
    borderRadius: 10,
    border: "1px solid #d1d5db",
    padding: "0 12px",
    fontSize: 14,
    outline: "none",
  },
  textarea: {
    borderRadius: 10,
    border: "1px solid #d1d5db",
    padding: 12,
    fontSize: 14,
    resize: "vertical",
    outline: "none",
  },
  formActions: {
    gridColumn: "1 / -1",
    display: "flex",
    gap: 10,
    marginTop: 6,
    flexWrap: "wrap",
  },
  primaryButton: {
    height: 42,
    border: "none",
    borderRadius: 10,
    padding: "0 16px",
    background: "#111827",
    color: "#fff",
    fontWeight: 600,
    cursor: "pointer",
  },
  secondaryButton: {
    height: 42,
    border: "1px solid #d1d5db",
    borderRadius: 10,
    padding: "0 16px",
    background: "#fff",
    color: "#111827",
    fontWeight: 600,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },
  dangerButton: {
    height: 42,
    border: "none",
    borderRadius: 10,
    padding: "0 16px",
    background: "#b91c1c",
    color: "#fff",
    fontWeight: 600,
    cursor: "pointer",
  },
  smallButton: {
    height: 32,
    border: "1px solid #d1d5db",
    borderRadius: 8,
    padding: "0 10px",
    background: "#fff",
    cursor: "pointer",
    fontWeight: 600,
  },
  smallDangerButton: {
    height: 32,
    border: "none",
    borderRadius: 8,
    padding: "0 10px",
    background: "#fee2e2",
    color: "#991b1b",
    cursor: "pointer",
    fontWeight: 600,
  },
  tableHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    alignItems: "center",
    marginBottom: 12,
    flexWrap: "wrap",
  },
  tableControls: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    flexWrap: "wrap",
  },
  search: {
    height: 40,
    width: 280,
    maxWidth: "100%",
    borderRadius: 10,
    border: "1px solid #d1d5db",
    padding: "0 12px",
    fontSize: 14,
  },
  tableWrap: {
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: 950,
  },
  th: {
    textAlign: "left",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    color: "#6b7280",
    padding: "12px 10px",
    borderBottom: "1px solid #e5e7eb",
    cursor: "pointer",
    userSelect: "none",
  },
  td: {
    padding: "14px 10px",
    borderBottom: "1px solid #f0f2f5",
    verticalAlign: "top",
    fontSize: 14,
  },
  emptyCell: {
    padding: 24,
    textAlign: "center",
    color: "#6b7280",
  },
  notes: {
    marginTop: 4,
    fontSize: 12,
    color: "#6b7280",
  },
  rowActions: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },
};
