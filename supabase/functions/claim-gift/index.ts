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
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/");
    const giftId = pathParts[pathParts.length - 1];

    if (!giftId) {
      return new Response(
        JSON.stringify({ error: "Missing giftId" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const supabase = createClient(
      "https://nkugzkqimtbdotdguove.supabase.co",
      Deno.env.get("SERVICE_ROLE_KEY")!
    );

    // GET GIFT
    if (req.method === "GET") {
      const { data: gift, error } = await supabase
        .from("gifts")
        .select("*")
        .eq("gift_id", giftId)
        .single();

      if (error || !gift) {
        return new Response(
          JSON.stringify({ error: "Gift not found" }),
          { status: 404, headers: corsHeaders }
        );
      }

      return new Response(
        JSON.stringify({
          gift: {
            giftId: gift.gift_id,
            giftType: gift.gift_type,
            title: gift.title,
            recipientAddress: gift.recipient_address,
            senderAddress: gift.sender_address,
            solAmount: gift.sol_amount,
            tokenAmount: gift.token_amount,
            tokenSymbol: gift.token_symbol,
            tokenMint: gift.token_mint,
            nftMint: gift.nft_mint,
            signature: gift.signature,
            explorerUrl: gift.explorer_url,
            status: gift.status,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // CLAIM GIFT
    if (req.method === "POST") {
      const { data: gift, error } = await supabase
        .from("gifts")
        .select("*")
        .eq("gift_id", giftId)
        .single();

      if (error || !gift) {
        return new Response(
          JSON.stringify({ error: "Gift not found" }),
          { status: 404, headers: corsHeaders }
        );
      }

      if (gift.status === "claimed") {
        return new Response(
          JSON.stringify({ error: "Gift already claimed" }),
          { status: 400, headers: corsHeaders }
        );
      }

      const { error: updateError } = await supabase
        .from("gifts")
        .update({
          status: "claimed",
          claimed_at: new Date().toISOString(),
        })
        .eq("gift_id", giftId);

      if (updateError) {
        return new Response(
          JSON.stringify({ error: updateError.message }),
          { status: 500, headers: corsHeaders }
        );
      }

      return new Response(
        JSON.stringify({
          giftId: gift.gift_id,
          status: "claimed",
          message: "Gift successfully claimed",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: corsHeaders }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: corsHeaders }
    );
  }
});
