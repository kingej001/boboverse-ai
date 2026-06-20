import { corsHeaders, jsonResponse } from "../_shared/cors.ts";


type RecipientProfile = {
  walletAddress: string;
  onChain: Record<string, unknown>;
  social: Record<string, unknown>;
  socialGraph: Record<string, unknown>;
  analysis: Record<string, unknown>;
  solarPersona: Record<string, unknown>;
  builtAt?: string;
};

type RecommendationItem = {
  giftType: "SOL" | "SPL_TOKEN" | "NFT" | "EXPERIENCE";
  title: string;
  reasoning: string;
  suggestedAmountOrAsset: string;
};

type RecommendationPayload = {
  relationshipWeighting: string;
  recommendations: RecommendationItem[];
  claimMessage: string;
};

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_OPENROUTER_MODEL = "anthropic/claude-sonnet-4";
const DEFAULT_GROQ_MODEL = "openai/gpt-oss-20b";

const recommendationJsonSchema = {
  type: "object",
  properties: {
    relationshipWeighting: { type: "string" },
    recommendations: {
      type: "array",
      minItems: 3,
      maxItems: 3,
      items: {
        type: "object",
        properties: {
          giftType: { type: "string", enum: ["SOL", "SPL_TOKEN", "NFT", "EXPERIENCE"] },
          title: { type: "string" },
          reasoning: { type: "string" },
          suggestedAmountOrAsset: { type: "string" },
        },
        required: ["giftType", "title", "reasoning", "suggestedAmountOrAsset"],
        additionalProperties: false,
      },
    },
    claimMessage: { type: "string" },
  },
  required: ["relationshipWeighting", "recommendations", "claimMessage"],
  additionalProperties: false,
};

function requiredEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

async function readRequest(req: Request) {
  const body = await req.json().catch(() => ({}));
  const walletAddress = String(body.walletAddress || "").trim();
  const relationshipContext = String(body.relationshipContext || "").trim();

  if (!walletAddress) throw new Error("walletAddress is required.");
  if (!relationshipContext) throw new Error("relationshipContext is required.");

  return { walletAddress, relationshipContext };
}

async function supabaseRequest(path: string, init: RequestInit = {}) {
  const supabaseUrl = requiredEnv("SUPABASE_URL");
  const serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  const url = `${supabaseUrl}/rest/v1/${path}`;

  return fetch(url, {
    ...init,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(init.headers || {}),
    },
  });
}

async function loadProfile(walletAddress: string): Promise<RecipientProfile> {
  const encodedWallet = encodeURIComponent(walletAddress);
  const res = await supabaseRequest(
    `recipient_profiles?wallet_address=eq.${encodedWallet}&select=wallet_address,social_graph,on_chain,social,analysis,solar_persona,built_at&limit=1`
  );

  if (!res.ok) {
    throw new Error(`Failed to load recipient profile: ${await res.text()}`);
  }

  const rows = await res.json();
  const row = rows[0];
  if (!row) {
    throw new Error("No profile found for this wallet. Build the recipient profile first.");
  }

  return {
    walletAddress: row.wallet_address,
    onChain: row.on_chain || {},
    social: row.social || {},
    socialGraph: row.social_graph || {},
    analysis: row.analysis || {},
    solarPersona: row.solar_persona || {},
    builtAt: row.built_at,
  };
}

function buildSystemPrompt() {
  return [
    "You are GiftMind's gifting intelligence.",
    "Recommend gifts from recipient profile data, Solana Devnet wallet activity, and the sender relationship.",
    "The same recipient must receive materially different recommendations when only the sender relationship changes.",
    "This relationship sensitivity is the Zara Test and it is mandatory.",
    "Allowed gift types are SOL, SPL_TOKEN, NFT, and EXPERIENCE.",
    "Prefer SOL for stable, practical, or parental senders.",
    "Prefer NFT or EXPERIENCE for aesthetic, romantic, or memory-oriented senders.",
    "Prefer SPL_TOKEN for Bobocoin/BOBO when a playful, lightweight, or practical token gift fits.",
    "Return strict JSON only. Do not include markdown, comments, or prose outside JSON.",
  ].join(" ");
}

function buildUserPrompt(profile: RecipientProfile, relationshipContext: string) {
  return JSON.stringify({
    task: "Generate ranked GiftMind recommendations.",
    relationshipContext,
    recipientProfile: profile,
    outputContract: {
      relationshipWeighting: "One sentence explaining how relationship changed recommendation priorities.",
      recommendations: [
        {
          giftType: "SOL | SPL_TOKEN | NFT | EXPERIENCE",
          title: "Short gift title",
          reasoning:
            "2-3 sentences tying recipient profile, on-chain/social signals, and sender relationship together.",
          suggestedAmountOrAsset: "Example: 0.05 SOL, 25 BOBO, 1 generative art NFT, shared gallery experience",
        },
      ],
      claimMessage: "Warm recipient-facing explanation of why the sender chose this gift.",
    },
    requirements: [
      "Return exactly 3 recommendations, ranked best first.",
      "Exactly one recommendation must be SPL_TOKEN Bobocoin with symbol BOBO.",
      "The Bobocoin recommendation must include a numeric amount in suggestedAmountOrAsset, for example 20 BOBO.",
      "At least one other recommendation must be deliverable as SOL on Devnet.",
      "Reasoning must explicitly mention the sender relationship.",
      "Do not invent private facts not present in the profile.",
    ],
  });
}

function parseModelJson(content: string): RecommendationPayload {
  const trimmed = content.trim();
  const jsonText = trimmed.startsWith("```") ? trimmed.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim() : trimmed;
  const parsed = JSON.parse(jsonText) as RecommendationPayload;

  if (!parsed.relationshipWeighting || !Array.isArray(parsed.recommendations) || !parsed.claimMessage) {
    throw new Error("Model response did not match recommendation schema.");
  }

  if (parsed.recommendations.length !== 3) {
    throw new Error("Model must return exactly 3 recommendations.");
  }

  for (const item of parsed.recommendations) {
    if (!["SOL", "SPL_TOKEN", "NFT", "EXPERIENCE"].includes(item.giftType)) {
      throw new Error(`Invalid giftType: ${item.giftType}`);
    }
    if (!item.title || !item.reasoning || !item.suggestedAmountOrAsset) {
      throw new Error("Recommendation items require title, reasoning, and suggestedAmountOrAsset.");
    }
  }

  return parsed;
}

async function callOpenRouter(profile: RecipientProfile, relationshipContext: string) {
  const openRouterKey = requiredEnv("OPENROUTER_API_KEY");
  const model = Deno.env.get("OPENROUTER_MODEL") || DEFAULT_OPENROUTER_MODEL;

  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openRouterKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": Deno.env.get("APP_PUBLIC_URL") || "http://localhost:5173",
      "X-Title": "GiftMind",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: buildSystemPrompt() },
        { role: "user", content: buildUserPrompt(profile, relationshipContext) },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 1200,
    }),
  });

  if (!res.ok) {
    throw new Error(`OpenRouter request failed: ${await res.text()}`);
  }

  const completion = await res.json();
  const content = completion?.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenRouter response did not include message content.");

  return {
    provider: "openrouter",
    model: completion.model || model,
    recommendation: parseModelJson(content),
  };
}

async function callGroq(profile: RecipientProfile, relationshipContext: string) {
  const groqKey = requiredEnv("GROQ_API_KEY");
  const model = Deno.env.get("GROQ_MODEL") || DEFAULT_GROQ_MODEL;

  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${groqKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: buildSystemPrompt() },
        { role: "user", content: buildUserPrompt(profile, relationshipContext) },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "giftmind_recommendation",
          schema: recommendationJsonSchema,
        },
      },
      temperature: 0.7,
      max_completion_tokens: 1200,
    }),
  });

  if (!res.ok) {
    throw new Error(`Groq request failed: ${await res.text()}`);
  }

  const completion = await res.json();
  const content = completion?.choices?.[0]?.message?.content;
  if (!content) throw new Error("Groq response did not include message content.");

  return {
    provider: "groq",
    model: completion.model || model,
    recommendation: parseModelJson(content),
  };
}

async function callRecommendationModel(profile: RecipientProfile, relationshipContext: string) {
  const provider = (Deno.env.get("LLM_PROVIDER") || "groq").toLowerCase();

  if (provider === "openrouter") {
    return callOpenRouter(profile, relationshipContext);
  }

  if (provider === "groq") {
    return callGroq(profile, relationshipContext);
  }

  throw new Error(`Unsupported LLM_PROVIDER: ${provider}`);
}

async function persistRecommendation(
  walletAddress: string,
  relationshipContext: string,
  profile: RecipientProfile,
  recommendation: RecommendationPayload,
  model: string,
  provider: string
) {
  const res = await supabaseRequest("gift_recommendations", {
    method: "POST",
    body: JSON.stringify({
      wallet_address: walletAddress,
      relationship_context: relationshipContext,
      profile_snapshot: profile,
      recommendation,
      model,
      provider,
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to persist recommendation: ${await res.text()}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  try {
    const { walletAddress, relationshipContext } = await readRequest(req);
    const profile = await loadProfile(walletAddress);
    const { provider, model, recommendation } = await callRecommendationModel(profile, relationshipContext);
    await persistRecommendation(walletAddress, relationshipContext, profile, recommendation, model, provider);

    return jsonResponse({ profile, recommendation });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown recommendation error.";
    return jsonResponse({ error: message }, 400);
  }
});
