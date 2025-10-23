// pages/index.js
import Head from "next/head";
import { useEffect, useState } from "react";
import SkeletonCard from "../components/SkeletonCard";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

function StatusBadge({ status }) {
  if (status === "online") {
    return (
      <div className="flex items-center gap-2 text-sm mb-2">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
        </span>
        <span>Online</span>
      </div>
    );
  }
  if (status === "degraded") {
    return (
      <div className="flex items-center gap-2 text-sm mb-2">
        <span className="inline-block w-3 h-3 rounded-full bg-amber-400" />
        <span>Degraded</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 text-sm mb-2">
      <span className="inline-block w-3 h-3 rounded-full bg-rose-500" />
      <span>Offline</span>
    </div>
  );
}

export default function Home() {
  const [cards, setCards] = useState([]);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    const fetchCard = async (name, path) => {
      const t0 = performance.now();
      try {
        const r = await fetch(path);
        const j = await r.json();
        return {
          model: name,
          status: j?.status || (r.ok ? "online" : "offline"),
          latency: j?.latency_ms ?? Math.round(performance.now() - t0),
          version: "v1.0.0",
          framework: "PyTorch 2.6.0+cu124",
          lastUpdated: j?.lastUpdated || new Date().toISOString(),
          data: j?.data || {},
          chartData: j?.chartData || [],
          endpoint_url: j?.endpoint_url,
          endpoint_status: j?.endpoint_status,
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
      const [mc, fc] = await Promise.all([
        fetchCard("montecarlo", "/api/montecarlo"),
        fetchCard("forecast", "/api/forecast"),
      ]);
      setCards([mc, fc]);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-dashboard text-white">
      <Head><title>James Boggs – Quant Dashboard</title></Head>

      <main className="flex flex-col md:flex-row">
        <aside className="relative md:sticky md:top-0 md:h-screen md:w-1/2 lg:w-2/5 flex justify-center items-center p-6 glow-sidebar">
          <div className="flex flex-col items-center text-center space-y-5">
            <div className="circuit-frame rounded-2xl">
              <div className="circuit-inner rounded-2xl p-1">
                <img src="/profile.png" alt="Profile" className="w-72 h-80 object-cover rounded-2xl border border-[#81D8D0]/40 shadow-lg" />
              </div>
            </div>
            <h2 className="text-2xl font-extrabold mt-8">James Boggs</h2>
            <p className="text-gray-300 max-w-xs">Finance & AI/ML Engineer • Pricing • Volatility • Forecasting</p>
          </div>
        </aside>

        <section className="w-full md:w-1/2 lg:w-4/5 overflow-y-auto px-4 py-8 space-y-10">
          <header className="text-center space-y-3">
            <h1 className="text-5xl lg:text-6xl font-extrabold"> <span className="text-[#81D8D0]">LIVE QUANT DASHBOARD</span></h1>
            <p className="text-sm text-gray-400 max-w-xl mx-auto">.</p>
          </header>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {cards.length === 0 ? (
              <>
                <SkeletonCard />
                <SkeletonCard />
              </>
            ) : (
              cards.map((m, i) => (
                <div key={i}>
                  <div className="circuit-frame rounded-2xl hover:scale-[1.01] transition-transform">
                    <div className="circuit-inner rounded-2xl p-4 bg-gradient-to-br from-indigo-500/20 to-purple-600/20 backdrop-blur-sm">
                      <h2 className="text-lg font-bold text-[#81D8D0] mb-1">
                        {m.model === "montecarlo" ? "Monte Carlo" : "Forecast"}
                      </h2>
                      <StatusBadge status={m.status} />
                      <p className="text-[10px] text-gray-400 mb-2">
                        {m.version} • {m.framework} • Latency: {m.latency ? `${m.latency}ms` : "—"}
                      </p>
                      <div className="h-[140px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={m.chartData}>
                            <Line type="monotone" dataKey="y" stroke="#81D8D0" strokeWidth={2} dot={false} />
                            <XAxis dataKey="x" hide />
                            <YAxis hide />
                            <Tooltip />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                      <pre className="text-xs text-white bg-black/30 p-2 mt-3 rounded-md overflow-x-auto max-h-40">
                        {JSON.stringify(m.data, null, 2)}
                      </pre>
                      {m.endpoint_url && (
                        <p className="text-[10px] text-gray-500 mt-2 break-all">
                          Endpoint: {m.endpoint_url} • {m.endpoint_status ?? ""}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <footer className="text-center text-xs text-gray-500 pt-12 pb-4 space-y-2">
            <p>Production-style ML stack with PyTorch, FastAPI, and Render.</p>
            <p>© {new Date().getFullYear()} James Boggs Portfolio</p>
          </footer>
        </section>
      </main>
    </div>
  );
}
