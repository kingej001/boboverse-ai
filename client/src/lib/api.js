import { getSavedProfile } from "./ProfileContext.jsx";

// ============================================================================
// GiftMind Mock API Layer
// ----------------------------------------------------------------------------
// Every function here mirrors the shape of the Supabase Edge Functions the app
// will call when the backend is ready.
// ============================================================================

export const USE_MOCKS = import.meta.env.VITE_USE_MOCKS !== "false";
export const GIFT_STORAGE_KEY = "giftmind.gifts.v1";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const MOCK_PROFILES = {
  ZARA_DEMO_WALLET: {
    walletAddress: "ZARA_DEMO_WALLET",
    onChain: {
      solBalance: 1.42,
      transactionCount: 23,
      walletAgeDaysApprox: 243,
      nftHoldings: [
        { mint: "DemoGenArt1", amount: "1" },
        { mint: "DemoGenArt2", amount: "1" },
        { mint: "DemoGenArt3", amount: "1" },
        { mint: "DemoGenArt4", amount: "1" },
      ],
      fungibleTokenHoldings: [{ mint: "USDC", amount: "40" }],
      source: "Demo override (simulated on-chain data)",
    },
    social: {
      displayName: "Zara",
      age: 22,
      interests: ["generative art", "fashion", "indie music", "travel", "reading", "emerging crypto culture"],
      topContentTypes: ["aesthetic/visual content", "travel posts", "book recommendations", "DeFi explainer threads"],
      tone: "curates an aesthetic feed; crypto-curious but not loudly crypto-native",
    },
    builtAt: new Date().toISOString(),
  },
};

function resolveProfile(walletAddress) {
  return getSavedProfile(walletAddress) || MOCK_PROFILES[walletAddress];
}

function readGiftsFromStorage() {
  if (typeof window === "undefined") return {};

  try {
    const rawGifts = window.localStorage.getItem(GIFT_STORAGE_KEY);
    return rawGifts ? JSON.parse(rawGifts) : {};
  } catch {
    return {};
  }
}

function writeGiftsToStorage(gifts) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(GIFT_STORAGE_KEY, JSON.stringify(gifts));
}

function saveGiftToStorage(giftId, claimPayload) {
  const gifts = readGiftsFromStorage();
  gifts[giftId] = claimPayload;
  writeGiftsToStorage(gifts);
  return claimPayload;
}

function getGiftFromStorage(giftId) {
  return readGiftsFromStorage()[giftId] || null;
}

export function saveDemoClaimGift(giftId, claimPayload) {
  return saveGiftToStorage(giftId, claimPayload);
}

export async function claimGift(giftId) {
  if (USE_MOCKS) {
    await delay(500);
    const savedGift = getGiftFromStorage(giftId);
    if (!savedGift) {
      throw new Error("Gift not found.");
    }

    const claimedGift = {
      ...savedGift,
      gift: {
        ...savedGift.gift,
        status: "claimed",
        claimedAt: new Date().toISOString(),
      },
    };
    saveGiftToStorage(giftId, claimedGift);
    return claimedGift;
  }

  const res = await fetch(`${SUPABASE_URL}/functions/v1/claim/${giftId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  });
  if (!res.ok) throw new Error("Failed to claim gift");
  return res.json();
}

function buildRecommendation(relationshipContext) {
  const rel = relationshipContext.toLowerCase();
  const isProtective = /father|mother|parent|dad|mom|guardian/.test(rel);
  const isRomantic = /boyfriend|girlfriend|partner|husband|wife|spouse/.test(rel);
  const isSibling = /sister|brother|sibling/.test(rel);

  if (isProtective) {
    return {
      relationshipWeighting:
        "[MOCK] Parental relationship: weighting long-term value, safety, and growth over aesthetics.",
      recommendations: [
        {
          giftType: "SOL",
          title: "Long-Term SOL Hold",
          reasoning:
            "A meaningful SOL transfer framed as a long-term hold, reflecting a parent's focus on future stability rather than short-term taste.",
          suggestedAmountOrAsset: "0.1 SOL",
        },
        {
          giftType: "SPL_TOKEN",
          title: "Bobocoin Starter Reserve",
          reasoning:
            "A practical Bobocoin gift fits a protective sender who wants the recipient to have useful on-chain value without over-framing it as a collectible.",
          suggestedAmountOrAsset: "25 BOBO",
        },
        {
          giftType: "NFT",
          title: "Keepsake Art With Long-Term Meaning",
          reasoning:
            "A carefully chosen art piece still respects the recipient's taste, but it is framed as a durable memory rather than a trend.",
          suggestedAmountOrAsset: "1 curated art NFT",
        },
      ],
      claimMessage: "Your Dad chose this because he wants your future on-chain to be as solid as you are. Hold it.",
    };
  }

  if (isRomantic) {
    return {
      relationshipWeighting:
        "[MOCK] Romantic relationship: weighting personal taste, aesthetic alignment, and emotional resonance.",
      recommendations: [
        {
          giftType: "NFT",
          title: "Matching Generative Art Piece",
          reasoning:
            "Based on existing generative art NFTs and aesthetic engagement, a similar-style piece signals attentiveness to their taste.",
          suggestedAmountOrAsset: "1 generative art NFT, style-matched to existing collection",
        },
        {
          giftType: "SOL",
          title: "Solstice Date Night SOL",
          reasoning:
            "A small SOL gift keeps the gesture playful and useful while leaving room for a personal message to carry the emotional weight.",
          suggestedAmountOrAsset: "0.04 SOL",
        },
        {
          giftType: "EXPERIENCE",
          title: "Shared Gallery Drop",
          reasoning:
            "Their aesthetic and culture signals point toward an experience that becomes a shared memory, not just an asset transfer.",
          suggestedAmountOrAsset: "Invite to a curated digital art drop",
        },
      ],
      claimMessage: "He picked this because it matches your collection and your taste. He was paying attention.",
    };
  }

  if (isSibling) {
    return {
      relationshipWeighting: "[MOCK] Sibling relationship: weighting practicality with a playful edge.",
      recommendations: [
        {
          giftType: "SOL",
          title: "Practical + Playful SOL Drop",
          reasoning: "A fun-sized SOL gift with a teasing personal message; siblings don't need to be precious about it.",
          suggestedAmountOrAsset: "0.05 SOL",
        },
        {
          giftType: "SPL_TOKEN",
          title: "Snack Money Bobocoin",
          reasoning:
            "Useful value with a playful framing matches a sibling dynamic: practical enough to matter, casual enough to feel right.",
          suggestedAmountOrAsset: "15 BOBO",
        },
        {
          giftType: "NFT",
          title: "Inside-Joke Collectible",
          reasoning:
            "A low-stakes collectible can feel personal and funny when paired with a message only siblings would get.",
          suggestedAmountOrAsset: "1 playful collectible NFT",
        },
      ],
      claimMessage: "Your sibling sent this because, let's be honest, you'll spend it on something ridiculous. Enjoy.",
    };
  }

  return {
    relationshipWeighting: "[MOCK] Friend relationship: weighting fun and shared interests.",
    recommendations: [
      {
        giftType: "SOL",
        title: "Shared-Interest SOL Gift",
        reasoning: "A casual, thoughtful gift reflecting shared interests rather than deep emotional or financial signaling.",
        suggestedAmountOrAsset: "0.04 SOL",
      },
      {
        giftType: "NFT",
        title: "Taste-Matched Collectible",
        reasoning: "A lightweight collectible lines up with their interests and feels more memorable than a generic transfer.",
        suggestedAmountOrAsset: "1 affordable collectible NFT",
      },
      {
        giftType: "EXPERIENCE",
        title: "Next Hangout Signal",
        reasoning:
          "A shared experience recommendation keeps the gift fun, social, and connected to the friendship rather than overly serious.",
        suggestedAmountOrAsset: "Shared event or drop invite",
      },
    ],
    claimMessage: "Your friend wanted to share something on-chain with you; no big occasion needed.",
  };
}

export async function fetchRecipientProfile(walletAddress) {
  if (USE_MOCKS) {
    await delay(900);
    const profile = resolveProfile(walletAddress);
    if (!profile) {
      throw new Error("No profile found for this wallet. Build one in Profile Builder or try ZARA_DEMO_WALLET.");
    }
    return profile;
  }

  const res = await fetch(`${SUPABASE_URL}/functions/v1/build-profile?wallet=${walletAddress}`, {
    headers: { Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  });
  if (!res.ok) throw new Error("Failed to build recipient profile");
  return res.json();
}

export async function fetchRecommendation(walletAddress, relationshipContext) {
  if (USE_MOCKS) {
    await delay(1400);
    const profile = resolveProfile(walletAddress);
    if (!profile) {
      throw new Error("No profile found for this wallet. Build one in Profile Builder or try ZARA_DEMO_WALLET.");
    }
    return { profile, recommendation: buildRecommendation(relationshipContext) };
  }

  const res = await fetch(`${SUPABASE_URL}/functions/v1/recommend`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
    body: JSON.stringify({ walletAddress, relationshipContext }),
  });
  if (!res.ok) throw new Error("Failed to fetch recommendation");
  return res.json();
}

export async function deliverGift({
  recipientAddress,
  senderAddress,
  giftType,
  title,
  solAmount,
  tokenAmount,
  tokenSymbol,
  tokenMint,
  personalMessage,
  relationshipContext,
  recommendation,
  giftId,
}) {
  if (USE_MOCKS) {
    await delay(900);
    const savedGiftId = giftId || `gift_${Math.random().toString(36).slice(2, 10)}`;
    const mockSignature = "MockSig" + Math.random().toString(36).slice(2, 10);
    const deliveryResult = {
      giftId: savedGiftId,
      signature: mockSignature,
      explorerUrl: `https://explorer.solana.com/tx/${mockSignature}?cluster=devnet`,
      claimUrl: `${window.location.origin}/claim/${savedGiftId}`,
      recipientAddress,
      senderAddress,
      giftType,
      title,
      solAmount,
      tokenAmount,
      tokenSymbol,
      tokenMint,
      personalMessage,
      relationshipContext,
      recommendation,
    };
    const selectedRecommendation = recommendation || {
      giftType,
      title,
      reasoning: "The sender selected this gift for you.",
      suggestedAmountOrAsset: tokenAmount && tokenSymbol ? `${tokenAmount} ${tokenSymbol}` : `${solAmount || 0} SOL`,
    };

    saveGiftToStorage(savedGiftId, {
      gift: {
        giftId: savedGiftId,
        giftType,
        title: title || selectedRecommendation.title,
        senderRelationship: relationshipContext,
        recipientAddress,
        senderAddress,
        solAmount,
        tokenAmount,
        tokenSymbol,
        tokenMint,
        signature: mockSignature,
        explorerUrl: deliveryResult.explorerUrl,
        status: "pending",
      },
      recommendation: {
        relationshipWeighting: `Approved by sender as ${relationshipContext || "their relationship"}.`,
        recommendations: [selectedRecommendation],
        claimMessage:
          selectedRecommendation.reasoning ||
          "GiftMind matched this gift to the recipient profile and the sender relationship.",
      },
      senderMessage: personalMessage,
    });

    return deliveryResult;
  }

  const res = await fetch(`${SUPABASE_URL}/functions/v1/deliver-gift`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
    body: JSON.stringify({
      recipientAddress,
      senderAddress,
      giftType,
      title,
      solAmount,
      tokenAmount,
      tokenSymbol,
      tokenMint,
      personalMessage,
      relationshipContext,
      recommendation,
      giftId,
    }),
  });
  if (!res.ok) throw new Error("Failed to deliver gift");
  return res.json();
}

export async function fetchClaimData(giftId) {
  if (USE_MOCKS) {
    await delay(700);
    const savedGift = getGiftFromStorage(giftId);
    if (savedGift) return savedGift;

    return {
      gift: {
        giftId,
        giftType: "NFT",
        title: "Matching Generative Art Piece",
        senderRelationship: "boyfriend",
        status: "pending",
      },
      recommendation: buildRecommendation("boyfriend"),
      senderMessage: "Happy birthday, Zara. Found this and thought of you immediately.",
    };
  }

  const res = await fetch(`${SUPABASE_URL}/functions/v1/claim/${giftId}`, {
    headers: { Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  });
  if (!res.ok) throw new Error("Failed to fetch claim data");
  return res.json();
}
