# GiftMind Backend Contract

This is the handoff contract for the Supabase teammate. The frontend can run with local mocks now, but the real backend should preserve these shapes so the mock API can be swapped for Edge Functions with minimal frontend changes.

## Core Product Rule

GiftMind must pass the Zara Test: the same recipient profile must produce different recommendations when only `relationshipContext` changes.

Examples:

- Father, mother, parent: long-term value, stability, safety, future growth.
- Boyfriend, girlfriend, partner: emotional resonance, aesthetics, taste alignment.
- Friend: fun, casual, shared interests.
- Sibling: practical, playful, lightly teasing.

## Environment Variables

Frontend:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Supabase Edge Functions:

```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
LLM_PROVIDER=groq
GROQ_API_KEY=
GROQ_MODEL=openai/gpt-oss-20b
OPENROUTER_API_KEY=
OPENROUTER_MODEL=anthropic/claude-sonnet-4
APP_PUBLIC_URL=http://localhost:5173
SOLANA_RPC_URL=https://api.devnet.solana.com
TREASURY_PRIVATE_KEY_JSON=
```

## Database Tables

### recipient_profiles

```sql
create table recipient_profiles (
  id uuid primary key default gen_random_uuid(),
  wallet_address text not null unique,
  social_graph jsonb not null,
  on_chain jsonb not null,
  social jsonb not null,
  analysis jsonb not null,
  solar_persona jsonb not null,
  built_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### gift_recommendations

```sql
create table gift_recommendations (
  id uuid primary key default gen_random_uuid(),
  wallet_address text not null references recipient_profiles(wallet_address),
  relationship_context text not null,
  profile_snapshot jsonb not null,
  recommendation jsonb not null,
  created_at timestamptz not null default now()
);
```

### gifts

```sql
create table gifts (
  id uuid primary key default gen_random_uuid(),
  gift_id text not null unique,
  recipient_address text not null,
  sender_address text,
  recommendation_id uuid references gift_recommendations(id),
  gift_type text not null,
  title text not null,
  sol_amount numeric,
  nft_mint text,
  personal_message text,
  claim_message text,
  signature text,
  explorer_url text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  claimed_at timestamptz
);
```

## Edge Functions

### POST /functions/v1/build-profile

Build or refresh a recipient profile from wallet and social graph data.

Request:

```json
{
  "walletAddress": "ZARA_DEMO_WALLET",
  "socialGraphDataset": {
    "displayName": "Zara",
    "age": 22,
    "interests": ["generative art", "fashion", "indie music", "travel", "reading"],
    "topContentTypes": ["aesthetic/visual content", "travel posts", "book recommendations"],
    "tone": "curates an aesthetic feed; crypto-curious but not loudly crypto-native"
  }
}
```

Backend behavior:

- Fetch Solana Devnet wallet signals using `@solana/web3.js`.
- For demo wallets like `ZARA_DEMO_WALLET`, allow deterministic mock on-chain data.
- Store the full profile in `recipient_profiles`.
- Return the saved profile.

Response:

```json
{
  "walletAddress": "ZARA_DEMO_WALLET",
  "onChain": {
    "solBalance": 1.42,
    "transactionCount": 23,
    "walletAgeDaysApprox": 243,
    "nftHoldings": [{ "mint": "DemoGenArt1", "amount": "1" }],
    "fungibleTokenHoldings": [{ "mint": "USDC", "amount": "40" }],
    "source": "Solana Devnet"
  },
  "social": {
    "displayName": "Zara",
    "age": 22,
    "interests": ["generative art", "fashion"],
    "topContentTypes": ["aesthetic/visual content"],
    "tone": "curates an aesthetic feed"
  },
  "socialGraph": {},
  "analysis": {
    "activityScore": 58,
    "collectorScore": 78,
    "stabilityScore": 64,
    "liquidityScore": 47
  },
  "solarPersona": {
    "archetype": "Aesthetic Collector",
    "summary": "Zara is an aesthetic collector...",
    "solarSignals": [
      { "label": "Activity", "value": 58 },
      { "label": "Collecting", "value": 78 }
    ]
  },
  "builtAt": "2026-06-18T00:00:00.000Z"
}
```

### POST /functions/v1/recommend

Generate relationship-aware ranked gifts.

Request:

```json
{
  "walletAddress": "ZARA_DEMO_WALLET",
  "relationshipContext": "father"
}
```

Backend behavior:

- Load `recipient_profiles.wallet_address`.
- Call the configured LLM provider.
  - Free/default option: Groq with `openai/gpt-oss-20b`.
  - Paid/Claude option: OpenRouter with `anthropic/claude-sonnet-4`.
- Force JSON output.
- Persist in `gift_recommendations`.
- Ensure relationship changes materially affect gifts and reasoning.
- Use Bobocoin (`BOBO`) for SPL token recommendations when a token gift fits.

Response:

```json
{
  "profile": {},
  "recommendation": {
    "relationshipWeighting": "Parental relationship: weighting stability, future value, and growth.",
    "recommendations": [
      {
        "giftType": "SOL",
        "title": "Long-Term SOL Hold",
        "reasoning": "This fits Zara's early crypto curiosity while emphasizing safety and future value.",
        "suggestedAmountOrAsset": "0.1 SOL"
      }
    ],
    "claimMessage": "Your Dad chose this because he wants your future on-chain to be as solid as you are."
  }
}
```

### POST /functions/v1/deliver-gift

Create a gift, execute a Solana Devnet delivery, and return a claim link.

Request:

```json
{
  "recipientAddress": "recipient devnet public key",
  "senderAddress": "sender public key",
  "giftType": "SOL",
  "solAmount": 0.05,
  "personalMessage": "Happy birthday.",
  "recommendation": {}
}
```

Response:

```json
{
  "giftId": "gift_abc123",
  "signature": "devnet signature",
  "explorerUrl": "https://explorer.solana.com/tx/devnet-signature?cluster=devnet",
  "claimUrl": "https://app-url.vercel.app/claim/gift_abc123"
}
```

### GET /functions/v1/claim/:giftId

Return the gift reveal payload.

Response:

```json
{
  "gift": {
    "giftId": "gift_abc123",
    "giftType": "SOL",
    "title": "Long-Term SOL Hold",
    "senderRelationship": "father",
    "status": "pending"
  },
  "recommendation": {},
  "senderMessage": "Happy birthday."
}
```

## OpenRouter Prompt Requirements

Use a system prompt that says:

- You are GiftMind's gifting intelligence.
- You must recommend gifts based on recipient profile, on-chain activity, and sender relationship.
- The same recipient must receive different recommendations for different sender relationships.
- Output strict JSON only.

The user prompt should include:

- Full recipient profile.
- Relationship context.
- Allowed gift types: `SOL`, `SPL_TOKEN`, `NFT`, `EXPERIENCE`.
- Devnet/demo constraints.

## Solana Requirements

First production MVP should support SOL transfer on Devnet.

NFT support can be staged:

- Read NFT holdings during profile build.
- Recommend NFT gifts.
- Deliver mock NFT claim first if minting/transferring is not ready.
- Add Metaplex mint/transfer after SOL delivery is stable.
