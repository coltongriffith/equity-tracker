const HEADERS = {
  "User-Agent": "Mozilla/5.0",
  Accept: "application/json"
};

function norm(s) {
  return String(s || "").trim().toUpperCase();
}

async function fetchQuoteBatch(tickers) {
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(
    tickers.join(",")
  )}`;

  const response = await fetch(url, { headers: HEADERS });

  if (!response.ok) {
    throw new Error(`Yahoo quote returned ${response.status}`);
  }

  const json = await response.json();

  return new Map(
    (json?.quoteResponse?.result || []).map(q => [norm(q.symbol), q])
  );
}

async function fetchChartPrice(ticker) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    ticker
  )}?interval=1d&range=1d`;

  const response = await fetch(url, { headers: HEADERS });

  if (!response.ok) return null;

  const json = await response.json();
  const result = json?.chart?.result?.[0];
  if (!result) return null;

  const meta = result.meta || {};

  const priceCandidates = [
    meta.regularMarketPrice,
    meta.previousClose,
    meta.chartPreviousClose,
    meta.postMarketPrice,
    meta.preMarketPrice
  ];

  for (const p of priceCandidates) {
    const n = Number(p);
    if (Number.isFinite(n) && n > 0) return n;
  }

  return null;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Cache-Control", "no-store, max-age=0");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  const raw = String(req.query?.tickers || "");
  const tickers = [...new Set(raw.split(",").map(norm).filter(Boolean))];

  if (!tickers.length) {
    return res.status(400).json({ error: "No tickers provided", quotes: [] });
  }

  try {
    let quoteMap = new Map();

    try {
      quoteMap = await fetchQuoteBatch(tickers);
    } catch {
      quoteMap = new Map();
    }

    const quotes = [];

    for (const t of tickers) {
      const q = quoteMap.get(t);

      let price = null;

      const batchCandidates = [
        q?.regularMarketPrice,
        q?.postMarketPrice,
        q?.preMarketPrice,
        q?.previousClose
      ];

      for (const p of batchCandidates) {
        const n = Number(p);
        if (Number.isFinite(n) && n > 0) {
          price = n;
          break;
        }
      }

      if (price === null) {
        price = await fetchChartPrice(t);
      }

      quotes.push({
        requestedTicker: t,
        symbol: q?.symbol || t,
        name: q?.shortName || q?.longName || null,
        exchange: q?.fullExchangeName || q?.exchange || null,
        currency: q?.currency || null,
        price: price
      });
    }

    return res.status(200).json({ quotes });
  } catch (error) {
    return res.status(500).json({
      error: error?.message || "Unable to fetch prices",
      quotes: []
    });
  }
}
