// pages/api/forecast.js
export default async function handler(req, res) {
  const values = Array.from({ length: 12 }, () =>
    Math.random() * 100
  ).map((v) => +v.toFixed(2));
  try {
    const t0 = performance.now();
    const r = await fetch("https://forecast-fastapi.onrender.com/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ values }),
    });
    const j = await r.json();
    const latency = Math.round(performance.now() - t0);
    const chartData = Array.isArray(j.values)
      ? j.values.map((y, i) => ({ x: i, y: Number(y) }))
      : [];

    res.status(200).json({
      status: "online",
      latency_ms: latency,
      data: j,
      chartData,
      endpoint_url: "https://forecast-fastapi.onrender.com/predict",
      endpoint_status: r.status,
    });
  } catch (e) {
    res.status(500).json({ status: "offline", error: e.message });
  }
}
