// pages/index.js
+ const ENDPOINTS = {
+   montecarlo: "https://montecarlo-fastapi.onrender.com/montecarlo/status",
+   forecast:   "https://forecast-fastapi.onrender.com/forecast/status",
+ };

useEffect(() => {
  const fetchCard = async (name, path) => {
    const t0 = performance.now();
    try {
-     const r = await fetch(path);
-     const j = await r.json();
+     const r = await fetch(path, { headers: { accept: "application/json" }, cache: "no-store" });
+     const ct = r.headers.get("content-type") || "";
+     if (!ct.includes("application/json")) {
+       const text = await r.text();
+       throw new Error(`Non-JSON response from ${path}: ${text.slice(0,120)}`);
+     }
+     const j = await r.json();

      return {
        model: name,
        status: j?.status || (r.ok ? "online" : "offline"),
        latency: j?.latency_ms ?? Math.round(performance.now() - t0),
        version: "v1.0.0",
        framework: "PyTorch 2.6.0+cu124",
        lastUpdated: j?.lastUpdated || new Date().toISOString(),
        data: j?.data || {},
        chartData: j?.chartData || [],
-       endpoint_url: j?.endpoint_url,
-       endpoint_status: j?.endpoint_status,
+       endpoint_url: path,
+       endpoint_status: j?.status,
      };
    } catch (e) {
      return {
        model: name,
        status: "offline",
        latency: null,
        version: "v1.0.0",
        framework: "PyTorch 2.6.0+cu124",
        lastUpdated: new Date().toISOString(),
        data: { error: e?.message || "fetch failed" },
        chartData: [],
      };
    }
  };

  (async () => {
-   const [mc, fc] = await Promise.all([
-     fetchCard("montecarlo", "/api/montecarlo"),
-     fetchCard("forecast", "/api/forecast"),
-   ]);
+   const [mc, fc] = await Promise.all([
+     fetchCard("montecarlo", ENDPOINTS.montecarlo),
+     fetchCard("forecast", ENDPOINTS.forecast),
+   ]);
    setCards([mc, fc]);
  })();
}, []);
