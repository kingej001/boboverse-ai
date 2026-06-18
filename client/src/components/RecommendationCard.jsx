import { motion } from "framer-motion";

const GIFT_TYPE_LABELS = {
  SOL: "SOL transfer",
  SPL_TOKEN: "Token gift",
  NFT: "NFT",
  EXPERIENCE: "Experience",
};

export default function RecommendationCard({ recommendation, selected, onSelect, rank }) {
  return (
    <motion.button
      onClick={onSelect}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: rank * 0.1 }}
      className={`w-full rounded-2xl border p-5 text-left transition ${
        selected
          ? "border-solstice bg-violetDeep/40 shadow-glowSm"
          : "border-violet/30 bg-violetDeep/10 hover:border-violet/60"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="rounded-full bg-violet/30 px-3 py-1 font-mono text-xs uppercase tracking-wide text-starlightDim">
          {GIFT_TYPE_LABELS[recommendation.giftType] || recommendation.giftType}
        </span>
        {selected && <span className="text-sm text-solstice">Selected</span>}
      </div>
      <h3 className="mt-3 font-display text-lg font-semibold text-starlight">{recommendation.title}</h3>
      <p className="mt-2 text-sm text-starlightDim">{recommendation.reasoning}</p>
      <p className="mt-3 font-mono text-xs text-solstice">{recommendation.suggestedAmountOrAsset}</p>
    </motion.button>
  );
}
