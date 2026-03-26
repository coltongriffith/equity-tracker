const HEADERS = { "User-Agent": "Mozilla/5.0", Accept: "application/json" };

function normalizeSymbol(symbol) {
  return String(symbol || "").trim().toUpperCase();
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Cache-Control", "no-store, max-age=0");

  if (req.method === "OPTIONS") return res.status(204).end();

  const q = String(req.query?.q || "").trim();
  if (!q || q.length < 2) return res.status(200).json({ results: [] });

  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=8&newsCount=0`;
    const response = await fetch(url, { headers: HEADERS });
    if (!response.ok) throw new Error(`Yahoo search failed`);

    const payload = await response.json();

    const results = (payload?.quotes || [])
      .filter(item => item?.symbol && !item.symbol.includes("="))
      .map(item => ({
        symbol: normalizeSymbol(item.symbol),
        name: item.shortname || item.longname || item.symbol,
        exchange: item.exchDisp || item.exchange || "",
        type: item.quoteType || "",
      }))
      .slice(0, 8);

    if (!results.length) return res.status(200).json({ results: [] });

    const symbols = results.map(r => r.symbol).join(",");
    const quoteUrl = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols)}`;

    const quoteRes = await fetch(quoteUrl, { headers: HEADERS });
    const quoteJson = quoteRes.ok ? await quoteRes.json() : { quoteResponse: { result: [] } };

    const map = new Map(
      (quoteJson?.quoteResponse?.result || []).map(q => [normalizeSymbol(q.symbol), q])
    );

    const enriched = results.map(r => {
      const q = map.get(r.symbol);
      return {
        ...r,
        price: Number(q?.regularMarketPrice ?? null)
      };
    });

    return res.status(200).json({ results: enriched });

  } catch (e) {
    return res.status(500).json({ results: [], error: e.message });
  }
}
