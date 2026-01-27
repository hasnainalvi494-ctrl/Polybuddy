// ============================================================================
// AI MARKET ANALYSIS SERVICE
// ============================================================================

export interface AIAnalysisResult {
  marketId: string;
  generatedAt: string;
  probability_estimate: number;
  confidence: "Low" | "Medium" | "High";
  thesis: string;
  counter_thesis: string;
  key_factors: string[];
  what_could_go_wrong: string[];
  news_summary?: string;
}

// ============================================================================
// REAL CLAUDE AI ANALYSIS GENERATOR
// ============================================================================

/**
 * Generate AI-powered market analysis using Claude API
 */
export async function generateAIAnalysis(
  marketId: string,
  marketQuestion: string,
  currentPrice: number | null
): Promise<AIAnalysisResult> {
  console.log(`[AI] Generating analysis for market: ${marketQuestion}`);

  const price = currentPrice || 0.5;
  
  // Try real Claude API first, fallback to mock if no API key or error
  if (process.env.CLAUDE_API_KEY) {
    try {
      const analysis = await callClaudeAPI(marketQuestion, price);
      return {
        marketId,
        generatedAt: new Date().toISOString(),
        ...analysis,
      };
    } catch (error) {
      console.error("[AI] Claude API error, falling back to mock:", error);
    }
  } else {
    console.warn("[AI] CLAUDE_API_KEY not set, using mock analysis");
  }
  
  // Fallback to mock analysis
  const analysis = generateMockAnalysis(marketQuestion, currentPrice);
  return {
    marketId,
    generatedAt: new Date().toISOString(),
    ...analysis,
  };
}

/**
 * Call Claude API for real AI analysis
 */
async function callClaudeAPI(
  marketQuestion: string,
  currentPrice: number
): Promise<Omit<AIAnalysisResult, "marketId" | "generatedAt">> {
  const pricePercent = (currentPrice * 100).toFixed(1);
  
  const prompt = `You are a prediction market analyst. Analyze this prediction market question and provide a structured analysis.

Market Question: "${marketQuestion}"
Current Market Price: ${pricePercent}% (implied probability of YES)

Provide your analysis in the following JSON format:
{
  "probability_estimate": <number between 0 and 1>,
  "confidence": "<Low|Medium|High>",
  "thesis": "<2-3 sentences on why YES might happen>",
  "counter_thesis": "<2-3 sentences on why NO might happen>",
  "key_factors": ["<factor 1>", "<factor 2>", "<factor 3>", "<factor 4>", "<factor 5>"],
  "what_could_go_wrong": ["<risk 1>", "<risk 2>", "<risk 3>", "<risk 4>", "<risk 5>"]
}

Be concise, data-driven, and objective. Focus on concrete factors that traders should monitor.`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.CLAUDE_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Claude API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const content = data.content[0].text;
  
  // Extract JSON from response (Claude might wrap it in markdown)
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to parse Claude response");
  }
  
  const analysis = JSON.parse(jsonMatch[0]);
  
  // Validate and normalize response
  return {
    probability_estimate: Math.max(0.1, Math.min(0.9, analysis.probability_estimate)),
    confidence: ["Low", "Medium", "High"].includes(analysis.confidence) 
      ? analysis.confidence 
      : "Medium",
    thesis: analysis.thesis || "Analysis unavailable",
    counter_thesis: analysis.counter_thesis || "Analysis unavailable",
    key_factors: Array.isArray(analysis.key_factors) 
      ? analysis.key_factors.slice(0, 5) 
      : [],
    what_could_go_wrong: Array.isArray(analysis.what_could_go_wrong) 
      ? analysis.what_could_go_wrong.slice(0, 5) 
      : [],
  };
}

/**
 * Generate mock analysis based on market characteristics
 */
function generateMockAnalysis(question: string, currentPrice: number | null) {
  const price = currentPrice || 0.5;
  
  // Determine confidence based on price
  let confidence: "Low" | "Medium" | "High";
  if (price < 0.3 || price > 0.7) {
    confidence = "High";
  } else if (price < 0.4 || price > 0.6) {
    confidence = "Medium";
  } else {
    confidence = "Low";
  }

  // Generate probability estimate (slightly adjusted from current price)
  const probability_estimate = Math.max(0.1, Math.min(0.9, price + (Math.random() - 0.5) * 0.1));

  // Generate thesis based on market type
  const thesis = generateThesis(question, probability_estimate);
  const counter_thesis = generateCounterThesis(question, probability_estimate);
  const key_factors = generateKeyFactors(question);
  const what_could_go_wrong = generateRisks(question);

  return {
    probability_estimate: Math.round(probability_estimate * 100) / 100,
    confidence,
    thesis,
    counter_thesis,
    key_factors,
    what_could_go_wrong,
  };
}

function generateThesis(question: string, probability: number): string {
  const questionLower = question.toLowerCase();
  
  if (questionLower.includes("trump") || questionLower.includes("election")) {
    return probability > 0.5
      ? "Current polling data and betting markets show strong momentum. Historical patterns suggest incumbency advantage and economic indicators favor this outcome. Recent campaign events have shifted sentiment positively."
      : "Despite current odds, fundamental factors suggest uncertainty. Polling methodology improvements and demographic shifts indicate potential for surprise. Market sentiment may be overconfident.";
  }
  
  if (questionLower.includes("fed") || questionLower.includes("rate") || questionLower.includes("interest")) {
    return probability > 0.5
      ? "Economic indicators point toward this outcome. Inflation data trends and employment figures support the Federal Reserve's stated policy direction. Market expectations have converged around this scenario."
      : "While markets price this scenario, economic uncertainty remains high. Recent data volatility and geopolitical factors create significant unpredictability in monetary policy decisions.";
  }
  
  if (questionLower.includes("bitcoin") || questionLower.includes("btc") || questionLower.includes("crypto")) {
    return probability > 0.5
      ? "Technical analysis shows bullish momentum. Institutional adoption continues to accelerate, and regulatory clarity is improving. On-chain metrics support upward price action."
      : "Despite recent volatility, fundamental headwinds persist. Regulatory uncertainty and macroeconomic conditions create downward pressure. Historical resistance levels suggest caution.";
  }
  
  // Generic thesis
  return probability > 0.5
    ? "Available evidence and current trends support this outcome. Multiple independent indicators align with this scenario. Market participants have priced in favorable conditions."
    : "While possible, significant uncertainty remains. Conflicting signals and historical precedent suggest caution. Current market pricing may not fully account for downside risks.";
}

function generateCounterThesis(question: string, probability: number): string {
  const questionLower = question.toLowerCase();
  
  if (questionLower.includes("trump") || questionLower.includes("election")) {
    return probability > 0.5
      ? "However, polls have historically underestimated uncertainty. Late-breaking events can dramatically shift outcomes. Voter turnout patterns remain unpredictable, especially in key demographics."
      : "Conversely, betting markets have proven accurate in past cycles. Ground game organization and fundraising advantages shouldn't be discounted. Recent endorsements may shift momentum.";
  }
  
  if (questionLower.includes("fed") || questionLower.includes("rate") || questionLower.includes("interest")) {
    return probability > 0.5
      ? "However, the Fed has surprised markets before. Unforeseen economic shocks could force policy pivots. International factors and currency dynamics add complexity to predictions."
      : "That said, the Fed's forward guidance has been consistent. Market pricing reflects sophisticated analysis. Central bank credibility depends on following through on signals.";
  }
  
  if (questionLower.includes("bitcoin") || questionLower.includes("btc") || questionLower.includes("crypto")) {
    return probability > 0.5
      ? "However, crypto markets are notoriously volatile. Regulatory crackdowns or security breaches could trigger sharp reversals. Correlation with traditional markets may increase downside risk."
      : "On the other hand, adoption curves often accelerate unexpectedly. Major institutional announcements or ETF approvals could catalyze rapid price appreciation.";
  }
  
  // Generic counter-thesis
  return probability > 0.5
    ? "However, markets can remain irrational longer than expected. Black swan events and unforeseen developments pose significant risks. Historical patterns don't always repeat."
    : "Conversely, sentiment can shift rapidly on new information. Contrarian positions sometimes outperform when consensus is wrong. Risk-reward may favor this scenario.";
}

function generateKeyFactors(question: string): string[] {
  const questionLower = question.toLowerCase();
  
  if (questionLower.includes("trump") || questionLower.includes("election")) {
    return [
      "Polling averages in key swing states",
      "Campaign fundraising and ad spending",
      "Voter registration and turnout trends",
      "Economic conditions and approval ratings",
      "Recent debate performances and media coverage",
    ];
  }
  
  if (questionLower.includes("fed") || questionLower.includes("rate") || questionLower.includes("interest")) {
    return [
      "Core inflation trends (CPI and PCE)",
      "Employment data and wage growth",
      "Fed meeting minutes and forward guidance",
      "Global economic conditions",
      "Financial market stability indicators",
    ];
  }
  
  if (questionLower.includes("bitcoin") || questionLower.includes("btc") || questionLower.includes("crypto")) {
    return [
      "Bitcoin ETF approval and institutional flows",
      "On-chain metrics (active addresses, transaction volume)",
      "Regulatory developments in major jurisdictions",
      "Correlation with traditional risk assets",
      "Mining difficulty and hash rate trends",
    ];
  }
  
  // Generic factors
  return [
    "Historical precedent and base rates",
    "Current market sentiment and positioning",
    "Expert forecasts and consensus estimates",
    "Recent news and information flow",
    "Time until resolution and uncertainty decay",
  ];
}

function generateRisks(question: string): string[] {
  const questionLower = question.toLowerCase();
  
  if (questionLower.includes("trump") || questionLower.includes("election")) {
    return [
      "October surprise or late-breaking scandal",
      "Polling errors systematically favoring one side",
      "Unexpected third-party candidate impact",
      "Voter suppression or election integrity issues",
      "Major geopolitical event shifting voter priorities",
    ];
  }
  
  if (questionLower.includes("fed") || questionLower.includes("rate") || questionLower.includes("interest")) {
    return [
      "Unexpected inflation spike or deflation",
      "Banking sector stress or credit crisis",
      "Geopolitical shock affecting oil prices",
      "Fed communication breakdown or policy error",
      "Divergence from other major central banks",
    ];
  }
  
  if (questionLower.includes("bitcoin") || questionLower.includes("btc") || questionLower.includes("crypto")) {
    return [
      "Major exchange hack or security breach",
      "Coordinated regulatory crackdown",
      "Quantum computing threat to cryptography",
      "Competing cryptocurrency gaining dominance",
      "Macro risk-off event causing liquidations",
    ];
  }
  
  // Generic risks
  return [
    "Unforeseen black swan events",
    "Market manipulation or insider information",
    "Resolution criteria ambiguity or disputes",
    "Liquidity crisis preventing exit",
    "Time decay eroding position value",
  ];
}

// ============================================================================
// FALLBACK MOCK ANALYSIS (Used when Claude API is unavailable)
// ============================================================================

