import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID, createAssociatedTokenAccountInstruction, createTransferCheckedInstruction, getAccount, getAssociatedTokenAddress, getMint, } from "@solana/spl-token";
import { LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useMemo } from "react";

import { fetchRecommendation, deliverGift, saveDemoClaimGift } from "../lib/api.js";
import RecommendationCard from "../components/RecommendationCard.jsx";
import ConstellationChart from "../components/ConstellationChart.jsx";


const STAGES = {
  INPUT: "input",
  READING: "reading",
  RESULTS: "results",
  DELIVERING: "delivering",
  DELIVERED: "delivered",
};

const SEND_MODES = {
  DEMO: "demo",
  REAL_SOL: "real-sol",
};

const BOBOCOIN = {
  symbol: "BOBO",
  displayName: "Bobocoin",
  devnetMint: "pEGAeYmxCSChDr1g4xaUeNRi4uktKHiz5VXwpBRo136",
};

const RELATIONSHIP_PRESETS = ["Father", "Mother", "Boyfriend", "Girlfriend", "Sibling", "Close friend"];

// ─── presentation-only constants (no business logic) ───────────────────────

const RELATIONSHIP_CARDS = [
  { label: "Father", icon: "🪐", hint: "Leans toward stability — SOL savings, long-term holds." },
  { label: "Mother", icon: "🌙", hint: "Reads warmth and care signals over speculative assets." },
  { label: "Boyfriend", icon: "❤️", hint: "Weighs personal taste — curated, expressive NFTs." },
  { label: "Girlfriend", icon: "✨", hint: "Reads aesthetic + sentimental signals first." },
  { label: "Sibling", icon: "👫", hint: "Balances playful culture with shared history." },
  { label: "Close friend", icon: "🤝", hint: "Optimizes for delight over financial weight." },
];

const SCAN_LINES = [
  "Reading wallet history…",
  "Mapping social signals…",
  "Identifying interests…",
  "Understanding relationship context…",
  "Building recipient constellation…",
  "Generating gift intelligence…",
  "Finalizing recommendations…",
];

const LAUNCH_LINES_DEMO = ["Creating demo transaction…", "Generating claim link…", "Sealing the gift…"];
const LAUNCH_LINES_REAL = ["Awaiting Phantom approval…", "Broadcasting to Devnet…", "Confirming transaction…"];

function parseSolAmount(value) {
  const match = String(value || "").match(/(\d+(\.\d+)?)\s*SOL/i);
  return match ? Number(match[1]) : 0;
}

function parseTokenAmount(value, symbol) {
  const match = String(value || "").match(
    new RegExp(`(\\d+(\\.\\d+)?)\\s*(?:${symbol}|${BOBOCOIN.displayName})`, "i")
  );
  return match ? Number(match[1]) : 0;
}

function normalizeRecommendationForDelivery(recommendation) {
  const suggestedAmountOrAsset = recommendation?.suggestedAmountOrAsset || "";
  const solAmount = parseSolAmount(suggestedAmountOrAsset);
  const boboAmount = parseTokenAmount(suggestedAmountOrAsset, BOBOCOIN.symbol);
  const isBoboGift =
    recommendation?.giftType === "SPL_TOKEN" &&
    /bobo|bobocoin/i.test(`${recommendation?.title || ""} ${suggestedAmountOrAsset}`);

  return {
    giftType: recommendation?.giftType || "SOL",
    title: recommendation?.title || "GiftMind Gift",
    solAmount,
    tokenAmount: isBoboGift ? boboAmount : 0,
    tokenSymbol: isBoboGift && boboAmount > 0 ? BOBOCOIN.symbol : undefined,
    tokenMint: isBoboGift && boboAmount > 0 ? BOBOCOIN.devnetMint : undefined,
  };
}

function isValidPublicKey(value) {
  try {
    return Boolean(new PublicKey(value));
  } catch {
    return false;
  }
}

function createGiftId() {
  return `gift_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function tokenAmountToRawAmount(amount, decimals) {
  const [wholePart, decimalPart = ""] = String(amount).split(".");
  const paddedDecimalPart = decimalPart.padEnd(decimals, "0").slice(0, decimals);
  return BigInt(`${wholePart || "0"}${paddedDecimalPart || "".padEnd(decimals, "0")}`);
}

async function buildSplTokenTransferTransaction({ connection, senderPublicKey, recipientAddress, mintAddress, amount }) {
  const mintPublicKey = new PublicKey(mintAddress);
  const recipientPublicKey = new PublicKey(recipientAddress);
  const mintAccountInfo = await connection.getAccountInfo(mintPublicKey);
  if (!mintAccountInfo) {
    throw new Error("Bobocoin mint was not found on Devnet.");
  }
  const tokenProgramId = mintAccountInfo?.owner?.equals(TOKEN_2022_PROGRAM_ID) ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;
  const mint = await getMint(connection, mintPublicKey, undefined, tokenProgramId);
  const rawAmount = tokenAmountToRawAmount(amount, mint.decimals);

  if (rawAmount <= 0n) {
    throw new Error("Select a Bobocoin gift with an amount greater than 0.");
  }

  const senderTokenAccount = await getAssociatedTokenAddress(mintPublicKey, senderPublicKey, false, tokenProgramId);
  const recipientTokenAccount = await getAssociatedTokenAddress(mintPublicKey, recipientPublicKey, false, tokenProgramId);

  let senderAccount;
  try {
    senderAccount = await getAccount(connection, senderTokenAccount, undefined, tokenProgramId);
  } catch {
    throw new Error("Your connected wallet does not have a Bobocoin token account on Devnet.");
  }
  if (senderAccount.amount < rawAmount) {
    throw new Error(`Your Phantom wallet does not have enough Bobocoin to send ${amount} ${BOBOCOIN.symbol}.`);
  }

  const transaction = new Transaction();
  try {
    await getAccount(connection, recipientTokenAccount, undefined, tokenProgramId);
  } catch {
    transaction.add(
      createAssociatedTokenAccountInstruction(
        senderPublicKey,
        recipientTokenAccount,
        recipientPublicKey,
        mintPublicKey,
        tokenProgramId
      )
    );
  }

  transaction.add(
    createTransferCheckedInstruction(
      senderTokenAccount,
      mintPublicKey,
      recipientTokenAccount,
      senderPublicKey,
      rawAmount,
      mint.decimals,
      [],
      tokenProgramId
    )
  );

  return transaction;
}

// ─── presentation-only sub-components ───────────────────────────────────────

function CosmicBackdrop() {
  const stars = useMemo(
    () =>
      Array.from({ length: 60 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 1.6 + 0.4,
        delay: Math.random() * 4,
        dur: Math.random() * 3 + 2,
      })),
    []
  );
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-spaceDeep">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(124,92,255,0.18),_transparent_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_rgba(255,184,77,0.10),_transparent_50%)]" />
      {stars.map((s) => (
        <motion.span
          key={s.id}
          className="absolute rounded-full bg-starlight"
          style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.size, height: s.size }}
          animate={{ opacity: [0.15, 0.9, 0.15] }}
          transition={{ duration: s.dur, delay: s.delay, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

function RelationshipCard({ card, selected, onSelect }) {
  return (
    <motion.button
      type="button"
      onClick={onSelect}
      whileTap={{ scale: 0.97 }}
      className={`group relative overflow-hidden rounded-2xl border p-4 text-left transition ${
        selected
          ? "border-solstice bg-solstice/10 shadow-glowSm"
          : "border-violet/25 bg-violetDeep/10 hover:border-violet/50"
      }`}
    >
      <span className="text-2xl">{card.icon}</span>
      <p className="mt-3 font-display text-sm font-semibold text-starlight">{card.label}</p>
      <p className="mt-1 text-xs leading-relaxed text-starlightDim">{card.hint}</p>
      {selected && (
        <motion.span
          layoutId="relSelected"
          className="absolute inset-0 rounded-2xl ring-1 ring-solstice/60"
        />
      )}
    </motion.button>
  );
}

// Scripted scan sequence — cosmetic only. The real fetchRecommendation()
// call already happened in handleReadChart; this just dramatizes the wait.
function ScanSequence({ lines, accent = "solstice" }) {
  const [lineIndex, setLineIndex] = useState(0);

  useEffect(() => {
    setLineIndex(0);
    const id = setInterval(() => {
      setLineIndex((i) => (i < lines.length - 1 ? i + 1 : i));
    }, 480);
    return () => clearInterval(id);
  }, [lines]);

  const pct = Math.round(((lineIndex + 1) / lines.length) * 100);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-6 py-16 text-center">
      <motion.div
        className={`h-24 w-24 rounded-full border-2 border-${accent}/40 border-t-${accent}`}
        animate={{ rotate: 360 }}
        transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }}
      />
      <div className="h-1 w-full overflow-hidden rounded-full bg-violetDeep/40">
        <motion.div
          className="h-full rounded-full bg-solstice"
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
      <div className="w-full space-y-2 font-mono text-xs">
        {lines.map((line, i) => (
          <motion.div
            key={line}
            animate={{ opacity: i <= lineIndex ? 1 : 0.15 }}
            transition={{ duration: 0.3 }}
            className={`flex items-center justify-center gap-2 ${
              i <= lineIndex ? "text-starlight" : "text-starlightDim"
            }`}
          >
            <span className="text-solstice">{i < lineIndex ? "✓" : i === lineIndex ? "✦" : "·"}</span>
            {line}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function ScoreMeter({ label, value }) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div className="flex items-center gap-2">
      <span className="w-28 shrink-0 font-mono text-[10px] uppercase tracking-[0.12em] text-starlightDim">
        {label}
      </span>
      <div className="h-1 flex-1 overflow-hidden rounded-full bg-violetDeep/40">
        <motion.div
          className="h-full rounded-full bg-solstice"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
      <span className="w-7 text-right font-mono text-[10px] text-starlight">{pct || "—"}</span>
    </div>
  );
}

// ─── main component ─────────────────────────────────────────────────────────

export default function SendGift() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction, connected } = useWallet();
  const [stage, setStage] = useState(STAGES.INPUT);
  const [recipientWallet, setRecipientWallet] = useState("ZARA_DEMO_WALLET");
  const [relationship, setRelationship] = useState("");
  const [data, setData] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [personalMessage, setPersonalMessage] = useState("");
  const [sendMode, setSendMode] = useState(SEND_MODES.DEMO);
  const [deliveryResult, setDeliveryResult] = useState(null);
  const [copiedClaimLink, setCopiedClaimLink] = useState(false);
  const [error, setError] = useState("");

  async function handleReadChart(e) {
    e.preventDefault();
    if (!recipientWallet.trim() || !relationship.trim()) return;
    setError("");
    setStage(STAGES.READING);
    try {
      const result = await fetchRecommendation(recipientWallet.trim(), relationship.trim());
      setData(result);
      setSelectedIndex(0);
      setPersonalMessage("");
      setSendMode(SEND_MODES.DEMO);
      setCopiedClaimLink(false);
      setStage(STAGES.RESULTS);
    } catch (err) {
      setError(err.message);
      setStage(STAGES.INPUT);
    }
  }

  async function handleApproveAndSend() {
    setStage(STAGES.DELIVERING);
    setError("");

    try {
      const selected = data.recommendation.recommendations[selectedIndex];
      const deliveryGift = normalizeRecommendationForDelivery(selected);
      const solAmount = deliveryGift.solAmount || 0.05;
      const isSolGift = selected.giftType === "SOL";
      const isBoboGift = deliveryGift.tokenSymbol === BOBOCOIN.symbol && deliveryGift.tokenAmount > 0;
      const giftId = createGiftId();
      let result;

      if (sendMode === SEND_MODES.REAL_SOL || isBoboGift) {
        if (!isSolGift && !isBoboGift) {
          throw new Error("Real Devnet sending supports SOL and Bobocoin gifts. Use demo mode for this gift.");
        }
        if (!connected || !publicKey) {
          throw new Error("Connect Phantom before sending a real Devnet gift.");
        }
        if (!isValidPublicKey(recipientWallet)) {
          throw new Error("Enter a valid Solana recipient wallet for real Devnet sending.");
        }

        const transaction = isBoboGift
          ? await buildSplTokenTransferTransaction({
              connection,
              senderPublicKey: publicKey,
              recipientAddress: recipientWallet,
              mintAddress: BOBOCOIN.devnetMint,
              amount: deliveryGift.tokenAmount,
            })
          : new Transaction().add(
              SystemProgram.transfer({
                fromPubkey: publicKey,
                toPubkey: new PublicKey(recipientWallet),
                lamports: Math.round(solAmount * LAMPORTS_PER_SOL),
              })
            );

        const signature = await sendTransaction(transaction, connection);
        await connection.confirmTransaction(signature, "confirmed");
        result = {
          giftId,
          signature,
          explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
          claimUrl: `${window.location.origin}/claim/${giftId}`,
          recipientAddress: recipientWallet,
          senderAddress: publicKey.toBase58(),
          giftType: deliveryGift.giftType,
          title: deliveryGift.title,
          solAmount: isSolGift ? solAmount : undefined,
          tokenAmount: isBoboGift ? deliveryGift.tokenAmount : undefined,
          tokenSymbol: isBoboGift ? deliveryGift.tokenSymbol : undefined,
          tokenMint: isBoboGift ? deliveryGift.tokenMint : undefined,
          personalMessage,
          relationshipContext: relationship,
        };
        saveDemoClaimGift(giftId, {
          gift: {
            giftId,
            giftType: deliveryGift.giftType,
            title: deliveryGift.title,
            senderRelationship: relationship,
            recipientAddress: recipientWallet,
            senderAddress: publicKey.toBase58(),
            solAmount: isSolGift ? solAmount : undefined,
            tokenAmount: isBoboGift ? deliveryGift.tokenAmount : undefined,
            tokenSymbol: isBoboGift ? deliveryGift.tokenSymbol : undefined,
            tokenMint: isBoboGift ? deliveryGift.tokenMint : undefined,
            signature,
            explorerUrl: result.explorerUrl,
            status: "pending",
          },
          recommendation: {
            relationshipWeighting: data.recommendation.relationshipWeighting,
            recommendations: [selected],
            claimMessage: data.recommendation.claimMessage,
          },
          senderMessage: personalMessage,
        });
      } else {
        result = await deliverGift({
          recipientAddress: recipientWallet,
          senderAddress: publicKey ? publicKey.toBase58() : "demo-sender",
          giftType: deliveryGift.giftType,
          title: deliveryGift.title,
          solAmount: deliveryGift.solAmount,
          tokenAmount: deliveryGift.tokenAmount,
          tokenSymbol: deliveryGift.tokenSymbol,
          tokenMint: deliveryGift.tokenMint,
          personalMessage,
          relationshipContext: relationship,
          recommendation: selected,
          giftId,
        });
      }

      setDeliveryResult(result);
      setCopiedClaimLink(false);
      setStage(STAGES.DELIVERED);
    } catch (err) {
      setError(err.message);
      setStage(STAGES.RESULTS);
    }
  }

  const dataPointsForChart = data
    ? [
        { label: `${data.profile.onChain.transactionCount} txns` },
        { label: `${data.profile.onChain.nftHoldings.length} NFTs` },
        { label: `${data.profile.onChain.walletAgeDaysApprox}d old` },
        { label: data.profile.social.interests[0] || "interests" },
        { label: data.profile.social.tone?.split(" ").slice(0, 2).join(" ") || "tone" },
      ]
    : [];

  const selectedRecommendation = data?.recommendation.recommendations[selectedIndex];
  const selectedSolAmount = parseSolAmount(selectedRecommendation?.suggestedAmountOrAsset);
  const selectedDeliveryGift = normalizeRecommendationForDelivery(selectedRecommendation);
  const selectedIsBoboGift = selectedDeliveryGift.tokenSymbol === BOBOCOIN.symbol && selectedDeliveryGift.tokenAmount > 0;
  const selectedUsesRealPhantom = sendMode === SEND_MODES.REAL_SOL || selectedIsBoboGift;
  const canRealSendSelectedGift =
    ((selectedRecommendation?.giftType === "SOL" && selectedSolAmount > 0) ||
      selectedIsBoboGift) &&
    connected &&
    publicKey &&
    isValidPublicKey(recipientWallet);
  const hasPersonalMessage = personalMessage.trim().length > 0;
  const approveButtonLabel = selectedUsesRealPhantom ? "Approve in Phantom & Send" : "Approve Demo Gift";

  useEffect(() => {
    if (selectedIsBoboGift && sendMode !== SEND_MODES.REAL_SOL) {
      setSendMode(SEND_MODES.REAL_SOL);
    }
  }, [selectedIsBoboGift, sendMode]);

  async function handleCopyClaimLink() {
    if (!deliveryResult?.claimUrl) return;
    await navigator.clipboard.writeText(deliveryResult.claimUrl);
    setCopiedClaimLink(true);
  }

  return (
    <>
      <CosmicBackdrop />
      <div className="relative mx-auto max-w-3xl px-6 pb-24 pt-10 sm:px-10">
        <AnimatePresence mode="wait">
          {/* ── STEP 1 · INPUT ── */}
          {stage === STAGES.INPUT && (
            <motion.div
              key="input"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="mb-10 text-center">
                <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.3em] text-solstice">
                  GiftMind Oracle
                </p>
                <h1 className="font-display text-3xl font-semibold text-starlight sm:text-4xl">
                  Who are we gifting today?
                </h1>
                <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-starlightDim">
                  GiftMind reads on-chain activity and social signal — then reweighs every
                  recommendation by who you are to them. A father and a boyfriend never get
                  the same gift for the same person.
                </p>
              </div>

              <form onSubmit={handleReadChart} className="space-y-8">
                <div>
                  <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-starlightDim">
                    Your relationship to them
                  </p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {RELATIONSHIP_CARDS.map((card) => (
                      <RelationshipCard
                        key={card.label}
                        card={card}
                        selected={relationship === card.label}
                        onSelect={() => setRelationship(card.label)}
                      />
                    ))}
                  </div>
                  <input
                    type="text"
                    value={relationship}
                    onChange={(e) => setRelationship(e.target.value)}
                    placeholder="or describe it your own way — e.g. her father, his boyfriend"
                    className="mt-3 w-full rounded-xl border border-violet/40 bg-violetDeep/20 px-4 py-3 text-sm text-starlight placeholder:text-starlightDim/60 focus:border-solstice focus:outline-none"
                  />
                  <div className="mt-2 flex flex-wrap gap-2">
                    {RELATIONSHIP_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setRelationship(preset)}
                        className="rounded-full border border-violet/40 px-3 py-1 text-xs text-starlightDim transition hover:border-solstice hover:text-solstice"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.18em] text-starlightDim">
                    Recipient wallet address
                  </label>
                  <input
                    type="text"
                    value={recipientWallet}
                    onChange={(e) => setRecipientWallet(e.target.value)}
                    placeholder="Devnet wallet address"
                    className="w-full rounded-xl border border-violet/40 bg-violetDeep/20 px-4 py-3 font-mono text-sm text-starlight placeholder:text-starlightDim/60 focus:border-solstice focus:outline-none"
                  />
                  <p className="mt-1 text-xs text-starlightDim/70">
                    Use <code className="font-mono text-solstice">ZARA_DEMO_WALLET</code> for demo mode, or a real
                    Devnet public key for Phantom sending.
                  </p>
                </div>

                {error && <p className="text-sm text-ember">{error}</p>}

                <button
                  type="submit"
                  disabled={!recipientWallet.trim() || !relationship.trim()}
                  className="w-full rounded-full bg-solstice-gradient py-3.5 font-display text-sm font-semibold text-spaceDeep shadow-glowSm transition hover:shadow-glow disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Consult the Oracle ✦
                </button>
              </form>
            </motion.div>
          )}

          {/* ── STEP 2 · READING ── */}
          {stage === STAGES.READING && (
            <motion.div key="reading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <ScanSequence lines={SCAN_LINES} />
            </motion.div>
          )}

          {/* ── STEP 3 & 4 · RESULTS + RELATIONSHIP INTELLIGENCE ── */}
          {stage === STAGES.RESULTS && data && (
            <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="text-center">
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-starlightDim">
                  {data.profile.social.displayName || "Recipient"}'s constellation
                </p>
                <ConstellationChart dataPoints={dataPointsForChart} centerLabel="Gift signal" />
              </div>

              {/* Relationship Intelligence panel */}
              <div className="mt-8 rounded-2xl border border-violet/25 bg-violetDeep/10 p-5">
                <p className="mb-4 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-solstice">
                  Relationship intelligence
                </p>
                <div className="grid items-center gap-3 sm:grid-cols-[1fr_auto_1fr_auto_1fr]">
                  <div className="rounded-xl border border-violet/20 bg-spaceDeep/30 p-4 text-center">
                    <p className="text-[10px] uppercase tracking-[0.14em] text-starlightDim">Recipient data</p>
                    <p className="mt-2 text-sm text-starlight">
                      {data.profile.onChain.nftHoldings.length} NFTs · {data.profile.onChain.transactionCount} txns
                    </p>
                    <p className="mt-1 text-xs text-starlightDim">
                      {data.profile.social.interests.slice(0, 2).join(", ") || "no listed interests"}
                    </p>
                  </div>
                  <span className="hidden text-center text-lg text-starlightDim sm:block">+</span>
                  <div className="rounded-xl border border-violet/20 bg-spaceDeep/30 p-4 text-center">
                    <p className="text-[10px] uppercase tracking-[0.14em] text-starlightDim">Relationship context</p>
                    <p className="mt-2 font-display text-sm font-semibold text-solstice">{relationship}</p>
                    <p className="mt-1 text-xs text-starlightDim">{data.recommendation.relationshipWeighting}</p>
                  </div>
                  <span className="hidden text-center text-lg text-starlightDim sm:block">=</span>
                  <div className="rounded-xl border border-solstice/40 bg-solstice/10 p-4 text-center">
                    <p className="text-[10px] uppercase tracking-[0.14em] text-solstice">Recommendation</p>
                    <p className="mt-2 font-display text-sm font-semibold text-starlight">
                      {data.recommendation.recommendations[0]?.title}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-mono text-xs uppercase tracking-[0.18em] text-solstice">
                      Gift intelligence
                    </p>
                    <h2 className="mt-1 font-display text-lg font-semibold text-starlight">
                      1. Review and select a recommendation
                    </h2>
                  </div>
                  <p className="font-mono text-xs uppercase tracking-[0.18em] text-starlightDim">
                    {selectedIndex + 1} of {data.recommendation.recommendations.length}
                  </p>
                </div>
                <div className="space-y-3">
                  {data.recommendation.recommendations.map((rec, i) => (
                    <RecommendationCard
                      key={rec.title}
                      recommendation={rec}
                      rank={i}
                      selected={i === selectedIndex}
                      onSelect={() => setSelectedIndex(i)}
                    />
                  ))}
                </div>
              </div>

              {/* Why GiftMind chose this */}
              <div className="mt-6 rounded-2xl border border-violet/25 bg-violetDeep/10 p-5">
                <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-solstice">
                  Why GiftMind chose this
                </p>
                <p className="text-sm leading-relaxed text-starlightDim">{selectedRecommendation?.reasoning}</p>
                <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
                  <ScoreMeter label="Confidence" value={selectedRecommendation?.confidenceScore} />
                  <ScoreMeter label="Relationship fit" value={selectedRecommendation?.relationshipAlignmentScore} />
                  <ScoreMeter label="Emotional resonance" value={selectedRecommendation?.emotionalResonanceScore} />
                  <ScoreMeter label="Long-term value" value={selectedRecommendation?.longTermValueScore} />
                </div>
              </div>

              {/* Mission control / sender approval */}
              <div className="mt-8 rounded-2xl border border-violet/30 bg-violetDeep/10 p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-mono text-xs uppercase tracking-[0.18em] text-solstice">
                      2. Mission control
                    </p>
                    <h2 className="mt-1 font-display text-lg font-semibold text-starlight">Sender approval</h2>
                  </div>
                  <div className="flex rounded-full border border-violet/40 p-1">
                    <button
                      type="button"
                      onClick={() => {
                        if (!selectedIsBoboGift) setSendMode(SEND_MODES.DEMO);
                      }}
                      disabled={selectedIsBoboGift}
                      className={`rounded-full px-3 py-1.5 text-xs transition ${
                        sendMode === SEND_MODES.DEMO && !selectedIsBoboGift
                          ? "bg-solstice text-spaceDeep"
                          : selectedIsBoboGift
                            ? "cursor-not-allowed text-starlightDim/40"
                            : "text-starlightDim hover:text-solstice"
                      }`}
                    >
                      Demo
                    </button>
                    <button
                      type="button"
                      onClick={() => setSendMode(SEND_MODES.REAL_SOL)}
                      className={`rounded-full px-3 py-1.5 text-xs transition ${
                        sendMode === SEND_MODES.REAL_SOL
                          ? "bg-solstice text-spaceDeep"
                          : "text-starlightDim hover:text-solstice"
                      }`}
                    >
                      Devnet
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                  <div className="rounded-lg border border-violet/20 bg-spaceDeep/30 p-3">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-starlightDim">Selected gift</p>
                    <p className="mt-2 font-display text-sm font-semibold text-starlight">
                      {selectedRecommendation?.title}
                    </p>
                    <p className="mt-1 font-mono text-xs text-solstice">
                      {selectedRecommendation?.suggestedAmountOrAsset}
                    </p>
                  </div>
                  <div className="rounded-lg border border-violet/20 bg-spaceDeep/30 p-3">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-starlightDim">Recipient</p>
                    <p className="mt-2 break-all font-mono text-xs text-starlight">{recipientWallet}</p>
                  </div>
                  <div className="rounded-lg border border-violet/20 bg-spaceDeep/30 p-3">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-starlightDim">Relationship</p>
                    <p className="mt-2 text-sm text-starlight">{relationship}</p>
                  </div>
                </div>

                <p className="mt-3 text-xs text-starlightDim">
                  {selectedDeliveryGift.tokenSymbol === BOBOCOIN.symbol
                    ? `${BOBOCOIN.displayName} Devnet token. Mint: ${BOBOCOIN.devnetMint}.`
                    : selectedRecommendation?.giftType === "SOL"
                      ? "SOL gift. Can be sent with Phantom when using a real Devnet wallet."
                      : "Demo delivery for this gift type until backend delivery support is ready."}
                </p>

                {selectedUsesRealPhantom && (
                  <p className={`mt-3 text-xs ${canRealSendSelectedGift ? "text-solstice" : "text-ember"}`}>
                    {canRealSendSelectedGift
                      ? "Ready to send Bobocoin from your Phantom wallet to the recipient wallet."
                      : "Bobocoin requires connected Phantom and a valid Solana recipient wallet."}
                  </p>
                )}
              </div>

              {/* Message composer */}
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-violet/25 bg-violetDeep/10 p-5">
                  <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.18em] text-solstice">
                    3. Add your human touch
                  </p>
                  <p className="mb-3 text-xs text-starlightDim">A short note arrives with the gift.</p>
                  <textarea
                    value={personalMessage}
                    onChange={(e) => setPersonalMessage(e.target.value)}
                    rows={5}
                    maxLength={220}
                    placeholder="Write a short note to go with the gift…"
                    className="w-full rounded-xl border border-violet/40 bg-violetDeep/20 px-4 py-3 text-sm text-starlight placeholder:text-starlightDim/60 focus:border-solstice focus:outline-none"
                  />
                  <p className="mt-1 text-right text-xs text-starlightDim/70">{personalMessage.length}/220</p>
                </div>

                <div className="rounded-2xl border border-violet/25 bg-violetDeep/10 p-5">
                  <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-starlightDim">
                    Recipient preview
                  </p>
                  <div className="rounded-xl border border-violet/20 bg-spaceDeep/40 p-4">
                    <p className="font-display text-sm font-semibold text-starlight">
                      {selectedRecommendation?.title}
                    </p>
                    <p className="mt-2 text-sm text-starlightDim">
                      {personalMessage.trim() ||
                        "Add a personal message so the gift arrives with your voice, not just GiftMind's."}
                    </p>
                    <p className="mt-3 text-sm italic text-starlightDim">
                      "{data.recommendation.claimMessage}"
                    </p>
                  </div>
                </div>
              </div>

              {error && <p className="mt-4 text-sm text-ember">{error}</p>}
              {!hasPersonalMessage && (
                <p className="mt-4 text-sm text-ember">Add a personal message before approving the gift.</p>
              )}

              <button
                onClick={handleApproveAndSend}
                disabled={!hasPersonalMessage || (selectedUsesRealPhantom && !canRealSendSelectedGift)}
                className="mt-6 w-full rounded-full bg-solstice-gradient py-3.5 font-display text-sm font-semibold text-spaceDeep shadow-glowSm transition hover:shadow-glow disabled:cursor-not-allowed disabled:opacity-50"
              >
                {approveButtonLabel}
              </button>
            </motion.div>
          )}

          {/* ── STEP 7 · DELIVERING ── */}
          {stage === STAGES.DELIVERING && (
            <motion.div key="delivering" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="relative">
                <motion.div
                  className="pointer-events-none absolute left-0 top-10 h-0.5 w-0.5 rounded-full bg-solstice shadow-glow"
                  initial={{ x: "-10%", y: 0, opacity: 0 }}
                  animate={{ x: "120%", y: -60, opacity: [0, 1, 1, 0] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: "easeIn" }}
                  style={{ boxShadow: "0 0 16px 4px rgba(255,184,77,0.8)" }}
                />
                <ScanSequence
                  lines={selectedUsesRealPhantom ? LAUNCH_LINES_REAL : LAUNCH_LINES_DEMO}
                  accent="ember"
                />
              </div>
            </motion.div>
          )}

          {/* ── STEP 8 · DELIVERED ── */}
          {stage === STAGES.DELIVERED && deliveryResult && (
            <motion.div
              key="delivered"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 160, damping: 14 }}
                className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-solstice-gradient text-4xl shadow-glow"
              >
                ✦
              </motion.div>
              <h2 className="font-display text-3xl font-semibold text-starlight">Gift Successfully Delivered</h2>
              <p className="mx-auto mt-3 max-w-sm text-sm text-starlightDim">
                The stars have aligned. Your gift now has a transaction record and a claim link.
              </p>

              <div className="mx-auto mt-8 max-w-lg rounded-2xl border border-solstice/40 bg-violetDeep/20 p-6 text-left">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-violet/20 bg-spaceDeep/30 p-3">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-starlightDim">Gift</p>
                    <p className="mt-2 font-display text-base font-semibold text-starlight">{deliveryResult.title}</p>
                    <p className="mt-1 font-mono text-xs text-solstice">
                      {deliveryResult.tokenAmount && deliveryResult.tokenSymbol
                        ? `${deliveryResult.tokenAmount} ${deliveryResult.tokenSymbol}`
                        : `${deliveryResult.solAmount || selectedSolAmount || 0} SOL`}
                    </p>
                  </div>
                  <div className="rounded-xl border border-violet/20 bg-spaceDeep/30 p-3">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-starlightDim">Recipient</p>
                    <p className="mt-2 break-all font-mono text-xs text-starlight">
                      {deliveryResult.recipientAddress}
                    </p>
                    <p className="mt-1 text-xs text-starlightDim">{deliveryResult.relationshipContext}</p>
                  </div>
                </div>

                <p className="mt-4 text-sm text-starlightDim">{deliveryResult.personalMessage || personalMessage}</p>
                <div className="mt-4 rounded-xl border border-violet/20 bg-spaceDeep/30 p-3">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-starlightDim">Transaction</p>
                  <p className="mt-2 break-all font-mono text-xs text-starlightDim">{deliveryResult.signature}</p>
                  <a
                    href={deliveryResult.explorerUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-block text-sm text-solstice underline"
                  >
                    View on Solana Explorer
                  </a>
                </div>

                <div className="mt-4 rounded-xl border border-violet/20 bg-spaceDeep/30 p-3">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-starlightDim">Claim link</p>
                  <p className="mt-2 break-all font-mono text-xs text-starlight">{deliveryResult.claimUrl}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={handleCopyClaimLink}
                      className="rounded-full border border-violet/60 px-4 py-2 font-display text-xs font-semibold text-starlight transition hover:border-solstice hover:text-solstice"
                    >
                      {copiedClaimLink ? "Copied" : "Copy Claim Link"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <a
                  href={deliveryResult.claimUrl}
                  className="inline-block rounded-full bg-solstice-gradient px-7 py-3 font-display text-sm font-semibold text-spaceDeep shadow-glowSm transition hover:shadow-glow"
                >
                  Open Claim Link
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
