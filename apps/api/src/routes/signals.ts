import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { db, markets, marketSnapshots } from "@polybuddy/db";
import { desc, sql, and, gte, lte, isNotNull } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";

// US region blocking for regulatory compliance
const US_COUNTRY_CODES = ["US", "USA", "PR", "VI", "GU", "AS", "MP"]; // US territories included

function getCountryCode(request: FastifyRequest): string | null {
  // Check common headers from CDNs/proxies
  const cfCountry = request.headers["cf-ipcountry"] as string | undefined;
  if (cfCountry) return cfCountry.toUpperCase();

  const xCountry = request.headers["x-country-code"] as string | undefined;
  if (xCountry) return xCountry.toUpperCase();

  const xVercelCountry = request.headers["x-vercel-ip-country"] as string | undefined;
  if (xVercelCountry) return xVercelCountry.toUpperCase();

  // For development, check a custom header or default to non-US
  const devCountry = request.headers["x-dev-country"] as string | undefined;
  if (devCountry) return devCountry.toUpperCase();

  return null;
}

function isUSResident(request: FastifyRequest): boolean {
  const countryCode = getCountryCode(request);
  // If we can't determine country, we allow access (fail open for development)
  // In production, you might want to fail closed instead
  if (!countryCode) return false;
  return US_COUNTRY_CODES.includes(countryCode);
}

async function requireNonUS(request: FastifyRequest, reply: FastifyReply): Promise<boolean> {
  if (isUSResident(request)) {
    reply.status(451).send({
      error: "unavailable_for_legal_reasons",
      message: "This feature is not available in your region due to regulatory requirements.",
      countryDetected: getCountryCode(request),
    });
    return false;
  }
  return true;
}

// Signal types
const SignalTypeEnum = z.enum([
  "momentum",
  "contrarian",
  "liquidity_opportunity",
  "value_gap",
  "event_catalyst",
]);

const SignalStrengthEnum = z.enum(["weak", "moderate", "strong"]);

const SignalSchema = z.object({
  id: z.string(),
  marketId: z.string().uuid(),
  marketQuestion: z.string(),
  type: SignalTypeEnum,
  strength: SignalStrengthEnum,
  direction: z.enum(["bullish", "bearish"]),
  currentPrice: z.number(),
  targetPrice: z.number().nullable(),
  confidence: z.number(),
  reasoning: z.array(z.string()),
  risks: z.array(z.string()),
  timeHorizon: z.string(),
  expiresAt: z.string(),
  createdAt: z.string(),
});

type Signal = z.infer<typeof SignalSchema>;

// Helper to generate signals from market data
function generateSignals(marketData: {
  id: string;
  question: string;
  category: string | null;
  currentPrice: number;
  volume24h: number;
  spread: number | null;
  endDate: Date | null;
  qualityScore: number | null;
}[]): Signal[] {
  const signals: Signal[] = [];
  const now = new Date();

  for (const market of marketData) {
    if (!market.currentPrice || market.currentPrice <= 0) continue;

    // Momentum signal: Strong price movement with volume
    if (market.volume24h > 50000 && market.qualityScore && market.qualityScore >= 60) {
      // Check for momentum patterns
      if (market.currentPrice > 0.6 && market.currentPrice < 0.85) {
        signals.push({
          id: `momentum-${market.id}`,
          marketId: market.id,
          marketQuestion: market.question,
          type: "momentum",
          strength: market.volume24h > 100000 ? "strong" : "moderate",
          direction: "bullish",
          currentPrice: market.currentPrice,
          targetPrice: Math.min(market.currentPrice + 0.1, 0.95),
          confidence: Math.min(70 + Math.floor(market.volume24h / 10000), 90),
          reasoning: [
            `High volume (${formatVolume(market.volume24h)}) indicates strong interest`,
            `Price trending upward with consistent buying pressure`,
            `Quality score (${market.qualityScore}) suggests reliable market`,
          ],
          risks: [
            "Momentum may reverse if catalysts don't materialize",
            "High volume could indicate crowded trade",
          ],
          timeHorizon: "1-3 days",
          expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
          createdAt: now.toISOString(),
        });
      }
    }

    // Contrarian signal: Extreme prices with low confidence
    if (market.currentPrice < 0.15 || market.currentPrice > 0.85) {
      const isExtremeLow = market.currentPrice < 0.15;
      signals.push({
        id: `contrarian-${market.id}`,
        marketId: market.id,
        marketQuestion: market.question,
        type: "contrarian",
        strength: "weak",
        direction: isExtremeLow ? "bullish" : "bearish",
        currentPrice: market.currentPrice,
        targetPrice: isExtremeLow ? 0.25 : 0.75,
        confidence: 55,
        reasoning: [
          isExtremeLow
            ? `Market pricing at ${(market.currentPrice * 100).toFixed(0)}% may underestimate probability`
            : `Market pricing at ${(market.currentPrice * 100).toFixed(0)}% may overestimate certainty`,
          "Extreme pricing often reverts toward uncertainty",
        ],
        risks: [
          "Extreme prices may be justified by fundamentals",
          "Low liquidity at extremes can cause slippage",
          "Timing of reversion is uncertain",
        ],
        timeHorizon: "1-7 days",
        expiresAt: new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString(),
        createdAt: now.toISOString(),
      });
    }

    // Liquidity opportunity: Wide spread with high quality
    if (market.spread && market.spread > 0.04 && market.qualityScore && market.qualityScore >= 70) {
      signals.push({
        id: `liquidity-${market.id}`,
        marketId: market.id,
        marketQuestion: market.question,
        type: "liquidity_opportunity",
        strength: market.spread > 0.06 ? "strong" : "moderate",
        direction: "bullish", // Providing liquidity is market-neutral but we need a direction
        currentPrice: market.currentPrice,
        targetPrice: null,
        confidence: 65,
        reasoning: [
          `Wide spread (${(market.spread * 100).toFixed(1)}%) creates opportunity for limit orders`,
          `High quality score (${market.qualityScore}) suggests market won't disappear`,
          "Patient limit orders can capture spread premium",
        ],
        risks: [
          "Spread may widen further on volatility",
          "Orders may not fill if market moves away",
        ],
        timeHorizon: "Hours to days",
        expiresAt: new Date(now.getTime() + 12 * 60 * 60 * 1000).toISOString(),
        createdAt: now.toISOString(),
      });
    }

    // Event catalyst: Approaching resolution
    if (market.endDate) {
      const hoursUntilEnd = (market.endDate.getTime() - now.getTime()) / (1000 * 60 * 60);
      if (hoursUntilEnd > 0 && hoursUntilEnd < 48 && market.currentPrice > 0.3 && market.currentPrice < 0.7) {
        signals.push({
          id: `event-${market.id}`,
          marketId: market.id,
          marketQuestion: market.question,
          type: "event_catalyst",
          strength: hoursUntilEnd < 12 ? "strong" : "moderate",
          direction: market.currentPrice > 0.5 ? "bullish" : "bearish",
          currentPrice: market.currentPrice,
          targetPrice: market.currentPrice > 0.5 ? 0.85 : 0.15,
          confidence: 60,
          reasoning: [
            `Market resolves in ${hoursUntilEnd < 24 ? Math.round(hoursUntilEnd) + " hours" : Math.round(hoursUntilEnd / 24) + " days"}`,
            "Price will converge to 0 or 1 at resolution",
            `Current pricing (${(market.currentPrice * 100).toFixed(0)}%) suggests opportunity`,
          ],
          risks: [
            "Resolution outcome is uncertain",
            "Late information may shift prices rapidly",
            "Execution risk increases near resolution",
          ],
          timeHorizon: `${Math.round(hoursUntilEnd)} hours`,
          expiresAt: market.endDate.toISOString(),
          createdAt: now.toISOString(),
        });
      }
    }
  }

  // Sort by confidence descending
  signals.sort((a, b) => b.confidence - a.confidence);

  return signals;
}

function formatVolume(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

export const signalsRoutes: FastifyPluginAsync = async (app) => {
  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  // Get trading signals (non-US only)
  typedApp.get(
    "/",
    {
      schema: {
        querystring: z.object({
          type: SignalTypeEnum.optional(),
          minStrength: SignalStrengthEnum.optional(),
          limit: z.coerce.number().min(1).max(50).default(20),
        }),
        response: {
          200: z.object({
            signals: z.array(SignalSchema),
            disclaimer: z.string(),
            generatedAt: z.string(),
          }),
          401: z.object({ error: z.string() }),
          451: z.object({
            error: z.string(),
            message: z.string(),
            countryDetected: z.string().nullable(),
          }),
        },
      },
    },
    async (request, reply) => {
      // Auth check
      const user = await requireAuth(request, reply);
      if (!user) return;

      // Region check
      const allowed = await requireNonUS(request, reply);
      if (!allowed) return;

      const { type, minStrength, limit } = request.query;

      // Get markets with recent snapshots
      const recentMarkets = await db
        .select({
          id: markets.id,
          question: markets.question,
          category: markets.category,
          endDate: markets.endDate,
          qualityScore: markets.qualityScore,
          price: marketSnapshots.price,
          volume24h: marketSnapshots.volume24h,
          spread: marketSnapshots.spread,
        })
        .from(markets)
        .innerJoin(
          marketSnapshots,
          and(
            sql`${marketSnapshots.marketId} = ${markets.id}`,
            sql`${marketSnapshots.snapshotAt} > NOW() - INTERVAL '2 hours'`
          )
        )
        .where(isNotNull(markets.endDate))
        .orderBy(desc(marketSnapshots.snapshotAt))
        .limit(200);

      // Dedupe by market id (keep most recent snapshot)
      const marketMap = new Map<string, typeof recentMarkets[0]>();
      for (const m of recentMarkets) {
        if (!marketMap.has(m.id)) {
          marketMap.set(m.id, m);
        }
      }

      const marketData = Array.from(marketMap.values()).map(m => ({
        id: m.id,
        question: m.question,
        category: m.category,
        currentPrice: m.price ? Number(m.price) : 0,
        volume24h: m.volume24h ? Number(m.volume24h) : 0,
        spread: m.spread ? Number(m.spread) : null,
        endDate: m.endDate,
        qualityScore: m.qualityScore ? Number(m.qualityScore) : null,
      }));

      let signals = generateSignals(marketData);

      // Apply filters
      if (type) {
        signals = signals.filter(s => s.type === type);
      }

      if (minStrength) {
        const strengthOrder = { weak: 1, moderate: 2, strong: 3 };
        const minLevel = strengthOrder[minStrength];
        signals = signals.filter(s => strengthOrder[s.strength] >= minLevel);
      }

      signals = signals.slice(0, limit);

      return {
        signals,
        disclaimer: "Signals are for informational purposes only and do not constitute financial advice. Past performance does not guarantee future results. Always conduct your own research before making trading decisions.",
        generatedAt: new Date().toISOString(),
      };
    }
  );

  // Check if signals are available for user's region
  typedApp.get(
    "/availability",
    {
      schema: {
        response: {
          200: z.object({
            available: z.boolean(),
            countryDetected: z.string().nullable(),
            reason: z.string().nullable(),
          }),
        },
      },
    },
    async (request) => {
      const countryCode = getCountryCode(request);
      const isUS = countryCode ? US_COUNTRY_CODES.includes(countryCode) : false;

      return {
        available: !isUS,
        countryDetected: countryCode,
        reason: isUS
          ? "This feature is not available in the United States due to regulatory requirements."
          : null,
      };
    }
  );
};
