export default function handler(req, res) {
  res.status(200).json({
    model: "garch-lstm-volatility-v0.7.8",
    status: "online",
    latency: "77ms",
    lastUpdated: "2025-10-11",
    data: {
      forecastVolatility: 0.231,
      modelType: "GARCH + LSTM",
      horizon: "30 days",
    },
  });
}
