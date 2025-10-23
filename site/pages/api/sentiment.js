export default function handler(req, res) {
  res.status(200).json({
    model: "sentiment-delta-v1.3.0",
    status: "online",
    latency: "66ms",
    lastUpdated: "2025-10-11",
    data: {
      sentimentScore: 0.42,
      priceImpact: "+3.8%",
      source: "Reddit + Twitter (24h window)",
    },
  });
}
