import { motion, AnimatePresence, useAnimation } from "framer-motion";
import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";

import { claimGift, fetchClaimData } from "../lib/api.js";


/* ─────────────────────────────────────────────
   STAR FIELD CANVAS
───────────────────────────────────────────── */
function StarField({ phase }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const starsRef = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = (canvas.width = window.innerWidth);
    const H = (canvas.height = window.innerHeight);

    starsRef.current = Array.from({ length: 220 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.6 + 0.2,
      speed: Math.random() * 0.3 + 0.05,
      opacity: Math.random(),
      twinkleSpeed: Math.random() * 0.02 + 0.005,
      twinkleDir: Math.random() > 0.5 ? 1 : -1,
    }));

    let frame = 0;
    function draw() {
      ctx.clearRect(0, 0, W, H);
      frame++;
      starsRef.current.forEach((s) => {
        s.opacity += s.twinkleSpeed * s.twinkleDir;
        if (s.opacity > 1 || s.opacity < 0.1) s.twinkleDir *= -1;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${s.opacity * (phase === "celebration" ? 1 : 0.75)})`;
        ctx.fill();

        if (phase === "celebration" && frame % 3 === 0) {
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r * 3, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(192,132,252,${s.opacity * 0.15})`;
          ctx.fill();
        }
      });
      animRef.current = requestAnimationFrame(draw);
    }
    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [phase]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0"
      style={{ opacity: 0.9 }}
    />
  );
}

/* ─────────────────────────────────────────────
   CONSTELLATION SVG
───────────────────────────────────────────── */
const NODES = [
  { x: 50, y: 20 }, { x: 20, y: 45 }, { x: 80, y: 45 },
  { x: 35, y: 70 }, { x: 65, y: 70 }, { x: 50, y: 90 },
];
const EDGES = [[0,1],[0,2],[1,3],[2,4],[3,5],[4,5],[1,4],[2,3]];

function Constellation({ animate: doAnimate, glowing }) {
  return (
    <svg viewBox="0 0 100 110" className="absolute inset-0 h-full w-full" style={{ opacity: doAnimate ? 1 : 0.15 }}>
      {EDGES.map(([a, b], i) => (
        <motion.line
          key={i}
          x1={NODES[a].x} y1={NODES[a].y}
          x2={NODES[b].x} y2={NODES[b].y}
          stroke={glowing ? "#ffd700" : "#c084fc"}
          strokeWidth="0.4"
          strokeOpacity={glowing ? 0.9 : 0.5}
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: doAnimate ? 1 : 0, opacity: doAnimate ? 1 : 0 }}
          transition={{ duration: 0.8, delay: i * 0.12, ease: "easeOut" }}
        />
      ))}
      {NODES.map((n, i) => (
        <motion.circle
          key={i}
          cx={n.x} cy={n.y} r={glowing ? 1.8 : 1.2}
          fill={glowing ? "#ffd700" : "#c084fc"}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: doAnimate ? 1 : 0, opacity: doAnimate ? 1 : 0 }}
          transition={{ duration: 0.4, delay: 0.3 + i * 0.1 }}
        >
          {glowing && (
            <animate attributeName="r" values="1.8;2.8;1.8" dur="2s" repeatCount="indefinite" />
          )}
        </motion.circle>
      ))}
    </svg>
  );
}

/* ─────────────────────────────────────────────
   FLOATING PARTICLES
───────────────────────────────────────────── */
function Particles({ count = 18, color = "#c084fc" }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: Math.random() * 4 + 2,
            height: Math.random() * 4 + 2,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            background: i % 3 === 0 ? "#ffd700" : color,
          }}
          animate={{
            y: [0, -30 - Math.random() * 40, 0],
            x: [0, (Math.random() - 0.5) * 30, 0],
            opacity: [0, 0.8, 0],
            scale: [0, 1, 0],
          }}
          transition={{
            duration: 3 + Math.random() * 4,
            delay: Math.random() * 5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   SIGNAL BADGE
───────────────────────────────────────────── */
function SignalBadge({ icon, label, value, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-4 text-left backdrop-blur-sm"
    >
      <span className="mt-0.5 text-lg">{icon}</span>
      <div>
        <p className="text-[10px] uppercase tracking-widest text-white/40">{label}</p>
        <p className="mt-0.5 text-sm text-white/80">{value}</p>
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   REVEAL STAGE INDICATOR
───────────────────────────────────────────── */
const REVEAL_STAGES = [
  "Reading your story…",
  "Mapping your constellation…",
  "Gathering solar energy…",
  "Materializing your gift…",
  "Gift revealed.",
];

function RevealProgress({ stage }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <motion.p
        key={stage}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className="font-mono text-xs tracking-widest text-white/50"
      >
        {REVEAL_STAGES[stage] || REVEAL_STAGES[4]}
      </motion.p>
      <div className="flex gap-1.5">
        {REVEAL_STAGES.map((_, i) => (
          <motion.div
            key={i}
            className="h-1 rounded-full"
            animate={{
              width: i <= stage ? 24 : 8,
              backgroundColor: i <= stage ? "#ffd700" : "rgba(255,255,255,0.15)",
            }}
            transition={{ duration: 0.4 }}
          />
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   AURORA RING
───────────────────────────────────────────── */
function AuroraRing({ active }) {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      {[1, 2, 3].map((i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: 120 + i * 60,
            height: 120 + i * 60,
            border: `1px solid rgba(192,132,252,${active ? 0.25 / i : 0.06 / i})`,
          }}
          animate={active ? {
            scale: [1, 1.08, 1],
            opacity: [0.5, 1, 0.5],
          } : { scale: 1, opacity: 0.3 }}
          transition={{
            duration: 2.5 + i * 0.5,
            delay: i * 0.3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   SOLAR BURST (claim animation)
───────────────────────────────────────────── */
function SolarBurst({ active }) {
  if (!active) return null;
  return (
    <motion.div
      className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 1, 0] }}
      transition={{ duration: 1.8, ease: "easeOut" }}
    >
      {[...Array(12)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute h-1 rounded-full"
          style={{
            width: 60 + Math.random() * 80,
            background: "linear-gradient(90deg, #ffd700, transparent)",
            transformOrigin: "left center",
            rotate: `${i * 30}deg`,
          }}
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: [0, 1, 0], opacity: [0, 1, 0] }}
          transition={{ duration: 1.2, delay: i * 0.04, ease: "easeOut" }}
        />
      ))}
      <motion.div
        className="absolute h-24 w-24 rounded-full"
        style={{ background: "radial-gradient(circle, #ffd70080, transparent 70%)" }}
        initial={{ scale: 0 }}
        animate={{ scale: [0, 3, 0], opacity: [0, 1, 0] }}
        transition={{ duration: 1.5, ease: "easeOut" }}
      />
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
export default function ClaimGift() {
  const { giftId } = useParams();
  const [data, setData] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // New UX state
  const [phase, setPhase] = useState("arrival"); // arrival | revealing | gift | celebration
  const [revealStage, setRevealStage] = useState(0);
  const [solarBurst, setSolarBurst] = useState(false);

  useEffect(() => {
    fetchClaimData(giftId)
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [giftId]);

  // Dramatic reveal sequence
  const startReveal = useCallback(() => {
    setRevealed(true);
    setPhase("revealing");
    let s = 0;
    const interval = setInterval(() => {
      s++;
      setRevealStage(s);
      if (s >= 4) {
        clearInterval(interval);
        setTimeout(() => setPhase("gift"), 600);
      }
    }, 900);
  }, []);

  async function handleClaimGift() {
    setClaiming(true);
    setError("");
    setSolarBurst(true);
    setTimeout(() => setSolarBurst(false), 2000);
    try {
      const claimedGift = await claimGift(giftId);
      setData(claimedGift);
      setTimeout(() => setPhase("celebration"), 1800);
    } catch (err) {
      setError(err.message);
    } finally {
      setClaiming(false);
    }
  }

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#0a0612]">
        <StarField phase="arrival" />
        <motion.div
          className="relative z-10 flex flex-col items-center gap-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div
            className="h-12 w-12 rounded-full border border-[#c084fc]/40"
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          />
          <p className="font-mono text-xs tracking-widest text-white/30">NAVIGATING TO YOUR STAR</p>
        </motion.div>
      </div>
    );
  }

  /* ── Error ── */
  if (error && !data) {
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#0a0612]">
        <StarField phase="arrival" />
        <div className="relative z-10 text-center">
          <p className="font-mono text-sm text-[#ff6b35]">{error}</p>
        </div>
      </div>
    );
  }

  const { gift, recommendation, senderMessage } = data || {};
  const topRecommendation = recommendation?.recommendations?.[0];
  const isClaimed = gift?.status === "claimed";
  const amountLabel =
    topRecommendation?.suggestedAmountOrAsset ||
    (gift?.tokenAmount && gift?.tokenSymbol
      ? `${gift.tokenAmount} ${gift.tokenSymbol}`
      : `${gift?.solAmount || 0} SOL`);

  /* ═══════════════════════════════════════════
     PHASE 1 — ARRIVAL SCREEN
  ═══════════════════════════════════════════ */
  if (!revealed) {
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#0a0612]">
        <StarField phase="arrival" />
        <Particles count={24} />

        {/* Ambient aurora glow */}
        <div
          className="pointer-events-none fixed inset-x-0 top-0 h-64 opacity-30"
          style={{ background: "radial-gradient(ellipse 80% 50% at 50% 0%, #7c3aed, transparent)" }}
        />
        <div
          className="pointer-events-none fixed inset-x-0 bottom-0 h-48 opacity-20"
          style={{ background: "radial-gradient(ellipse 60% 40% at 50% 100%, #0ea5e9, transparent)" }}
        />

        <motion.div
          className="relative z-10 mx-auto flex max-w-lg flex-col items-center px-8 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.2 }}
        >
          {/* Constellation orbiting icon */}
          <div className="relative mb-10 h-28 w-28">
            <AuroraRing active />
            <div className="absolute inset-0 flex items-center justify-center">
              <Constellation animate={true} glowing={false} />
            </div>
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            >
              <div
                className="h-28 w-28 rounded-full"
                style={{
                  background:
                    "conic-gradient(from 0deg, transparent 75%, #c084fc22 85%, transparent 100%)",
                }}
              />
            </motion.div>
          </div>

          <motion.p
            className="font-mono text-[10px] uppercase tracking-[0.35em] text-[#c084fc]/60"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            A constellation has formed around you
          </motion.p>

          <motion.h1
            className="mt-5 text-4xl font-light leading-[1.15] tracking-tight text-white sm:text-5xl"
            style={{ fontFamily: "'Cormorant Galatia', Georgia, serif" }}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.9 }}
          >
            The stars have aligned
            <br />
            <em
              className="not-italic"
              style={{
                background: "linear-gradient(135deg, #ffd700 0%, #c084fc 50%, #38bdf8 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              specifically for you.
            </em>
          </motion.h1>

          {/* Sender message card */}
          <motion.div
            className="relative mt-10 w-full overflow-hidden rounded-2xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1, duration: 0.8 }}
          >
            <div
              className="absolute inset-0 rounded-2xl"
              style={{
                background: "linear-gradient(135deg, rgba(124,58,237,0.15), rgba(14,165,233,0.08))",
                border: "1px solid rgba(192,132,252,0.2)",
                backdropFilter: "blur(12px)",
              }}
            />
            <div className="relative px-6 py-6">
              <p className="mb-3 font-mono text-[9px] uppercase tracking-[0.3em] text-white/30">
                A message from {gift?.senderRelationship || "someone who knows you"}
              </p>
              <p
                className="text-base font-light leading-relaxed text-white/70"
                style={{ fontFamily: "'Cormorant Galatia', Georgia, serif", fontSize: "1.1rem" }}
              >
                &ldquo;{senderMessage}&rdquo;
              </p>
            </div>
          </motion.div>

          <motion.button
            onClick={startReveal}
            className="group relative mt-12 overflow-hidden rounded-full px-10 py-4 font-mono text-xs uppercase tracking-widest text-[#0a0612]"
            style={{
              background: "linear-gradient(135deg, #ffd700, #c084fc)",
            }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.5 }}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
          >
            <span className="relative z-10 font-semibold">Reveal Your Gift</span>
            <motion.div
              className="absolute inset-0 bg-white/20"
              initial={{ x: "-100%" }}
              whileHover={{ x: "100%" }}
              transition={{ duration: 0.5 }}
            />
          </motion.button>

          <motion.p
            className="mt-6 font-mono text-[10px] text-white/20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2 }}
          >
            Someone truly understands you.
          </motion.p>
        </motion.div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════
     PHASE 2 — REVEAL SEQUENCE
  ═══════════════════════════════════════════ */
  if (phase === "revealing") {
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#0a0612]">
        <StarField phase="revealing" />

        <div
          className="pointer-events-none fixed inset-0 opacity-40"
          style={{
            background: `radial-gradient(ellipse 70% 70% at 50% 50%, #7c3aed20, transparent)`,
          }}
        />

        <motion.div
          className="relative z-10 flex flex-col items-center gap-12 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {/* Large constellation forming */}
          <div className="relative h-56 w-56">
            <AuroraRing active />
            <Particles count={30} color="#ffd700" />
            <motion.div
              className="absolute inset-0"
              initial={{ rotate: -10, scale: 0.8 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ duration: 1.5, ease: "easeOut" }}
            >
              <Constellation animate={revealStage >= 1} glowing={revealStage >= 3} />
            </motion.div>

            {/* Solar core */}
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              initial={{ scale: 0 }}
              animate={{ scale: revealStage >= 2 ? 1 : 0 }}
              transition={{ duration: 0.8, type: "spring" }}
            >
              <div
                className="h-14 w-14 rounded-full flex items-center justify-center"
                style={{
                  background: "radial-gradient(circle, #ffd700, #ff6b35)",
                  boxShadow: "0 0 40px #ffd70060, 0 0 80px #ff6b3530",
                }}
              >
                <motion.span
                  className="text-xl"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                >
                  ☉
                </motion.span>
              </div>
            </motion.div>
          </div>

          <RevealProgress stage={revealStage} />
        </motion.div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════
     PHASE 3–7 — GIFT SCREEN (+ CELEBRATION)
  ═══════════════════════════════════════════ */
  const isCelebration = phase === "celebration";

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0a0612]">
      <StarField phase={isCelebration ? "celebration" : "gift"} />
      <SolarBurst active={solarBurst} />

      {/* Aurora background */}
      <div
        className="pointer-events-none fixed inset-x-0 top-0 h-screen opacity-25"
        style={{
          background: isCelebration
            ? "radial-gradient(ellipse 100% 60% at 50% 20%, #ffd70030, #7c3aed20, transparent)"
            : "radial-gradient(ellipse 80% 50% at 50% 10%, #7c3aed25, transparent)",
        }}
      />

      <div className="relative z-10 mx-auto max-w-2xl px-6 py-16 pb-24">

        {/* ── CELEBRATION HEADER ── */}
        <AnimatePresence>
          {isCelebration && (
            <motion.div
              className="mb-12 text-center"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <motion.p
                className="font-mono text-[10px] uppercase tracking-[0.4em] text-[#ffd700]/70"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                ✦ Gift Claimed ✦
              </motion.p>
              <h2
                className="mt-3 text-3xl font-light text-white sm:text-4xl"
                style={{ fontFamily: "'Cormorant Galatia', Georgia, serif" }}
              >
                It&apos;s yours, under the stars.
              </h2>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── PHASE 4: GIFT HERO CARD ── */}
        <motion.div
          className="relative overflow-hidden rounded-3xl"
          initial={{ opacity: 0, scale: 0.92, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
        >
          {/* Card background */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(135deg, rgba(124,58,237,0.22) 0%, rgba(10,6,18,0.9) 60%, rgba(14,165,233,0.12) 100%)",
              border: "1px solid rgba(192,132,252,0.25)",
              backdropFilter: "blur(20px)",
            }}
          />
          <Particles count={14} color="#c084fc" />

          <div className="relative px-8 py-10">
            {/* Solar icon */}
            <div className="mb-8 flex justify-center">
              <div className="relative">
                <AuroraRing active={isCelebration} />
                <div className="relative h-24 w-24">
                  <div className="absolute inset-0">
                    <Constellation animate glowing={isCelebration} />
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <motion.div
                      className="h-12 w-12 rounded-full flex items-center justify-center"
                      style={{
                        background: "radial-gradient(circle, #ffd700, #c084fc)",
                        boxShadow: isCelebration
                          ? "0 0 30px #ffd70080, 0 0 60px #c084fc40"
                          : "0 0 20px #ffd70040",
                      }}
                      animate={isCelebration ? { scale: [1, 1.1, 1] } : {}}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <span className="text-xl text-[#0a0612] font-bold">☉</span>
                    </motion.div>
                  </div>
                </div>
              </div>
            </div>

            {/* Gift title & value */}
            <div className="text-center">
              <motion.h2
                className="text-3xl font-light text-white sm:text-4xl"
                style={{ fontFamily: "'Cormorant Galatia', Georgia, serif" }}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                {topRecommendation?.title}
              </motion.h2>
              <motion.p
                className="mt-2 font-mono text-lg font-semibold"
                style={{
                  background: "linear-gradient(90deg, #ffd700, #c084fc)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                {amountLabel}
              </motion.p>
            </div>

            {/* Personal message */}
            {recommendation?.claimMessage && (
              <motion.div
                className="mt-8 rounded-2xl px-6 py-5 text-center"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <p
                  className="text-base font-light leading-relaxed text-white/75 italic"
                  style={{ fontFamily: "'Cormorant Galatia', Georgia, serif", fontSize: "1.05rem" }}
                >
                  &ldquo;{recommendation.claimMessage}&rdquo;
                </p>
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* ── PHASE 5: RELATIONSHIP STORY ── */}
        <motion.div
          className="mt-8 overflow-hidden rounded-2xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.7 }}
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(192,132,252,0.15)",
            backdropFilter: "blur(8px)",
          }}
        >
          <div className="px-6 py-5">
            <p className="mb-1 font-mono text-[9px] uppercase tracking-[0.35em] text-white/30">
              This gift comes from
            </p>
            <p
              className="text-2xl font-light text-white"
              style={{ fontFamily: "'Cormorant Galatia', Georgia, serif" }}
            >
              Your{" "}
              <span
                style={{
                  background: "linear-gradient(90deg, #ffd700, #c084fc)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                {gift?.senderRelationship || "Sender"}
              </span>
            </p>
            {topRecommendation?.reasoning && (
              <p className="mt-3 text-sm leading-relaxed text-white/45">
                {topRecommendation.reasoning}
              </p>
            )}
          </div>
        </motion.div>

        {/* ── PHASE 3: WHY THIS GIFT (Signal Visualization) ── */}
        <motion.div
          className="mt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          <p className="mb-4 text-center font-mono text-[9px] uppercase tracking-[0.35em] text-white/30">
            Why the stars chose this
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <SignalBadge
              icon="🌐"
              label="Social signal"
              value={topRecommendation?.socialSignal || "Personality & interests detected"}
              delay={0.75}
            />
            <SignalBadge
              icon="◎"
              label="Wallet signal"
              value={topRecommendation?.walletSignal || "On-chain activity analyzed"}
              delay={0.85}
            />
            <SignalBadge
              icon="♡"
              label="Relationship signal"
              value={gift?.senderRelationship ? `Crafted for your ${gift.senderRelationship}'s bond` : "Relationship context applied"}
              delay={0.95}
            />
          </div>
        </motion.div>

        {/* ── EXPLORER LINK ── */}
        {gift?.explorerUrl && (
          <motion.div
            className="mt-6 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
          >
            <a
              href={gift.explorerUrl}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-xs text-[#38bdf8]/60 underline underline-offset-4 transition hover:text-[#38bdf8]"
            >
              View on Solana Explorer ↗
            </a>
          </motion.div>
        )}

        {/* ── ERROR ── */}
        {error && (
          <motion.p
            className="mt-4 text-center font-mono text-xs text-[#ff6b35]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {error}
          </motion.p>
        )}

        {/* ── PHASE 6: CLAIM ACTION ── */}
        <motion.div
          className="mt-10 flex flex-col items-center gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
        >
          {!isClaimed ? (
            <motion.button
              onClick={handleClaimGift}
              disabled={claiming}
              className="group relative w-full overflow-hidden rounded-full py-4 font-mono text-sm font-semibold uppercase tracking-widest text-[#0a0612] sm:w-auto sm:px-14"
              style={{
                background: claiming
                  ? "linear-gradient(135deg, #c084fc80, #38bdf880)"
                  : "linear-gradient(135deg, #ffd700, #c084fc 60%, #38bdf8)",
                boxShadow: claiming ? "none" : "0 0 30px rgba(255,215,0,0.3), 0 0 60px rgba(192,132,252,0.15)",
              }}
              whileHover={!claiming ? { scale: 1.03 } : {}}
              whileTap={!claiming ? { scale: 0.97 } : {}}
            >
              <AnimatePresence mode="wait">
                <motion.span
                  key={claiming ? "claiming" : "claim"}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="relative z-10 flex items-center gap-2"
                >
                  {claiming ? (
                    <>
                      <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>✦</motion.span>
                      Claiming from the cosmos…
                    </>
                  ) : (
                    <>✦ Claim Your Gift</>
                  )}
                </motion.span>
              </AnimatePresence>

              {/* Shimmer */}
              {!claiming && (
                <motion.div
                  className="absolute inset-0 bg-white/25"
                  initial={{ x: "-100%", skewX: -15 }}
                  whileHover={{ x: "200%" }}
                  transition={{ duration: 0.6 }}
                />
              )}
            </motion.button>
          ) : (
            <motion.div
              className="flex flex-col items-center gap-3"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", duration: 0.8 }}
            >
              {/* Celebration badge */}
              <div
                className="flex items-center gap-3 rounded-full px-8 py-4"
                style={{
                  background: "linear-gradient(135deg, rgba(255,215,0,0.12), rgba(192,132,252,0.12))",
                  border: "1px solid rgba(255,215,0,0.3)",
                }}
              >
                <motion.span
                  animate={{ rotate: [0, 15, -15, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
                  className="text-lg"
                >
                  ✦
                </motion.span>
                <span className="font-mono text-sm font-semibold tracking-widest text-[#ffd700]">
                  Gift Claimed
                </span>
                <motion.span
                  animate={{ rotate: [0, -15, 15, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 0.7 }}
                  className="text-lg"
                >
                  ✦
                </motion.span>
              </div>
              <p className="font-mono text-[10px] text-white/30">
                The cosmos delivered. This gift is yours.
              </p>
            </motion.div>
          )}

          {/* Phase 7: Celebration share prompt */}
          {isCelebration && (
            <motion.div
              className="text-center"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <p className="font-mono text-[10px] text-white/25">
                Built with GiftMind — AI-powered gifts on Solana ✦
              </p>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Bottom aurora */}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 h-40 opacity-15"
        style={{ background: "radial-gradient(ellipse 80% 60% at 50% 100%, #0ea5e9, transparent)" }}
      />
    </div>
  );
}