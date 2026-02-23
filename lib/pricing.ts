export type Platform = "cardmarket" | "tcgplayer" | "ebay";
export type Condition = "NM" | "LP" | "MP" | "HP" | "DMG";
export type Region = "EU" | "US";

export type PricingInput = {
  observedPrice: number; // user-entered anchor in selected currency
  platform: Platform;
  condition: Condition;
  region: Region;
};

export type PricingOutput = {
  adjustedAnchor: number;
  fastPrice: number;
  balancedPrice: number;
  marginPrice: number;

  feeEstimate: number; // estimated fees on balancedPrice
  netEstimate: number; // balancedPrice - feeEstimate

  feeModelLabel: string; // show what we assumed
};

export const CONDITION_FACTOR: Record<Condition, number> = {
  NM: 1.0,
  LP: 0.92,
  MP: 0.82,
  HP: 0.7,
  DMG: 0.55,
};

// Fee model supports tiering + fixed fees where needed.
type FeeModel = {
  label: string;
  calcFee: (saleAmount: number) => number;
};

/**
 * Fee assumptions (V1):
 * - Cardmarket: selling fee = 5% of article value. (fees only; shipping excluded)
 * - TCGplayer: Level 1–4 Marketplace Seller: 10.75% commission on subtotal + (2.5% + $0.30) transaction fee.
 * - eBay US Trading Cards: 13.25% up to $7,500 per item, then 2.35% above.
 * - eBay EU: varies by site/seller type; default is a placeholder.
 */
const FEE_MODELS: Record<Region, Record<Platform, FeeModel>> = {
  EU: {
    cardmarket: {
      label: "Cardmarket: 5% selling fee (article value)",
      calcFee: (x) => 0.05 * x,
    },
    // Not EU-centric, but kept for completeness (some EU sellers use it).
    tcgplayer: {
      label: "TCGplayer: 10.75% + 2.5% + $0.30 (US-oriented preset)",
      calcFee: (x) => 0.1075 * x + 0.025 * x + 0.3,
    },
    ebay: {
      // Honest placeholder for EU in EUR. You can later add ebay.de / ebay.fr presets.
      label: "eBay (EU): varies by country & seller type (placeholder 12.8%)",
      calcFee: (x) => 0.128 * x,
    },
  },
  US: {
    cardmarket: {
      label: "Cardmarket: 5% selling fee (article value)",
      calcFee: (x) => 0.05 * x,
    },
    tcgplayer: {
      label: "TCGplayer L1–4: 10.75% commission + (2.5% + $0.30) transaction fee",
      calcFee: (x) => 0.1075 * x + 0.025 * x + 0.3,
    },
    ebay: {
      label: "eBay US Trading Cards: 13.25% up to $7,500 + 2.35% above",
      calcFee: (x) => {
        const tier1 = Math.min(x, 7500);
        const tier2 = Math.max(0, x - 7500);
        return tier1 * 0.1325 + tier2 * 0.0235;
      },
    },
  },
};

export function computePricing(input: PricingInput): PricingOutput {
  const { observedPrice, platform, condition, region } = input;

  if (!Number.isFinite(observedPrice) || observedPrice <= 0) {
    throw new Error("observedPrice must be a positive number.");
  }

  const adjustedAnchor = observedPrice * CONDITION_FACTOR[condition];

  // Strategy bands (V1)
  const fastPrice = adjustedAnchor * 0.96;
  const balancedPrice = adjustedAnchor * 1.01;
  const marginPrice = adjustedAnchor * 1.05;

  const model = FEE_MODELS[region][platform];
  const feeEstimate = model.calcFee(balancedPrice);
  const netEstimate = balancedPrice - feeEstimate;

  return {
    adjustedAnchor,
    fastPrice,
    balancedPrice,
    marginPrice,
    feeEstimate,
    netEstimate,
    feeModelLabel: model.label,
  };
}