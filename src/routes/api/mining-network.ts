import { createFileRoute } from "@tanstack/react-router";
import { networkSnapshot } from "@/lib/mining/calculator";

export const Route = createFileRoute("/api/mining-network")({
  server: {
    handlers: {
      GET: async () => {
        async function load(endpoint: "blocks" | "prices") {
          const res = await fetch("https://mempool.space/api/v1/" + endpoint, {
            signal: AbortSignal.timeout(8000),
          });
          if (!res.ok) throw new Error("Network data unavailable");
          return res.json();
        }
        try {
          const [blocks, price] = await Promise.all([load("blocks"), load("prices")]);
          return Response.json(networkSnapshot(blocks, price), {
            headers: { "Cache-Control": "public, max-age=60" },
          });
        } catch {
          return Response.json({ error: "Network data unavailable" }, { status: 503 });
        }
      },
    },
  },
});
