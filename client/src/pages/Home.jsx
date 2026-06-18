import { motion } from "framer-motion";
import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="relative mx-auto max-w-5xl px-6 pb-24 pt-12 sm:px-10">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="text-center"
      >
        <p className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-starlightDim">
          Summer Solstice · Solana Devnet
        </p>
        <h1 className="font-display text-4xl font-semibold leading-tight text-starlight sm:text-6xl">
          Your wallet knows them
          <br />
          <span className="bg-solstice-gradient bg-clip-text text-transparent">better than you think.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-base text-starlightDim sm:text-lg">
          GiftMind reads a recipient's on-chain activity and social chart, weighs who you are to them, and delivers
          a gift on Solana that actually means something — not another generic token drop.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            to="/profile"
            className="rounded-full border border-violet/60 px-7 py-3 font-display text-sm font-semibold text-starlight transition hover:border-solstice/60 hover:text-solstice"
          >
            Build a Profile
          </Link>
          <Link
            to="/send"
            className="rounded-full bg-solstice-gradient px-7 py-3 font-display text-sm font-semibold text-spaceDeep shadow-glow transition hover:scale-[1.02]"
          >
            Read a Recipient's Chart
          </Link>
          <Link
            to="/claim/demo-gift-1"
            className="rounded-full border border-violet/60 px-7 py-3 font-display text-sm font-semibold text-starlight transition hover:border-solstice/60 hover:text-solstice"
          >
            Preview a Claim
          </Link>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.3 }}
        className="mt-24 grid gap-6 sm:grid-cols-3"
      >
        {[
          {
            label: "Read the Chart",
            desc: "On-chain holdings and a social graph combine into one recipient profile.",
          },
          {
            label: "Weigh the Relationship",
            desc: "Father, partner, sibling, friend — the same person gets a different gift depending on who's sending.",
          },
          {
            label: "Send It Across",
            desc: "A real Devnet transaction delivers the gift, with a one-click claim for the recipient.",
          },
        ].map((step) => (
          <div
            key={step.label}
            className="rounded-2xl border border-violet/30 bg-violetDeep/20 p-6 backdrop-blur-sm"
          >
            <h3 className="font-display text-lg font-semibold text-solstice">{step.label}</h3>
            <p className="mt-2 text-sm text-starlightDim">{step.desc}</p>
          </div>
        ))}
      </motion.div>
    </div>
  );
}
