import { createClient } from "jsr:@supabase/supabase-js@2";


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { walletAddress, socialGraphDataset } = body;

    if (!walletAddress || !socialGraphDataset) {
      return new Response(
        JSON.stringify({ error: "Missing walletAddress or socialGraphDataset" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const onChain =
      walletAddress === "ZARA_DEMO_WALLET"
        ? {
            solBalance: 1.42,
            transactionCount: 23,
            walletAgeDaysApprox: 243,
            nftHoldings: [
              { mint: "DemoGenArt1", amount: "1" },
              { mint: "DemoGenArt2", amount: "1" },
              { mint: "DemoGenArt3", amount: "1" },
              { mint: "DemoGenArt4", amount: "1" },
            ],
            fungibleTokenHoldings: [
              { mint: "USDC", amount: "40" },
            ],
            source: "Demo override",
          }
        : {
            solBalance: 0,
            transactionCount: 0,
            walletAgeDaysApprox: 0,
            nftHoldings: [],
            fungibleTokenHoldings: [],
            source: "placeholder",
          };

    const social = {
      displayName: socialGraphDataset.displayName,
      age: socialGraphDataset.age,
      interests: socialGraphDataset.interests,
      topContentTypes: socialGraphDataset.topContentTypes,
      tone: socialGraphDataset.tone,
    };

    const analysis = {
      activityScore: 58,
      collectorScore: 78,
      stabilityScore: 64,
      liquidityScore: 47,
    };

    const solarPersona = {
      archetype: "Aesthetic Collector",
      summary: `${social.displayName} is an aesthetic collector with strong signals around generative art, fashion, and crypto curiosity.`,
      solarSignals: [
        { label: "Activity", value: 58 },
        { label: "Collecting", value: 78 },
        { label: "Stability", value: 64 },
        { label: "Liquidity", value: 47 },
      ],
    };

    const supabaseUrl =
      "https://nkugzkqimtbdotdguove.supabase.co";

    const supabaseKey = Deno.env.get("SERVICE_ROLE_KEY");

    if (!supabaseKey) {
      throw new Error("SERVICE_ROLE_KEY secret is missing");
    }

    const supabase = createClient(
      supabaseUrl,
      supabaseKey
    );

    const builtAt = new Date().toISOString();

    const { error } = await supabase
      .from("recipient_profiles")
      .upsert(
        {
          wallet_address: walletAddress,
          social_graph: socialGraphDataset,
          on_chain: onChain,
          social,
          analysis,
          solar_persona: solarPersona,
          built_at: builtAt,
        },
        {
          onConflict: "wallet_address",
        }
      );

    if (error) {
      throw error;
    }

    return new Response(
      JSON.stringify({
        walletAddress,
        onChain,
        social,
        socialGraph: socialGraphDataset,
        analysis,
        solarPersona,
        builtAt,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : String(err),
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});