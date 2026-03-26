const HEADERS = { "User-Agent": "Mozilla/5.0", Accept: "application/json" };

function norm(s) {
  return String(s || "").trim().toUpperCase();
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-store");

  const raw = String(req.query?.tickers || "");
  const tickers = [...new Set(raw.split(",").map(norm).filter(Boolean))];

  if (!tickers.length) return res.status(400).json({ error: "No tickers" });

  try {
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(tickers.join(","))}`;
    const r = await fetch(url, { headers: HEADERS });
    const j = await r.json();

    const map = new Map(
      (j?.quoteResponse?.result || []).map(x => [norm(x.symbol), x])
    );

    const out = tickers.map(t => {
      const q = map.get(t);
      return {
        symbol: t,
        price: Number(q?.regularMarketPrice ?? null)
      };
    });

    return res.status(200).json({ quotes: out });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
