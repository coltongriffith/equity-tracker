export default async function handler(req, res) {
  // Allow CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");
 
  const { ticker } = req.query;
  if (!ticker) {
    return res.status(400).json({ error: "Missing ticker param" });
  }
 
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=1d&interval=1d`;
    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
 
    if (!response.ok) {
      return res.status(response.status).json({ error: "Yahoo Finance error" });
    }
 
    const data = await response.json();
    const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice || null;
    const currency = data?.chart?.result?.[0]?.meta?.currency || "CAD";
    const name = data?.chart?.result?.[0]?.meta?.shortName || null;
 
    return res.status(200).json({ ticker, price, currency, name });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
 
