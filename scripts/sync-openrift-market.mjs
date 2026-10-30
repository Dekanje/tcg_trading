import fs from "node:fs/promises";
import path from "node:path";

const API_BASE = "https://openrift.app";
const USER_AGENT = "ChasingTheRiftMarket/1.0 (https://chasingtherift.com)";
const DATA_DIR = path.resolve("data");
const OUTPUT_PATH = path.join(DATA_DIR, "openrift-market.csv");
const CHUNK_COUNT = 10;

async function fetchJson(endpoint) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      Accept: "application/json",
      "User-Agent": USER_AGENT,
    },
  });

  if (!response.ok) {
    throw new Error(`${endpoint} returned ${response.status} ${response.statusText}`);
  }

  return response.json();
}

function csvCell(value) {
  if (value === null || value === undefined) return "";
  const text = String(value);
  if (/[",\n\r]/u.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

function titleCase(value) {
  if (!value) return "";
  return String(value)
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/gu, (m) => m.toUpperCase());
}

function centsToUnits(value) {
  return Number.isInteger(value) ? value / 100 : null;
}

function marketplaceAvailable(link, price) {
  return Boolean(link?.available || Number.isInteger(price));
}

function mapMarkerLabels(markerSlugs, markerBySlug) {
  return (markerSlugs ?? [])
    .map((slug) => markerBySlug.get(slug)?.label ?? slug)
    .filter(Boolean);
}

function findPromo(markerSlugs, markerLabels) {
  return (
    (markerSlugs ?? []).some((value) => String(value).toLowerCase() === "promo") ||
    markerLabels.some((value) => String(value).toLowerCase().includes("promo"))
  );
}

const [catalog, pricePayload, linkPayload] = await Promise.all([
  fetchJson("/api/v1/catalog"),
  fetchJson("/api/v1/prices"),
  fetchJson("/api/v1/prices/links"),
]);

const setById = new Map((catalog.sets ?? []).map((set) => [set.id, set]));
const markerBySlug = new Map((catalog.markers ?? []).map((marker) => [marker.slug, marker]));
const rows = [];

for (const [printingId, printing] of Object.entries(catalog.printings ?? {})) {
  const card = catalog.cards?.[printing.cardId];
  if (!card) continue;

  const set = setById.get(printing.setId);
  const prices = pricePayload.prices?.[printingId] ?? {};
  const links = linkPayload.links?.[printingId] ?? {};
  const markerLabels = mapMarkerLabels(printing.markers, markerBySlug);

  const cardmarketAvailable = marketplaceAvailable(links.cardmarket, prices.cardmarket);
  const cardtraderAvailable = marketplaceAvailable(links.cardtrader, prices.cardtrader);
  const tcgplayerAvailable = marketplaceAvailable(links.tcgplayer, prices.tcgplayer);

  const availableMarketplaces = [
    cardmarketAvailable ? "Cardmarket" : null,
    cardtraderAvailable ? "CardTrader" : null,
    tcgplayerAvailable ? "TCGplayer" : null,
  ].filter(Boolean);

  const printedName = printing.printedName || "";
  const canonicalName = card.name || printedName || "";
  const markerLabelsText = markerLabels.join(" | ");
  const isPromo = findPromo(printing.markers, markerLabels);
  const isFoil = String(printing.finish ?? "").toLowerCase() === "foil";

  rows.push({
    "Printing ID": printingId,
    "Card ID": printing.cardId,
    "Card Name": canonicalName,
    "Printed Name": printedName,
    "Card Slug": card.slug ?? "",
    "Short Code": printing.shortCode ?? "",
    "Public Code": printing.publicCode ?? "",
    "Set Code": set?.slug ?? "",
    "Set Name": set?.name ?? "",
    Language: printing.language ?? "",
    Rarity: titleCase(printing.rarity),
    Finish: titleCase(printing.finish),
    "Art Variant": titleCase(printing.artVariant),
    Markers: markerLabelsText,
    "Is Promo": isPromo,
    "Is Foil": isFoil,
    "Cardmarket Price EUR": centsToUnits(prices.cardmarket),
    "CardTrader Price EUR": centsToUnits(prices.cardtrader),
    "TCGplayer Price USD": centsToUnits(prices.tcgplayer),
    "Cardmarket Available": cardmarketAvailable,
    "CardTrader Available": cardtraderAvailable,
    "TCGplayer Available": tcgplayerAvailable,
    "Available Marketplaces": availableMarketplaces.length,
    "Market Availability": availableMarketplaces.length
      ? availableMarketplaces.join(" | ")
      : "No marketplace listing",
    "Cardmarket URL": links.cardmarket?.url ?? "",
    "CardTrader URL": links.cardtrader?.url ?? "",
    "TCGplayer URL": links.tcgplayer?.url ?? "",
    "OpenRift URL": card.slug ? `${API_BASE}/cards/${card.slug}` : "",
    "Search Text": [
      canonicalName,
      printedName,
      printing.shortCode,
      printing.publicCode,
      set?.slug,
      set?.name,
      printing.language,
      printing.rarity,
      printing.finish,
      printing.artVariant,
      markerLabelsText,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase(),
  });
}

rows.sort((a, b) => {
  return (
    a["Set Code"].localeCompare(b["Set Code"], "en", { numeric: true }) ||
    a["Short Code"].localeCompare(b["Short Code"], "en", { numeric: true }) ||
    a.Language.localeCompare(b.Language, "en") ||
    a.Finish.localeCompare(b.Finish, "en") ||
    a["Art Variant"].localeCompare(b["Art Variant"], "en")
  );
});

const headers = [
  "Printing ID",
  "Card ID",
  "Card Name",
  "Printed Name",
  "Card Slug",
  "Short Code",
  "Public Code",
  "Set Code",
  "Set Name",
  "Language",
  "Rarity",
  "Finish",
  "Art Variant",
  "Markers",
  "Is Promo",
  "Is Foil",
  "Cardmarket Price EUR",
  "CardTrader Price EUR",
  "TCGplayer Price USD",
  "Cardmarket Available",
  "CardTrader Available",
  "TCGplayer Available",
  "Available Marketplaces",
  "Market Availability",
  "Cardmarket URL",
  "CardTrader URL",
  "TCGplayer URL",
  "OpenRift URL",
  "Search Text",
];

function buildCsv(chunkRows) {
  return [
    headers.map(csvCell).join(","),
    ...chunkRows.map((row) => headers.map((header) => csvCell(row[header])).join(",")),
  ].join("\n") + "\n";
}

await fs.mkdir(DATA_DIR, { recursive: true });
await fs.writeFile(OUTPUT_PATH, buildCsv(rows), "utf8");

const chunkSize = Math.ceil(rows.length / CHUNK_COUNT);
for (let i = 0; i < CHUNK_COUNT; i += 1) {
  const start = i * chunkSize;
  const end = start + chunkSize;
  const chunkRows = rows.slice(start, end);
  const chunkPath = path.join(DATA_DIR, `openrift-market-${String(i + 1).padStart(2, "0")}.csv`);
  await fs.writeFile(chunkPath, buildCsv(chunkRows), "utf8");
}

console.log(
  `Wrote ${rows.length} OpenRift printings to ${OUTPUT_PATH} and ${CHUNK_COUNT} import chunks`,
);
