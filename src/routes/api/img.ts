import { createFileRoute } from "@tanstack/react-router";
import { proxyProductImage } from "@/lib/image-proxy";

export const Route = createFileRoute("/api/img")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const target = new URL(request.url).searchParams.get("u");
        return proxyProductImage(target);
      },
    },
  },
});
