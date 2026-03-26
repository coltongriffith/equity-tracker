const HEADERS = {
  "User-Agent": "Mozilla/5.0",
  Accept: "application/json"
};

function norm(s) {
  return String(s || "").trim().toUpperCase();
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-store, max-age=0");

  const raw = String(req.query?.tickers || "");
  const tickers = [...new Set(raw.split(",").map(norm).filter(Boolean))];

  if (!tickers.length) {
    return res.status(400).json({ error: "No tickers provided" });
  }

  try {
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(
      tickers.join(",")
    )}`;

    const response = await fetch(url, { headers: HEADERS });

    if (!response.ok) {
      throw new Error(`Yahoo returned ${response.status}`);
    }

    const json = await response.json();

    const map = new Map(
      (json?.quoteResponse?.result || []).map(q => [
        norm(q.symbol),
        q
      ])
    );

    const quotes = tickers.map(t => {
      const q = map.get(t);

      return {
        requestedTicker: t,
        symbol: q?.symbol || t,
        price: Number(
          q?.regularMarketPrice ??
          q?.postMarketPrice ??
          q?.preMarketPrice ??
          null
        )
      };
    });

    return res.status(200).json({ quotes });

  } catch (error) {
    return res.status(500).json({
      error: error.message,
      quotes: []
    });
  }
}
