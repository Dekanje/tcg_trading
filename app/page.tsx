"use client";

import { useEffect, useMemo, useState } from "react";
import { computePricing, type Platform, type Condition, type Region } from "@/lib/pricing";
import { computeInsights } from "@/lib/insights";

type Language = "EN" | "DE" | "FR" | "ES" | "IT";

function formatMoney(value: number, locale: string, currency: "EUR" | "USD") {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

const AVAILABLE_PLATFORMS: Record<Region, Platform[]> = {
  EU: ["cardmarket", "ebay"],
  US: ["tcgplayer", "ebay"],
};

export default function Home() {
  const [cardName, setCardName] = useState("");
  const [platform, setPlatform] = useState<Platform>("cardmarket");
  const [condition, setCondition] = useState<Condition>("NM");
  const [language, setLanguage] = useState<Language>("EN");
  const [observedPrice, setObservedPrice] = useState<string>("");
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const [region, setRegion] = useState<Region>("EU");
  const currency: "EUR" | "USD" = region === "EU" ? "EUR" : "USD";
  const locale = region === "EU" ? "de-DE" : "en-US";

  const [activeModal, setActiveModal] = useState<null | "pricing" | "about">(null);

  const allowedPlatforms = AVAILABLE_PLATFORMS[region];

  // ✅ IMPORTANT: when region changes, ensure selected platform is valid
  useEffect(() => {
    if (!allowedPlatforms.includes(platform)) {
      setPlatform(allowedPlatforms[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [region]); // keep simple + stable

  const observed = useMemo(() => {
    const normalized = observedPrice.replace(",", ".");
    const n = Number(normalized);
    return Number.isFinite(n) ? n : NaN;
  }, [observedPrice]);

  const pricing = useMemo(() => {
    if (!Number.isFinite(observed) || observed <= 0) return null;

    try {
      return computePricing({
        observedPrice: observed,
        platform,
        condition,
        region,
      });
    } catch {
      return null;
    }
  }, [observed, platform, condition, region]);

  const insights = useMemo(() => {
    if (!pricing) return null;

    return computeInsights({
      observedPrice: observed,
      fastPrice: pricing.fastPrice,
      balancedPrice: pricing.balancedPrice,
      marginPrice: pricing.marginPrice,
    });
  }, [pricing, observed]);

  return (
    <div className="min-h-screen bg-[#0B0F17] text-zinc-100">
      {/* Top bar */}
      <header className="sticky top-0 z-10 border-b border-white/10 bg-[#0B0F17]/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-baseline gap-3">
            <div className="text-xl font-semibold tracking-tight">TCG Listing Assistant</div>
            <div className="text-xs text-zinc-400"> V1 Public test build</div>
          </div>

          <nav className="flex items-center gap-3">
            <button
              onClick={() => setActiveModal("pricing")}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-200 hover:bg-white/10"
            >
              Pricing Logic
            </button>

            <button
              onClick={() => setActiveModal("about")}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-200 hover:bg-white/10"
            >
              About
            </button>

            {/* Upgrade button intentionally removed for public testing */}
          </nav>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          {/* Left: Input */}
          <section className="lg:col-span-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
              <div className="mb-4">
                <h2 className="text-lg font-semibold tracking-tight">Card Input</h2>
                <p className="mt-1 text-sm text-zinc-400">
                  Enter only what you know. V1 uses your observed price as the anchor.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm text-zinc-300">Card name</label>
                  <input
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    placeholder="e.g., Charizard ex"
                    className="mt-2 w-full rounded-xl border border-white/10 bg-[#0F1624] px-4 py-3 text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-indigo-500/60"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-zinc-300">Condition</label>
                    <select
                      value={condition}
                      onChange={(e) => setCondition(e.target.value as Condition)}
                      className="mt-2 w-full rounded-xl border border-white/10 bg-[#0F1624] px-4 py-3 text-zinc-100 outline-none focus:border-indigo-500/60"
                    >
                      <option value="NM">Near Mint</option>
                      <option value="LP">Lightly Played</option>
                      <option value="MP">Moderately Played</option>
                      <option value="HP">Heavily Played</option>
                      <option value="DMG">Damaged</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm text-zinc-300">Language</label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value as Language)}
                      className="mt-2 w-full rounded-xl border border-white/10 bg-[#0F1624] px-4 py-3 text-zinc-100 outline-none focus:border-indigo-500/60"
                    >
                      <option value="EN">English</option>
                      <option value="DE">German</option>
                      <option value="FR">French</option>
                      <option value="ES">Spanish</option>
                      <option value="IT">Italian</option>
                    </select>
                  </div>
                </div>

                {/* Region toggle */}
                <div>
                  <label className="text-sm text-zinc-300">Region</label>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRegion("EU")}
                      className={[
                        "rounded-xl px-3 py-2 text-sm border transition",
                        region === "EU"
                          ? "border-indigo-500/60 bg-indigo-500/10 text-white"
                          : "border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10",
                      ].join(" ")}
                    >
                      EU (€)
                    </button>

                    <button
                      type="button"
                      onClick={() => setRegion("US")}
                      className={[
                        "rounded-xl px-3 py-2 text-sm border transition",
                        region === "US"
                          ? "border-indigo-500/60 bg-indigo-500/10 text-white"
                          : "border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10",
                      ].join(" ")}
                    >
                      US ($)
                    </button>
                  </div>

                  <p className="mt-2 text-xs text-zinc-500">
                    Switches currency formatting + fee presets. Amounts are not auto-converted.
                  </p>
                </div>

                <div>
                  <label className="text-sm text-zinc-300">
                    Observed market price ({currency === "EUR" ? "€" : "$"})
                  </label>
                  <input
                    value={observedPrice}
                    onChange={(e) => setObservedPrice(e.target.value)}
                    inputMode="decimal"
                    placeholder={currency === "EUR" ? "e.g., 12.50" : "e.g., 12.50"}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-[#0F1624] px-4 py-3 text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-indigo-500/60"
                  />
                  <p className="mt-2 text-xs text-zinc-500">Tip: You can type comma or dot (e.g. 12,50).</p>
                </div>

                {/* ✅ Marketplace preset (region-aware) */}
                <div>
                  <label className="text-sm text-zinc-300">Marketplace preset</label>

                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {allowedPlatforms.includes("cardmarket") && (
                      <PresetButton
                        active={platform === "cardmarket"}
                        onClick={() => setPlatform("cardmarket")}
                        label="Cardmarket"
                      />
                    )}

                    {allowedPlatforms.includes("tcgplayer") && (
                      <PresetButton
                        active={platform === "tcgplayer"}
                        onClick={() => setPlatform("tcgplayer")}
                        label="TCGplayer"
                      />
                    )}

                    {allowedPlatforms.includes("ebay") && (
                      <PresetButton
                        active={platform === "ebay"}
                        onClick={() => setPlatform("ebay")}
                        label="eBay"
                      />
                    )}
                  </div>

                  <p className="mt-2 text-xs text-zinc-500">
                  </p>
                </div>

                <button
                  className="mt-2 w-full rounded-xl bg-indigo-600 px-4 py-3 font-medium text-white hover:bg-indigo-500"
                  onClick={() => {
                    // V1: results update automatically from state.
                    // Later: triggers AI generation endpoint.
                  }}
                >
                  Generate Listing
                </button>

                <button
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-200 hover:bg-white/10"
                  onClick={() => setAdvancedOpen((v) => !v)}
                >
                  {advancedOpen ? "Hide" : "Show"} Advanced Pricing Options
                </button>

                {advancedOpen && (
                  <div className="rounded-xl border border-white/10 bg-[#0F1624] p-4 text-sm text-zinc-300">
                    <div className="text-zinc-200 font-medium">Advanced options (V1 placeholder)</div>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-zinc-400">
                      <li>Undercut aggressiveness</li>
                      <li>Shipping assumptions</li>
                      <li>Fee model tweaks</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Right: Results */}
          <section className="lg:col-span-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
              <div className="mb-4">
                <h2 className="text-lg font-semibold tracking-tight">Generated Listing</h2>
                <p className="mt-1 text-sm text-zinc-400">
                  V1 shows pricing bands + template text. (AI text comes later.)
                </p>
              </div>

              <div className="space-y-4">
                {!pricing ? (
                  <EmptyState />
                ) : (
                  <>
                    <ResultCard title="Pricing Strategy">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <Metric label="Fast sale price" value={formatMoney(pricing.fastPrice, locale, currency)} />
                        <Metric label="Balanced price" value={formatMoney(pricing.balancedPrice, locale, currency)} />
                        <Metric label="Margin optimized" value={formatMoney(pricing.marginPrice, locale, currency)} />
                        <Metric label="Estimated fees" value={formatMoney(pricing.feeEstimate, locale, currency)} />
                        <Metric label="Estimated net" value={formatMoney(pricing.netEstimate, locale, currency)} />
                        <Metric
                          label="Preset"
                          value={
                            platform === "cardmarket"
                              ? "Cardmarket"
                              : platform === "tcgplayer"
                              ? "TCGplayer"
                              : "eBay"
                          }
                        />
                      </div>
                      <div className="mt-3 text-xs text-zinc-500">Fee model: {pricing.feeModelLabel}</div>
                    </ResultCard>

                    <ResultCard
                      title="Listing Title"
                      rightSlot={<CopyButton text={`${cardName} — ${condition} — Pokémon TCG`} />}
                    >
                      <div className="rounded-xl border border-white/10 bg-[#0F1624] px-4 py-3 text-zinc-200">
                        {cardName || "—"} — {condition} — Pokémon TCG
                      </div>
                    </ResultCard>

                    <ResultCard
                      title="Description"
                      rightSlot={
                        <CopyButton
                          text={`Card: ${cardName}\nCondition: ${condition}\nLanguage: ${language}\n\nStored carefully. See photos for condition.\nShipped securely with protection.`}
                        />
                      }
                    >
                      <pre className="whitespace-pre-wrap rounded-xl border border-white/10 bg-[#0F1624] px-4 py-3 text-sm text-zinc-200">
{`Card: ${cardName || "—"}
Condition: ${condition}
Language: ${language}

Stored carefully. See photos for condition.
Shipped securely with protection.`}
                      </pre>
                    </ResultCard>

                    <ResultCard title="Market Insight (Estimated)">
                      <div className="flex flex-wrap gap-2">
                        <Badge label="Liquidity" value={insights?.liquidity || "Medium"} />
                        <Badge label="Volatility" value={insights?.volatility || "Medium"} />
                        <Badge label="Undercut pressure" value={insights?.undercutPressure || "Moderate"} />
                      </div>
                      <div className="mt-3 text-xs text-zinc-500">
                        Heuristic indicators in V1. We’re not claiming real-time market data.
                      </div>
                    </ResultCard>
                  </>
                )}

                <FeedbackSection
                  cardName={cardName}
                  platform={platform}
                  condition={condition}
                  observedPrice={observedPrice}
                />
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Modals (context) */}
      {activeModal && (
        <Modal
          title={activeModal === "pricing" ? "Pricing Logic (V1)" : "About this tool"}
          onClose={() => setActiveModal(null)}
        >
          {activeModal === "pricing" ? (
            <div className="space-y-3 text-sm text-zinc-200">
              <p>
                This tool is a <span className="font-medium">listing assistant</span>, not a live price oracle.
                You provide an <span className="font-medium">observed market price</span> (your anchor), and the tool suggests
                three listing strategies:
              </p>
              <ul className="list-disc pl-5 text-zinc-300 space-y-1">
                <li><span className="font-medium">Fast</span>: slightly below the anchor for quicker sale.</li>
                <li><span className="font-medium">Balanced</span>: near the anchor.</li>
                <li><span className="font-medium">Margin</span>: slightly above the anchor for higher profit.</li>
              </ul>
              <p className="text-zinc-300">
                “Market Insight” is <span className="font-medium">estimated</span> and based on price tiers/spreads, not real-time listings.
              </p>
              <p className="text-zinc-400 text-xs">
                V1 is in public testing. Fee models are “fees only” and based on standard marketplace rates.
              </p>
            </div>
          ) : (
            <div className="space-y-3 text-sm text-zinc-200">
  <p>
    I built this because I kept wasting time <span className="font-medium">guessing prices</span> and rewriting the same listing text
    when selling Pokémon cards.
  </p>

  <div className="rounded-xl border border-white/10 bg-white/5 p-3">
    <div className="text-xs font-semibold text-zinc-100">What it does in V1</div>
    <ul className="mt-2 list-disc pl-5 text-zinc-300 space-y-1">
      <li>Suggests pricing bands (Fast / Balanced / Margin) based on your observed price</li>
      <li>Estimates marketplace fees (fees only)</li>
      <li>Generates copy-ready title + description templates</li>
      <li>Shows estimated “market insight” </li>
    </ul>
  </div>


    <div className="text-xs font-semibold text-zinc-100">
      V1 is intentionally simple. Feedback helps decide what improves next.
      </div>
    <ul className="mt-2 list-disc pl-5 text-zinc-300 space-y-1">
   
    </ul>

  <p className="text-zinc-400 text-xs">
    No accounts in V1. Feedback is sent privately. Not affiliated with Cardmarket, TCGplayer, or eBay.
  </p>
</div>
          )}
        </Modal>
      )}
    </div>
  );
}

/* ---------- small UI helpers ---------- */

function PresetButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "rounded-xl px-3 py-2 text-sm border transition",
        active
          ? "border-indigo-500/60 bg-indigo-500/10 text-white"
          : "border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10",
      ].join(" ")}
      type="button"
    >
      {label}
    </button>
  );
}

function ResultCard({
  title,
  rightSlot,
  children,
}: {
  title: string;
  rightSlot?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-zinc-100">{title}</div>
        {rightSlot}
      </div>
      {children}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#0F1624] p-3">
      <div className="text-xs text-zinc-400">{label}</div>
      <div className="mt-1 text-base font-semibold text-zinc-100">{value}</div>
    </div>
  );
}

function Badge({ label, value }: { label: string; value: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#0F1624] px-3 py-1 text-sm">
      <span className="text-zinc-400">{label}:</span>
      <span className="text-zinc-100">{value}</span>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-10 text-center">
      <div className="text-zinc-200 font-medium">Enter a price to begin</div>
      <div className="mt-2 text-sm text-zinc-400">
        The results will appear here after you provide an observed market price.
      </div>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
        } catch {
          // ignore
        }
      }}
      className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-200 hover:bg-white/10"
    >
      Copy
    </button>
  );
}

function FeedbackSection(props: {
  cardName: string;
  platform: Platform;
  condition: Condition;
  observedPrice: string;
}) {
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [frequency, setFrequency] = useState("Weekly");
  const [useful, setUseful] = useState("Yes");
  const [missing, setMissing] = useState("");
  const [email, setEmail] = useState("");

  async function handleSubmit() {
    setError(null);

    if (!missing.trim()) {
      setError("Please write at least a short suggestion.");
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          frequency,
          useful,
          missing,
          email,
          meta: {
            cardName: props.cardName,
            platform: props.platform,
            condition: props.condition,
            observedPrice: props.observedPrice,
          },
        }),
      });

      if (!res.ok) {
        setError("Sending failed. Please try again.");
        return;
      }

      setSubmitted(true);
    } catch {
      setError("Sending failed. Please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      {!open ? (
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-zinc-100">💬 Help improve this tool (1 minute)</div>
            <div className="text-xs text-zinc-400">Free V1 · Your feedback shapes the roadmap</div>
          </div>
          <button
            onClick={() => setOpen(true)}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-200 hover:bg-white/10"
          >
            Give Feedback
          </button>
        </div>
      ) : submitted ? (
        <div className="text-sm text-zinc-200">✅ Thank you. Your feedback helps prioritize future features.</div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="text-sm text-zinc-300">How often do you sell cards?</label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-[#0F1624] px-4 py-2 text-zinc-100"
            >
              <option>Rarely</option>
              <option>Monthly</option>
              <option>Weekly</option>
              <option>Daily</option>
            </select>
          </div>

          <div>
            <label className="text-sm text-zinc-300">Would this save you time?</label>
            <div className="mt-2 flex gap-4 text-sm">
              {["Yes", "Maybe", "No"].map((option) => (
                <label key={option} className="flex items-center gap-2">
                  <input type="radio" checked={useful === option} onChange={() => setUseful(option)} />
                  {option}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm text-zinc-300">What is missing?</label>
            <textarea
              value={missing}
              onChange={(e) => setMissing(e.target.value)}
              rows={3}
              className="mt-2 w-full rounded-xl border border-white/10 bg-[#0F1624] px-4 py-2 text-zinc-100 placeholder:text-zinc-500"
              placeholder="Bulk mode? Auto price lookup? Better insights?"
            />
          </div>

          <div>
            <label className="text-sm text-zinc-300">Email (optional)</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-[#0F1624] px-4 py-2 text-zinc-100"
              placeholder="you@email.com"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={sending}
            className="w-full rounded-xl bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-500 disabled:opacity-60"
          >
            {sending ? "Sending..." : "Submit Feedback"}
          </button>

          {error && <div className="text-sm text-red-300">{error}</div>}
        </div>
      )}
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-xl rounded-2xl border border-white/10 bg-[#0F1624] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.6)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-base font-semibold text-zinc-100">{title}</div>
            <div className="mt-1 text-xs text-zinc-400"></div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-200 hover:bg-white/10"
          >
            Close
          </button>
        </div>

        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}