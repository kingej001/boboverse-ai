import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { fetchClaimData } from "../lib/api.js";

export default function ClaimGift() {
  const { giftId } = useParams();
  const [data, setData] = useState(null);
  const [claimed, setClaimed] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClaimData(giftId)
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [giftId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <div className="h-3 w-3 animate-twinkle rounded-full bg-solstice" />
        <p className="mt-6 text-sm text-starlightDim">Loading your gift…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-md px-6 py-24 text-center">
        <p className="text-sm text-ember">{error}</p>
      </div>
    );
  }

  const { gift, recommendation, senderMessage } = data;
  const topRecommendation = recommendation.recommendations[0];
  const amountLabel =
    topRecommendation.suggestedAmountOrAsset ||
    (gift.tokenAmount && gift.tokenSymbol ? `${gift.tokenAmount} ${gift.tokenSymbol}` : `${gift.solAmount || 0} SOL`);

  return (
    <div className="relative mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center px-6 pb-24 text-center">
      {!claimed ? (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-starlightDim">A gift has arrived</p>
          <h1 className="mt-4 font-display text-3xl font-semibold text-starlight sm:text-4xl">
            Something is waiting
            <br />
            <span className="bg-solstice-gradient bg-clip-text text-transparent">in the sky for you.</span>
          </h1>
          <div className="mx-auto mt-6 max-w-md rounded-2xl border border-violet/30 bg-violetDeep/20 p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-starlightDim">Sender message</p>
            <p className="mt-3 text-sm text-starlightDim">{senderMessage}</p>
          </div>
          <button
            onClick={() => setClaimed(true)}
            className="mt-10 rounded-full bg-solstice-gradient px-8 py-3 font-display text-sm font-semibold text-spaceDeep shadow-glow transition hover:scale-[1.02]"
          >
            Reveal Your Gift
          </button>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="w-full"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.6, type: "spring" }}
            className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-solstice-gradient shadow-glow"
          >
            <span className="font-display text-2xl font-bold text-spaceDeep">☉</span>
          </motion.div>

          <h2 className="mt-6 font-display text-2xl font-semibold text-starlight">{topRecommendation.title}</h2>
          <p className="mt-1 font-mono text-sm text-solstice">{amountLabel}</p>

          <div className="mt-6 rounded-2xl border border-violet/30 bg-violetDeep/20 p-6">
            <p className="text-sm italic text-starlightDim">"{recommendation.claimMessage}"</p>
            {topRecommendation.reasoning && (
              <p className="mt-4 text-sm text-starlightDim">{topRecommendation.reasoning}</p>
            )}
          </div>

          <div className="mt-6 grid gap-2 text-xs text-starlightDim/70 sm:grid-cols-2">
            <p>
              Gift status:{" "}
              <span className="text-solstice">{gift.status === "pending" ? "ready to claim" : "claimed"}</span>
            </p>
            <p>From: <span className="text-solstice">{gift.senderRelationship || "sender"}</span></p>
          </div>

          {gift.explorerUrl && (
            <a
              href={gift.explorerUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-block text-sm text-solstice underline"
            >
              View delivery record
            </a>
          )}

          <button className="mt-8 w-full rounded-full bg-solstice-gradient py-3 font-display text-sm font-semibold text-spaceDeep shadow-glowSm transition hover:shadow-glow sm:w-auto sm:px-10">
            Claim Gift
          </button>
        </motion.div>
      )}
    </div>
  );
}
