import { Link } from "react-router-dom";
import { motion } from "framer-motion";


const steps = [
  {
    num: "1",
    icon: "📡",
    label: "Read the Chart",
    desc: "On-chain holdings and a social graph combine into one recipient profile.",
    accent: "from-violet to-violet/60",
  },
  {
    num: "2",
    icon: "🤝",
    label: "Weigh the Relationship",
    desc: "Father, partner, sibling, friend — the same person gets a different gift depending on who's sending.",
    accent: "from-violet/80 to-solstice/60",
  },
  {
    num: "3",
    icon: "🚀",
    label: "Send It Across",
    desc: "A real Devnet transaction delivers the gift, with a one-click claim for the recipient.",
    accent: "from-solstice/70 to-solstice/40",
  },
];

export default function Home() {
  return (
    <div className="relative mx-auto max-w-5xl overflow-hidden px-6 pb-24 pt-12 sm:px-10">
      {/* Ambient background orbs */}
      <div
        className="pointer-events-none absolute left-1/2 top-[-80px] h-[340px] w-[500px] -translate-x-1/2 rounded-full"
        style={{
          background:
            "radial-gradient(ellipse, rgba(139,92,246,0.18) 0%, transparent 70%)",
          filter: "blur(72px)",
        }}
      />
      <div
        className="pointer-events-none absolute bottom-20 right-[-60px] h-[280px] w-[280px] rounded-full"
        style={{
          background:
            "radial-gradient(ellipse, rgba(249,115,22,0.09) 0%, transparent 70%)",
          filter: "blur(72px)",
        }}
      />

      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="relative z-10 text-center"
      >
        <div className="mb-6 inline-flex items-center gap-2">
          <span className="h-1 w-1 rounded-full bg-violet" />
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-starlightDim">
            Summer Solstice · Solana Devnet
          </p>
          <span className="h-1 w-1 rounded-full bg-violet" />
        </div>

        <h1 className="font-display text-4xl font-bold leading-[1.1] tracking-tight text-starlight sm:text-5xl">
          Your wallet knows them
          <br />
          <span className="bg-solstice-gradient bg-clip-text text-transparent">
            better than you think.
          </span>
        </h1>

        <p className="mx-auto mt-5 max-w-[480px] text-[15px] leading-relaxed text-starlightDim sm:text-base">
          GiftMind reads a recipient's on-chain activity and social graph,
          weighs who you are to them, and delivers a gift on Solana that
          actually means something.
        </p>

        {/* CTAs — clear primary hierarchy */}
        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            to="/profile"
            className="inline-flex items-center gap-2 rounded-full border border-violet/40 px-6 py-[11px] font-display text-sm font-semibold text-starlight/80 transition hover:border-violet/70 hover:text-starlight"
          >
            <svg className="h-4 w-4 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Build a Profile
          </Link>

          {/* Primary */}
          <Link
            to="/send"
            className="inline-flex items-center gap-2 rounded-full bg-solstice-gradient px-7 py-[13px] font-display text-sm font-bold text-spaceDeep shadow-glow transition hover:scale-[1.03] hover:shadow-glow/80"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Read a Recipient's Chart
          </Link>

          <Link
            to="/claim/demo-gift-1"
            className="inline-flex items-center gap-2 rounded-full border border-violet/40 px-6 py-[11px] font-display text-sm font-semibold text-starlight/80 transition hover:border-violet/70 hover:text-starlight"
          >
            <svg className="h-4 w-4 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
            </svg>
            Preview a Claim
          </Link>
        </div>
      </motion.div>

      {/* Divider */}
      <div className="relative z-10 my-14 mx-4 border-t border-violet/10" />

      {/* Steps */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.25 }}
        className="relative z-10"
      >
        <p className="mb-7 text-center font-mono text-[11px] uppercase tracking-[0.16em] text-starlightDim/50">
          How it works
        </p>

        <div className="grid gap-4 sm:grid-cols-3">
          {steps.map((step, i) => (
            <motion.div
              key={step.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.35 + i * 0.1 }}
              className="group relative rounded-2xl border border-violet/20 bg-violetDeep/20 p-6 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-violet/35"
              style={{
                borderTop: "2px solid",
                borderTopColor: i === 0
                  ? "rgba(139,92,246,0.45)"
                  : i === 1
                  ? "rgba(109,40,217,0.45)"
                  : "rgba(249,115,22,0.45)",
              }}
            >
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full border border-violet/30 bg-violet/10 font-mono text-[11px] font-bold text-violet">
                  {step.num}
                </span>
                <span className="text-lg">{step.icon}</span>
              </div>
              <h3 className="font-display text-[15px] font-semibold text-starlight">
                {step.label}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-starlightDim">
                {step.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}