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
    const {
      recipientAddress,
      senderAddress,
      giftType,
      title,
      solAmount,
      tokenAmount,
      tokenSymbol,
      tokenMint,
      nftMint,
      personalMessage,
      relationshipContext,
      recommendation,
      giftId,
    } = await req.json();

    if (!recipientAddress || !giftType || !title) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const supabase = createClient(
      "https://nkugzkqimtbdotdguove.supabase.co",
      Deno.env.get("SERVICE_ROLE_KEY")!
    );

    // 🔥 fake signature for MVP (frontend already sends Phantom tx)
    // fake signature for MVP (frontend already sends Phantom tx)
    const signature = crypto.randomUUID();

    const explorerUrl = `https://explorer.solana.com/tx/${signature}?cluster=devnet`;

    const finalGiftId = giftId ?? crypto.randomUUID();

    // 💾 store gift
    const { error } = await supabase.from("gifts").insert({
      gift_id: finalGiftId,
      recipient_address: recipientAddress,
      sender_address: senderAddress,
      gift_type: giftType,
      title,
      sol_amount: solAmount ?? null,
      token_amount: tokenAmount ?? null,
      token_symbol: tokenSymbol ?? null,
      token_mint: tokenMint ?? null,
      nft_mint: nftMint ?? null,
      personal_message: personalMessage ?? "",
      claim_message: recommendation?.claimMessage ?? "",
      signature,
      explorer_url: explorerUrl,
      status: "pending",
    });

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({
        giftId: finalGiftId,
        signature,
        explorerUrl,
        claimUrl: `${Deno.env.get("APP_PUBLIC_URL") || "http://localhost:5173"}/claim/${finalGiftId}`,
        recipientAddress,
        senderAddress,
        giftType,
        title,
        solAmount,
        tokenAmount,
        tokenSymbol,
        tokenMint,
        nftMint,
        personalMessage,
        relationshipContext,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: corsHeaders }
    );
  }
});
