import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { fetchRecommendation, deliverGift, saveDemoClaimGift } from "../lib/api.js";
import ConstellationChart from "../components/ConstellationChart.jsx";
import RecommendationCard from "../components/RecommendationCard.jsx";

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
  devnetMint: "BOBO_DEVNET_MINT_PENDING",
};

const RELATIONSHIP_PRESETS = ["Father", "Mother", "Boyfriend", "Girlfriend", "Sibling", "Close friend"];

function parseSolAmount(value) {
  const match = String(value || "").match(/(\d+(\.\d+)?)\s*SOL/i);
  return match ? Number(match[1]) : 0;
}

function parseTokenAmount(value, symbol) {
  const match = String(value || "").match(new RegExp(`(\\d+(\\.\\d+)?)\\s*${symbol}`, "i"));
  return match ? Number(match[1]) : 0;
}

function normalizeRecommendationForDelivery(recommendation) {
  const suggestedAmountOrAsset = recommendation?.suggestedAmountOrAsset || "";
  const solAmount = parseSolAmount(suggestedAmountOrAsset);
  const boboAmount = parseTokenAmount(suggestedAmountOrAsset, BOBOCOIN.symbol);

  return {
    giftType: recommendation?.giftType || "SOL",
    title: recommendation?.title || "GiftMind Gift",
    solAmount,
    tokenAmount: boboAmount,
    tokenSymbol: boboAmount > 0 ? BOBOCOIN.symbol : undefined,
    tokenMint: boboAmount > 0 ? BOBOCOIN.devnetMint : undefined,
  };
}

function isValidPublicKey(value) {
  try {
    return Boolean(new PublicKey(value));
  } catch {
    return false;
  }
}

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
      let result;

      if (sendMode === SEND_MODES.REAL_SOL) {
        if (selected.giftType !== "SOL") {
          throw new Error("Real Devnet sending is available for SOL recommendations first. Use demo mode for this gift.");
        }
        if (!connected || !publicKey) {
          throw new Error("Connect Phantom before sending real Devnet SOL.");
        }
        if (!isValidPublicKey(recipientWallet)) {
          throw new Error("Enter a valid Solana recipient wallet for real Devnet SOL sending.");
        }

        const transaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey: new PublicKey(recipientWallet),
            lamports: Math.round(solAmount * LAMPORTS_PER_SOL),
          })
        );
        const signature = await sendTransaction(transaction, connection);
        await connection.confirmTransaction(signature, "confirmed");
        const giftId = "demo-gift-1";
        result = {
          giftId,
          signature,
          explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
          claimUrl: `${window.location.origin}/claim/${giftId}`,
        };
        saveDemoClaimGift(giftId, {
          gift: {
            giftId,
            giftType: deliveryGift.giftType,
            title: deliveryGift.title,
            senderRelationship: relationship,
            recipientAddress: recipientWallet,
            senderAddress: publicKey.toBase58(),
            solAmount,
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
          giftId: "demo-gift-1",
        });
      }

      setDeliveryResult(result);
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
  const canRealSendSelectedGift =
    selectedRecommendation?.giftType === "SOL" && selectedSolAmount > 0 && isValidPublicKey(recipientWallet);
  const isDemoTokenGift = sendMode === SEND_MODES.DEMO && selectedDeliveryGift.tokenSymbol === BOBOCOIN.symbol;
  const hasPersonalMessage = personalMessage.trim().length > 0;
  const approveButtonLabel = sendMode === SEND_MODES.REAL_SOL ? "Approve in Phantom & Send" : "Approve Demo Gift";

  return (
    <div className="relative mx-auto max-w-3xl px-6 pb-24 pt-8 sm:px-10">
      <AnimatePresence mode="wait">
        {stage === STAGES.INPUT && (
          <motion.form
            key="input"
            onSubmit={handleReadChart}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            <div>
              <h1 className="font-display text-2xl font-semibold text-starlight sm:text-3xl">
                Send a relationship-aware gift
              </h1>
              <p className="mt-2 text-sm text-starlightDim">
                Enter a recipient wallet and relationship. GiftMind will generate recommendations, then you review,
                select one, add a personal message, and approve delivery.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm text-starlightDim">Recipient wallet address</label>
              <input
                type="text"
                value={recipientWallet}
                onChange={(e) => setRecipientWallet(e.target.value)}
                placeholder="Devnet wallet address"
                className="w-full rounded-xl border border-violet/40 bg-violetDeep/20 px-4 py-3 font-mono text-sm text-starlight placeholder:text-starlightDim/60 focus:border-solstice focus:outline-none"
              />
              <p className="mt-1 text-xs text-starlightDim/70">
                Use <code className="font-mono text-solstice">ZARA_DEMO_WALLET</code> for demo mode, or a real Devnet
                public key for Phantom sending.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm text-starlightDim">Your relationship to them</label>
              <input
                type="text"
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                placeholder="e.g. her father, his boyfriend, a close friend"
                className="w-full rounded-xl border border-violet/40 bg-violetDeep/20 px-4 py-3 text-sm text-starlight placeholder:text-starlightDim/60 focus:border-solstice focus:outline-none"
              />
              <div className="mt-3 flex flex-wrap gap-2">
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

            {error && <p className="text-sm text-ember">{error}</p>}

            <button
              type="submit"
              className="w-full rounded-full bg-solstice-gradient py-3 font-display text-sm font-semibold text-spaceDeep shadow-glowSm transition hover:shadow-glow"
            >
              Generate Recommendations
            </button>
          </motion.form>
        )}

        {stage === STAGES.READING && (
          <motion.div
            key="reading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center py-20 text-center"
          >
            <div className="h-3 w-3 animate-twinkle rounded-full bg-solstice" />
            <p className="mt-6 font-display text-lg text-starlight">Reading their chart...</p>
            <p className="mt-2 text-sm text-starlightDim">
              Combining on-chain activity with social signals, weighted by who you are to them.
            </p>
          </motion.div>
        )}

        {stage === STAGES.RESULTS && data && (
          <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="text-center">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-starlightDim">
                {data.profile.social.displayName || "Recipient"}'s chart
              </p>
              <ConstellationChart dataPoints={dataPointsForChart} centerLabel="Gift signal" />
            </div>

            <div className="mt-6 rounded-xl border border-violet/30 bg-violetDeep/10 p-4">
              <p className="text-sm text-starlightDim">
                <span className="font-semibold text-solstice">Relationship weighting: </span>
                {data.recommendation.relationshipWeighting}
              </p>
            </div>

            <div className="mt-6">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.18em] text-solstice">
                    Sender approval flow
                  </p>
                  <h2 className="mt-1 font-display text-lg font-semibold text-starlight">
                    1. Review and select a recommendation
                  </h2>
                </div>
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-starlightDim">
                  {selectedIndex + 1} of {data.recommendation.recommendations.length} selected
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

            <div className="mt-6 rounded-xl border border-violet/30 bg-violetDeep/10 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.18em] text-solstice">2. Confirm gift</p>
                  <h2 className="mt-1 font-display text-lg font-semibold text-starlight">Sender approval</h2>
                  <p className="mt-1 text-sm text-starlightDim">
                    Confirm the selected gift, add your note, then approve delivery.
                  </p>
                </div>
                <div className="flex rounded-full border border-violet/40 p-1">
                  <button
                    type="button"
                    onClick={() => setSendMode(SEND_MODES.DEMO)}
                    className={`rounded-full px-3 py-1.5 text-xs transition ${
                      sendMode === SEND_MODES.DEMO ? "bg-solstice text-spaceDeep" : "text-starlightDim hover:text-solstice"
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
                    Devnet SOL
                  </button>
                </div>
              </div>

              <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div className="rounded-lg border border-violet/20 bg-spaceDeep/30 p-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-starlightDim">Selected gift</p>
                  <p className="mt-2 font-display text-base font-semibold text-starlight">
                    {selectedRecommendation?.title}
                  </p>
                  <p className="mt-1 font-mono text-xs text-solstice">
                    {selectedRecommendation?.suggestedAmountOrAsset}
                  </p>
                  <p className="mt-2 text-xs text-starlightDim">
                    {selectedDeliveryGift.tokenSymbol === BOBOCOIN.symbol
                      ? `${BOBOCOIN.displayName} demo delivery. Devnet mint: ${BOBOCOIN.devnetMint}.`
                      : selectedRecommendation?.giftType === "SOL"
                        ? "SOL gift. Can be sent with Phantom when using a real Devnet wallet."
                        : "Demo delivery for this gift type until backend delivery support is ready."}
                  </p>
                </div>
                <div className="rounded-lg border border-violet/20 bg-spaceDeep/30 p-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-starlightDim">Recipient</p>
                  <p className="mt-2 break-all font-mono text-xs text-starlight">{recipientWallet}</p>
                  <p className="mt-2 text-xs text-starlightDim">Relationship: {relationship}</p>
                </div>
              </div>

              <div className="mt-4 rounded-lg border border-violet/20 bg-spaceDeep/30 p-3">
                <p className="text-xs uppercase tracking-[0.18em] text-starlightDim">Why this gift</p>
                <p className="mt-2 text-sm text-starlightDim">{selectedRecommendation?.reasoning}</p>
              </div>

              {sendMode === SEND_MODES.REAL_SOL && (
                <p className={`mt-3 text-xs ${canRealSendSelectedGift ? "text-solstice" : "text-ember"}`}>
                  {canRealSendSelectedGift
                    ? "Ready for a real Phantom-approved Devnet SOL transfer."
                    : "Real Devnet mode requires a selected SOL gift and a valid Solana recipient wallet."}
                </p>
              )}

              {isDemoTokenGift && (
                <p className="mt-3 text-xs text-solstice">
                  Bobocoin is ready in demo approval mode. Once the devnet mint exists, this payload can be routed to
                  the backend SPL token transfer.
                </p>
              )}
            </div>

            <div className="mt-6">
              <label className="mb-2 block text-sm text-starlightDim">3. Add personal message</label>
              <textarea
                value={personalMessage}
                onChange={(e) => setPersonalMessage(e.target.value)}
                rows={3}
                maxLength={220}
                placeholder="Write a short note to go with the gift..."
                className="w-full rounded-xl border border-violet/40 bg-violetDeep/20 px-4 py-3 text-sm text-starlight placeholder:text-starlightDim/60 focus:border-solstice focus:outline-none"
              />
              <p className="mt-1 text-right text-xs text-starlightDim/70">{personalMessage.length}/220</p>
            </div>

            <div className="mt-6 rounded-xl border border-violet/30 bg-violetDeep/10 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-starlightDim">Recipient preview</p>
              <p className="mt-3 text-sm text-starlightDim">
                {personalMessage.trim() || "Add a personal message so the gift arrives with your voice, not just GiftMind's."}
              </p>
              <p className="mt-3 text-sm italic text-starlightDim">"{data.recommendation.claimMessage}"</p>
            </div>

            {error && <p className="mt-4 text-sm text-ember">{error}</p>}
            {!hasPersonalMessage && (
              <p className="mt-4 text-sm text-ember">Add a personal message before approving the gift.</p>
            )}

            <button
              onClick={handleApproveAndSend}
              disabled={!hasPersonalMessage || (sendMode === SEND_MODES.REAL_SOL && !canRealSendSelectedGift)}
              className="mt-6 w-full rounded-full bg-solstice-gradient py-3 font-display text-sm font-semibold text-spaceDeep shadow-glowSm transition hover:shadow-glow disabled:cursor-not-allowed disabled:opacity-50"
            >
              {approveButtonLabel}
            </button>
          </motion.div>
        )}

        {stage === STAGES.DELIVERING && (
          <motion.div
            key="delivering"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center py-20 text-center"
          >
            <div className="h-3 w-3 animate-twinkle rounded-full bg-ember" />
            <p className="mt-6 font-display text-lg text-starlight">Sending across the sky...</p>
            <p className="mt-2 text-sm text-starlightDim">
              {sendMode === SEND_MODES.REAL_SOL
                ? "Waiting for Phantom approval and Devnet confirmation."
                : "Creating a demo transaction and claim link."}
            </p>
          </motion.div>
        )}

        {stage === STAGES.DELIVERED && deliveryResult && (
          <motion.div
            key="delivered"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-solstice/40 bg-violetDeep/20 p-8 text-center"
          >
            <h2 className="font-display text-2xl font-semibold text-solstice">Gift delivered</h2>
            <p className="mt-3 text-sm text-starlightDim">
              The gift has a transaction record and a claim link. Share the claim link with the recipient.
            </p>
            <div className="mt-5 rounded-xl border border-violet/30 bg-spaceDeep/30 p-4 text-left">
              <p className="text-xs uppercase tracking-[0.18em] text-starlightDim">Approved gift</p>
              <p className="mt-2 font-display text-lg font-semibold text-starlight">{deliveryResult.title}</p>
              <p className="mt-1 font-mono text-xs text-solstice">
                {deliveryResult.tokenAmount && deliveryResult.tokenSymbol
                  ? `${deliveryResult.tokenAmount} ${deliveryResult.tokenSymbol}`
                  : `${deliveryResult.solAmount || selectedSolAmount || 0} SOL`}
              </p>
              <p className="mt-3 text-sm text-starlightDim">{deliveryResult.personalMessage || personalMessage}</p>
            </div>
            <p className="mt-4 break-all font-mono text-xs text-starlightDim">{deliveryResult.signature}</p>
            <a
              href={deliveryResult.explorerUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block text-sm text-solstice underline"
            >
              View on Solana Explorer
            </a>
            <div className="mt-6">
              <a
                href={deliveryResult.claimUrl}
                className="inline-block rounded-full bg-solstice-gradient px-6 py-3 font-display text-sm font-semibold text-spaceDeep shadow-glowSm"
              >
                Open Claim Link
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
