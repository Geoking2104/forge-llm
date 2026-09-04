export type RetailerId =
  | "amazon"
  | "ldlc"
  | "materiel"
  | "topachat"
  | "fnac"
  | "apple"
  | "alternate";

export type Retailer = {
  id: RetailerId;
  name: string;
  host: string;
  searchPath: (query: string) => string;
  hosts: string[];
  advantageKeys: string[];
};

export const RETAILERS: Retailer[] = [
  {
    id: "amazon",
    name: "Amazon.fr",
    host: "https://www.amazon.fr",
    hosts: ["amazon.fr", "amzn.eu", "amzn.to", "amazon.com"],
    searchPath: (q) => `https://www.amazon.fr/s?k=${encodeURIComponent(q)}`,
    advantageKeys: ["prime", "stock", "returns"],
  },
  {
    id: "ldlc",
    name: "LDLC",
    host: "https://www.ldlc.com",
    hosts: ["ldlc.com"],
    searchPath: (q) => `https://www.ldlc.com/recherche/${encodeURIComponent(q)}/`,
    advantageKeys: ["invoice", "sav", "pickup"],
  },
  {
    id: "materiel",
    name: "Materiel.net",
    host: "https://www.materiel.net",
    hosts: ["materiel.net"],
    searchPath: (q) => `https://www.materiel.net/recherche/${encodeURIComponent(q)}`,
    advantageKeys: ["stockAlt", "invoice", "group"],
  },
  {
    id: "topachat",
    name: "TopAchat",
    host: "https://www.topachat.com",
    hosts: ["topachat.com"],
    searchPath: (q) =>
      `https://www.topachat.com/pages/recherche.php?cat=off&mc=${encodeURIComponent(q)}`,
    advantageKeys: ["price", "bundles", "gpu"],
  },
  {
    id: "fnac",
    name: "Fnac",
    host: "https://www.fnac.com",
    hosts: ["fnac.com"],
    searchPath: (q) =>
      `https://www.fnac.com/SearchResult/ResultList.aspx?Search=${encodeURIComponent(q)}&sft=1`,
    advantageKeys: ["pay4x", "collect", "network"],
  },
  {
    id: "apple",
    name: "Apple",
    host: "https://www.apple.com",
    hosts: ["apple.com"],
    searchPath: (q) => `https://www.apple.com/fr/search/${encodeURIComponent(q)}?src=serpex`,
    advantageKeys: ["official", "care", "unified"],
  },
  {
    id: "alternate",
    name: "Alternate",
    host: "https://www.alternate.fr",
    hosts: ["alternate.fr", "alternate.de"],
    searchPath: (q) => `https://www.alternate.fr/listing.xhtml?q=${encodeURIComponent(q)}`,
    advantageKeys: ["dePrice", "euWarranty", "ship"],
  },
];

export function retailerByHost(hostname: string): Retailer | null {
  const host = hostname.replace(/^www\./, "").toLowerCase();
  return (
    RETAILERS.find((r) => r.hosts.some((h) => host === h || host.endsWith(`.${h}`))) ?? null
  );
}

export function retailersForVendor(vendor: string): Retailer[] {
  if (vendor === "apple") return RETAILERS.filter((r) => r.id === "apple" || r.id === "fnac" || r.id === "amazon");
  return RETAILERS.filter((r) => r.id !== "apple");
}

export const ALLOWED_INSPECT_HOSTS = [
  ...RETAILERS.flatMap((r) => r.hosts),
  "nvidia.com",
  "store.nvidia.com",
];
