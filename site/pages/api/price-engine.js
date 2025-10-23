// pages/api/price-engine.js
export default async function handler(req, res) {
  try {
    const response = await fetch("https://price-engine-fastapi.onrender.com/price-engine");
    const data = await response.json();

    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      model: "price-engine",
      status: "offline",
      lastUpdated: "N/A",
      data: { error: "API failed", detail: error.message },
    });
  }
}
