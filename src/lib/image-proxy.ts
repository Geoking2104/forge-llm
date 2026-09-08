const ALLOWED_IMAGE_HOSTS = [
  "media.ldlc.com",
  "images.ldlc.com",
  "m.media-amazon.com",
  "images-eu.ssl-images-amazon.com",
  "images-na.ssl-images-amazon.com",
  "images-amazon.com",
  "www.nvidia.com",
  "images.nvidia.com",
  "assets.nvidia.com",
  "cdn.nvidia.com",
  "marketplace.nvidia.com",
  "www.apple.com",
  "store.storeimages.cdn-apple.com",
  "as-images.apple.com",
  "media.materiel.net",
  "www.topachat.com",
  "static.topachat.com",
  "static.fnac-static.com",
  "www.fnac.com",
  "www.alternate.fr",
  "www.alternate.de",
  "upload.wikimedia.org",
  "thumb.wikimedia.org",
  "www.amd.com",
  "www.intel.com",
  "cdn.mos.cms.futurecdn.net",
];

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const MAX_BYTES = 3_500_000;

function hostAllowed(hostname: string): boolean {
  const host = hostname.replace(/^www\./, "").toLowerCase();
  if (!host || host === "localhost" || host.endsWith(".local")) return false;
  if (/^\d/.test(host) || host.includes(":")) return false;
  if (
    host.endsWith("media-amazon.com") ||
    host.endsWith("ssl-images-amazon.com") ||
    host.endsWith("images-amazon.com") ||
    host.endsWith("cdn-apple.com") ||
    host.endsWith("apple.com") ||
    host.endsWith("nvidia.com") ||
    host.endsWith("ldlc.com")
  ) {
    return true;
  }
  return ALLOWED_IMAGE_HOSTS.some((h) => {
    const needle = h.replace(/^www\./, "");
    return host === needle || host.endsWith(`.${needle}`);
  });
}

export async function proxyProductImage(raw: string | null): Promise<Response> {
  const fail = (status: number) =>
    new Response(null, { status, headers: { "cache-control": "public, max-age=60" } });
  if (!raw) return fail(400);
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return fail(400);
  }
  if (parsed.protocol !== "https:" || !hostAllowed(parsed.hostname)) return fail(403);

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(parsed.toString(), {
      signal: ctrl.signal,
      redirect: "follow",
      headers: {
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        "User-Agent": BROWSER_UA,
        Referer: `${parsed.protocol}//${parsed.hostname}/`,
      },
    });
    if (!res.ok) return fail(502);
    const type = (res.headers.get("content-type") ?? "").split(";")[0]!.trim().toLowerCase();
    if (!type.startsWith("image/") || type.includes("svg")) return fail(415);
    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf.byteLength < 32 || buf.byteLength > MAX_BYTES) return fail(502);
    return new Response(buf, {
      status: 200,
      headers: {
        "content-type": type || "image/jpeg",
        "cache-control": "public, max-age=86400, stale-while-revalidate=604800",
        "x-content-type-options": "nosniff",
      },
    });
  } catch {
    return fail(502);
  } finally {
    clearTimeout(timer);
  }
}
