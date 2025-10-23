export default async function handler(req, res) {
  const endpoint = "https://rl-pricing-fastapi.onrender.com/rl-pricing";

  try {
    const apiRes = await fetch(endpoint);
    const data = await apiRes.json();

    // Check for expected fields
    if (apiRes.ok && data?.status === "online" && !data?.error && !data?.detail) {
      res.status(200).json(data);
    } else {
      res.status(500).json({
        model: data?.model || "rl-pricing",
        status: "offline",
        lastUpdated: data?.lastUpdated || new Date().toISOString(),
        data: { error: "API failed", detail: data?.detail || data?.error || "Unknown error" }
      });
    }
  } catch (error) {
    res.status(500).json({
      model: "rl-pricing",
      status: "offline",
      lastUpdated: new Date().toISOString(),
      data: { error: "API call failed.", details: error.message }
    });
  }
}
