export default async function handler(req, res) {
  try {
    const response = await fetch("https://elasticity-fastapi.onrender.com/elasticity");
    const data = await response.json();

    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      model: "elasticity",
      status: "offline",
      lastUpdated: "N/A",
      data: {
        error: "API failed",
        detail: error.message,
      },
    });
  }
}
