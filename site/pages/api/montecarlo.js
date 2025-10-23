// pages/api/montecarlo.js
export default async function handler(req, res) {
  try {
    const t0 = performance.now();
    const r = await fetch("https://montecarlo-fastapi.onrender.com/simulate");
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
      endpoint_url: "https://montecarlo-fastapi.onrender.com/simulate",
      endpoint_status: r.status,
    });
  } catch (e) {
    res.status(500).json({ status: "offline", error: e.message });
  }
}
