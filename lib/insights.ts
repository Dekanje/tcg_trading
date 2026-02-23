export type InsightLevel = "Low" | "Moderate" | "High";
export type LiquidityLevel = "Low" | "Medium" | "High";
export type VolatilityLevel = "Low" | "Medium" | "High";

export type InsightOutput = {
  liquidity: LiquidityLevel;
  volatility: VolatilityLevel;
  undercutPressure: InsightLevel;
};

export type InsightInput = {
  observedPrice: number;
  fastPrice: number;
  balancedPrice: number;
  marginPrice: number;
};

/**
 * Heuristic V1 insights:
 * - Liquidity: based on price tier (cheap sells faster)
 * - Volatility: based on spread width between fast and margin prices
 * - Undercut pressure: based on how far fast price is below observed anchor
 */
export function computeInsights(input: InsightInput): InsightOutput {
  const { observedPrice, fastPrice, balancedPrice, marginPrice } = input;

  // Liquidity by price tier (use balanced as reference, but observed is fine too)
  const ref = balancedPrice;
  let liquidity: LiquidityLevel = "Medium";
  if (ref < 20) liquidity = "High";
  else if (ref > 75) liquidity = "Low";

  // Volatility by spread width percentage
  const spreadPct = (marginPrice - fastPrice) / balancedPrice; // e.g. 0.08 = 8%
  let volatility: VolatilityLevel = "Medium";
  if (spreadPct < 0.04) volatility = "Low";
  else if (spreadPct > 0.08) volatility = "High";

  // Undercut pressure by how far fast is below observed anchor
  const undercutPct = (observedPrice - fastPrice) / observedPrice;
  let undercutPressure: InsightLevel = "Moderate";
  if (undercutPct < 0.02) undercutPressure = "Low";
  else if (undercutPct > 0.05) undercutPressure = "High";

  return { liquidity, volatility, undercutPressure };
}