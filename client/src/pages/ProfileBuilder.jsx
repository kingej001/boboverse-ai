import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";

import { buildProfileFromDataset, getSavedProfiles, splitProfileList, } from "../lib/ProfileContext.jsx";
import ConstellationChart from "../components/ConstellationChart.jsx";


// ─── constants ────────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  walletAddress: "",
  displayName: "",
  age: "",
  interests: "",
  topContentTypes: "",
  tone: "",
  favoriteCreators: "",
  recentEngagement: "",
  solBalance: "",
  transactionCount: "",
  walletAgeDaysApprox: "",
  nftHoldings: "",
  fungibleTokenHoldings: "",
};

// Used only by the "Load Zara sample" shortcut — never the default state.
const SAMPLE_FORM = {
  walletAddress: "ZARA_DEMO_WALLET",
  displayName: "Zara",
  age: "22",
  interests:
    "generative art, fashion, indie music, travel, reading, emerging crypto culture",
  topContentTypes:
    "aesthetic/visual content, travel posts, book recommendations, DeFi explainer threads",
  tone: "curates an aesthetic feed; crypto-curious but not loudly crypto-native",
  favoriteCreators: "digital artists, indie designers",
  recentEngagement: "liked NFT collection launch, shared summer travel photos",
  solBalance: "1.42",
  transactionCount: "23",
  walletAgeDaysApprox: "243",
  nftHoldings: "DemoGenArt1, DemoGenArt2, DemoGenArt3, DemoGenArt4",
  fungibleTokenHoldings: "USDC",
};

// Tap-to-fill suggestions shown under each field — tapping inserts the
// value into the input instead of it being pre-filled from the start.
const SUGGESTIONS = {
  tone: [
    "aesthetic, crypto-curious but not loud about it",
    "quietly practical, value-driven",
    "high-energy, trend-chasing",
    "minimalist, design-obsessed",
  ],
  interests: [
    "generative art",
    "fashion",
    "indie music",
    "travel",
    "reading",
    "emerging crypto culture",
    "gaming",
    "film photography",
  ],
  topContentTypes: [
    "aesthetic/visual content",
    "travel posts",
    "book recommendations",
    "DeFi explainer threads",
    "music discovery",
    "meme culture",
  ],
  favoriteCreators: [
    "digital artists",
    "indie designers",
    "crypto educators",
    "photographers",
    "musicians",
  ],
  recentEngagement: [
    "liked NFT collection launch",
    "shared summer travel photos",
    "commented on art drop",
    "saved gift guide post",
  ],
  nftHoldings: [
    "DemoGenArt1",
    "DemoGenArt2",
    "DemoGenArt3",
    "Sketchbook #42",
    "Neon Garden",
  ],
  fungibleTokenHoldings: ["USDC", "SOL", "BONK", "JUP"],
};

const SIGNAL_CAPS = {
  interests: 10,
  topContentTypes: 8,
  favoriteCreators: 6,
  recentEngagement: 6,
  nftHoldings: 10,
  fungibleTokenHoldings: 6,
};

const STEPS = [
  { key: "identity", label: "Identity", icon: "✦" },
  { key: "social", label: "Constellation", icon: "✺" },
  { key: "onchain", label: "Orbit", icon: "◎" },
  { key: "synthesis", label: "Synthesis", icon: "☀" },
];

const SCAN_LINES = [
  "Scanning social graph…",
  "Mapping interests to star clusters…",
  "Analyzing wallet activity…",
  "Building constellation…",
  "Generating solar persona…",
  "Profile complete.",
];

// ─── helpers (unchanged business logic) ────────────────────────────────────────

function buildSocialGraphDataset(form) {
  return {
    displayName: form.displayName.trim(),
    age: Number(form.age || 0),
    interests: splitProfileList(form.interests),
    topContentTypes: splitProfileList(form.topContentTypes),
    tone: form.tone.trim(),
    socialSignals: {
      favoriteCreators: splitProfileList(form.favoriteCreators),
      recentEngagement: splitProfileList(form.recentEngagement),
    },
  };
}

function chartPointsFor(profile) {
  return [
    { label: `${profile.analysis?.activityScore || 0} activity` },
    { label: `${profile.analysis?.collectorScore || 0} collector` },
    { label: `${profile.analysis?.stabilityScore || 0} stable` },
    { label: profile.social.interests[0] || "interests" },
    { label: profile.solarPersona?.archetype || "persona" },
  ];
}

function loadFormFromProfile(profile) {
  const sig = profile.socialGraph?.socialSignals || {};
  return {
    walletAddress: profile.walletAddress,
    displayName: profile.social.displayName,
    age: String(profile.social.age || ""),
    interests: profile.social.interests.join(", "),
    topContentTypes: profile.social.topContentTypes.join(", "),
    tone: profile.social.tone || "",
    favoriteCreators: splitProfileList(sig.favoriteCreators).join(", "),
    recentEngagement: splitProfileList(sig.recentEngagement).join(", "),
    solBalance: String(profile.onChain.solBalance || 0),
    transactionCount: String(profile.onChain.transactionCount || 0),
    walletAgeDaysApprox: String(profile.onChain.walletAgeDaysApprox || 0),
    nftHoldings: profile.onChain.nftHoldings.map((i) => i.mint).join(", "),
    fungibleTokenHoldings: profile.onChain.fungibleTokenHoldings
      .map((i) => i.mint)
      .join(", "),
  };
}

function avatarHue(form) {
  // Deterministic hue derived from text input — purely cosmetic, no logic change.
  const seed = (form.displayName + form.walletAddress).split("").reduce(
    (acc, c) => acc + c.charCodeAt(0),
    0
  );
  return 250 + (seed % 80); // stays in violet → cyan → gold band
}

// ─── atoms ──────────────────────────────────────────────────────────────────

const inputCls =
  "w-full rounded-xl border border-violet/30 bg-violetDeep/20 px-4 py-2.5 text-sm text-starlight placeholder:text-starlightDim/50 focus:border-solstice focus:outline-none transition";

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-starlightDim">
          {label}
        </span>
        {hint && (
          <span className="font-mono text-[10px] text-starlightDim/50">
            {hint}
          </span>
        )}
      </span>
      {children}
    </label>
  );
}

function ChipPreview({ value, limit }) {
  const items = splitProfileList(value).slice(0, limit);
  if (!items.length) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      <AnimatePresence initial={false}>
        {items.map((tag, i) => (
          <motion.span
            key={tag + i}
            initial={{ opacity: 0, scale: 0.8, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.18, delay: i * 0.02 }}
            className="rounded-full border border-solstice/30 bg-solstice/5 px-2.5 py-0.5 font-mono text-[10px] text-solstice"
          >
            {tag}
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  );
}

function SuggestionChips({ field, value, onAdd }) {
  const options = SUGGESTIONS[field];
  if (!options) return null;
  const current = splitProfileList(value);
  const remaining = options.filter((o) => !current.includes(o));
  if (!remaining.length) return null;
  return (
    <div className="mt-2.5 flex flex-wrap gap-1.5">
      {remaining.map((option) => (
        <motion.button
          key={option}
          type="button"
          whileTap={{ scale: 0.94 }}
          onClick={() => onAdd(field, option)}
          className="rounded-full border border-violet/30 bg-violetDeep/10 px-3 py-1 font-mono text-[10px] text-starlightDim transition hover:border-solstice/60 hover:text-solstice"
        >
          + {option}
        </motion.button>
      ))}
    </div>
  );
}

// Starfield background, rendered once, purely decorative.
function Starfield() {
  const stars = useMemo(
    () =>
      Array.from({ length: 70 }, (_, i) => ({
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
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: s.size,
            height: s.size,
          }}
          animate={{ opacity: [0.15, 0.9, 0.15] }}
          transition={{
            duration: s.dur,
            delay: s.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

// Progress trail across the top — the journey's signature element.
function StepTrail({ stepIndex, onJump, maxReached }) {
  return (
    <div className="mx-auto mb-10 flex max-w-md items-center justify-between">
      {STEPS.map((s, i) => (
        <div key={s.key} className="flex flex-1 items-center last:flex-none">
          <button
            type="button"
            disabled={i > maxReached}
            onClick={() => onJump(i)}
            className="group relative flex flex-col items-center gap-2 disabled:cursor-not-allowed"
          >
            <motion.span
              animate={{
                scale: i === stepIndex ? 1.15 : 1,
                boxShadow:
                  i <= stepIndex
                    ? "0 0 14px rgba(255,184,77,0.55)"
                    : "0 0 0 rgba(0,0,0,0)",
              }}
              className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs transition-colors ${
                i <= stepIndex
                  ? "border-solstice bg-solstice/15 text-solstice"
                  : "border-violet/30 text-starlightDim/60"
              }`}
            >
              {s.icon}
            </motion.span>
            <span
              className={`whitespace-nowrap font-mono text-[9px] uppercase tracking-[0.16em] ${
                i === stepIndex ? "text-starlight" : "text-starlightDim/60"
              }`}
            >
              {s.label}
            </span>
          </button>
          {i < STEPS.length - 1 && (
            <div className="mx-2 h-px flex-1 bg-violet/20">
              <motion.div
                className="h-px bg-solstice"
                initial={false}
                animate={{ width: i < stepIndex ? "100%" : "0%" }}
                transition={{ duration: 0.35 }}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// Live avatar — an abstract star/orbit visualization built purely from current
// form values. No business logic, just a visual readout of signal density.
function LiveAvatar({ form, counts }) {
  const hue = avatarHue(form);
  const socialDensity =
    (counts.interests + counts.topContentTypes + counts.favoriteCreators) / 24;
  const chainDensity =
    (Number(form.solBalance || 0) / 10 +
      Number(form.transactionCount || 0) / 100 +
      counts.nftHoldings / 10) /
    3;
  const orbitRings = [
    { r: 58, speed: 14, opacity: 0.5 + Math.min(0.4, socialDensity) },
    { r: 78, speed: 22, opacity: 0.35 + Math.min(0.4, chainDensity) },
    { r: 98, speed: 30, opacity: 0.2 },
  ];

  return (
    <div className="relative mx-auto flex h-56 w-56 items-center justify-center">
      {orbitRings.map((ring, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border"
          style={{
            width: ring.r * 2,
            height: ring.r * 2,
            borderColor: `hsla(${hue}, 80%, 70%, ${ring.opacity * 0.35})`,
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: ring.speed, repeat: Infinity, ease: "linear" }}
        >
          <span
            className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              left: "50%",
              top: 0,
              background: `hsla(${hue}, 90%, 70%, ${ring.opacity})`,
              boxShadow: `0 0 8px hsla(${hue}, 90%, 70%, ${ring.opacity})`,
            }}
          />
        </motion.div>
      ))}
      <motion.div
        animate={{
          boxShadow: [
            `0 0 30px hsla(${hue}, 90%, 65%, 0.5)`,
            `0 0 50px hsla(${hue}, 90%, 65%, 0.8)`,
            `0 0 30px hsla(${hue}, 90%, 65%, 0.5)`,
          ],
        }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="flex h-20 w-20 items-center justify-center rounded-full font-display text-xl font-semibold text-spaceDeep"
        style={{
          background: `radial-gradient(circle at 35% 30%, hsla(${hue},95%,85%,1), hsla(${hue},85%,60%,1))`,
        }}
      >
        {(form.displayName || "?").trim().charAt(0).toUpperCase() || "?"}
      </motion.div>
    </div>
  );
}

// ─── step bodies ────────────────────────────────────────────────────────────

function IdentityStep({ form, updateField, onAdd }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <Field label="Wallet address">
        <input
          value={form.walletAddress}
          onChange={(e) => updateField("walletAddress", e.target.value)}
          placeholder="e.g. MAYA_DEMO_WALLET"
          className={`${inputCls} font-mono`}
        />
      </Field>
      <Field label="Display name">
        <input
          value={form.displayName}
          onChange={(e) => updateField("displayName", e.target.value)}
          placeholder="Zara"
          className={inputCls}
        />
      </Field>
      <Field label="Age">
        <input
          type="number"
          min="0"
          value={form.age}
          onChange={(e) => updateField("age", e.target.value)}
          className={inputCls}
        />
      </Field>
      <Field label="Tone / vibe">
        <input
          value={form.tone}
          onChange={(e) => updateField("tone", e.target.value)}
          placeholder="crypto-curious, aesthetic, quietly practical"
          className={inputCls}
        />
        <SuggestionChips
          field="tone"
          value={form.tone}
          onAdd={(field, option) => updateField(field, option)}
        />
      </Field>
    </div>
  );
}

function SocialStep({ form, updateField, counts, onAdd }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <Field label="Interests" hint={`${counts.interests}/${SIGNAL_CAPS.interests}`}>
        <textarea
          value={form.interests}
          onChange={(e) => updateField("interests", e.target.value)}
          rows={3}
          placeholder="generative art, fashion, indie music"
          className={inputCls}
        />
        <ChipPreview value={form.interests} limit={SIGNAL_CAPS.interests} />
        <SuggestionChips field="interests" value={form.interests} onAdd={onAdd} />
      </Field>
      <Field
        label="Top content types"
        hint={`${counts.topContentTypes}/${SIGNAL_CAPS.topContentTypes}`}
      >
        <textarea
          value={form.topContentTypes}
          onChange={(e) => updateField("topContentTypes", e.target.value)}
          rows={3}
          placeholder="aesthetic posts, travel posts, DeFi explainers"
          className={inputCls}
        />
        <ChipPreview value={form.topContentTypes} limit={SIGNAL_CAPS.topContentTypes} />
        <SuggestionChips field="topContentTypes" value={form.topContentTypes} onAdd={onAdd} />
      </Field>
      <Field
        label="Favorite creators"
        hint={`${counts.favoriteCreators}/${SIGNAL_CAPS.favoriteCreators}`}
      >
        <textarea
          value={form.favoriteCreators}
          onChange={(e) => updateField("favoriteCreators", e.target.value)}
          rows={2}
          placeholder="digital artists, indie designers"
          className={inputCls}
        />
        <ChipPreview value={form.favoriteCreators} limit={SIGNAL_CAPS.favoriteCreators} />
        <SuggestionChips field="favoriteCreators" value={form.favoriteCreators} onAdd={onAdd} />
      </Field>
      <Field
        label="Recent engagement"
        hint={`${counts.recentEngagement}/${SIGNAL_CAPS.recentEngagement}`}
      >
        <textarea
          value={form.recentEngagement}
          onChange={(e) => updateField("recentEngagement", e.target.value)}
          rows={2}
          placeholder="liked NFT collection launch, shared travel photos"
          className={inputCls}
        />
        <ChipPreview value={form.recentEngagement} limit={SIGNAL_CAPS.recentEngagement} />
        <SuggestionChips field="recentEngagement" value={form.recentEngagement} onAdd={onAdd} />
      </Field>
    </div>
  );
}

function OnChainStep({ form, updateField, counts, onAdd }) {
  return (
    <div className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="SOL balance">
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.solBalance}
            onChange={(e) => updateField("solBalance", e.target.value)}
            className={`${inputCls} font-mono`}
          />
        </Field>
        <Field label="Transactions">
          <input
            type="number"
            min="0"
            value={form.transactionCount}
            onChange={(e) => updateField("transactionCount", e.target.value)}
            className={`${inputCls} font-mono`}
          />
        </Field>
        <Field label="Wallet age (days)">
          <input
            type="number"
            min="0"
            value={form.walletAgeDaysApprox}
            onChange={(e) => updateField("walletAgeDaysApprox", e.target.value)}
            className={`${inputCls} font-mono`}
          />
        </Field>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="NFT mints / collections" hint={`${counts.nftHoldings}/${SIGNAL_CAPS.nftHoldings}`}>
          <textarea
            value={form.nftHoldings}
            onChange={(e) => updateField("nftHoldings", e.target.value)}
            rows={3}
            placeholder="Sketchbook #42, Neon Garden"
            className={inputCls}
          />
          <ChipPreview value={form.nftHoldings} limit={SIGNAL_CAPS.nftHoldings} />
          <SuggestionChips field="nftHoldings" value={form.nftHoldings} onAdd={onAdd} />
        </Field>
        <Field
          label="Token holdings"
          hint={`${counts.fungibleTokenHoldings}/${SIGNAL_CAPS.fungibleTokenHoldings}`}
        >
          <textarea
            value={form.fungibleTokenHoldings}
            onChange={(e) => updateField("fungibleTokenHoldings", e.target.value)}
            rows={3}
            placeholder="USDC, BONK"
            className={inputCls}
          />
          <ChipPreview value={form.fungibleTokenHoldings} limit={SIGNAL_CAPS.fungibleTokenHoldings} />
          <SuggestionChips field="fungibleTokenHoldings" value={form.fungibleTokenHoldings} onAdd={onAdd} />
        </Field>
      </div>
    </div>
  );
}

// Scanning sequence shown while "building" — purely presentational delay
// before calling the existing synchronous builder.
function ScanSequence({ onDone }) {
  const [lineIndex, setLineIndex] = useState(0);
  const timer = useRef(null);

  useEffect(() => {
    if (lineIndex >= SCAN_LINES.length) {
      timer.current = setTimeout(onDone, 450);
      return () => clearTimeout(timer.current);
    }
    timer.current = setTimeout(() => setLineIndex((i) => i + 1), 480);
    return () => clearTimeout(timer.current);
  }, [lineIndex, onDone]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-6 py-16">
      <motion.div
        className="h-24 w-24 rounded-full border-2 border-solstice/40 border-t-solstice"
        animate={{ rotate: 360 }}
        transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }}
      />
      <div className="w-full space-y-2 font-mono text-xs">
        {SCAN_LINES.map((line, i) => (
          <motion.div
            key={line}
            initial={{ opacity: 0, x: -8 }}
            animate={{
              opacity: i <= lineIndex ? 1 : 0.15,
              x: 0,
            }}
            transition={{ duration: 0.3 }}
            className={`flex items-center gap-2 ${
              i <= lineIndex ? "text-starlight" : "text-starlightDim"
            }`}
          >
            <span className="text-solstice">
              {i < lineIndex ? "✓" : i === lineIndex ? "›" : "·"}
            </span>
            {line}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function ScoreDial({ label, value }) {
  const pct = Math.max(0, Math.min(100, value || 0));
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative h-20 w-20">
        <svg viewBox="0 0 80 80" className="h-20 w-20 -rotate-90">
          <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(124,92,255,0.2)" strokeWidth="6" />
          <motion.circle
            cx="40"
            cy="40"
            r="34"
            fill="none"
            stroke="url(#dialGradient)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 34}
            initial={{ strokeDashoffset: 2 * Math.PI * 34 }}
            animate={{ strokeDashoffset: 2 * Math.PI * 34 * (1 - pct / 100) }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
          <defs>
            <linearGradient id="dialGradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#FFB84D" />
              <stop offset="100%" stopColor="#7C5CFF" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex items-center justify-center font-display text-sm font-semibold text-starlight">
          {pct}
        </div>
      </div>
      <span className="text-center font-mono text-[10px] uppercase tracking-[0.14em] text-starlightDim">
        {label}
      </span>
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

export default function ProfileBuilder() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [savedProfile, setSavedProfile] = useState(null);
  const [error, setError] = useState("");
  const [savedProfiles, setSavedProfiles] = useState(() =>
    Object.values(getSavedProfiles())
  );
  const [stepIndex, setStepIndex] = useState(0);
  const [maxReached, setMaxReached] = useState(0);
  const [scanning, setScanning] = useState(false);

  const updateField = useCallback((field, value) => {
    setForm((cur) => ({ ...cur, [field]: value }));
  }, []);

  // Tap-to-fill: appends a suggestion into a comma-list field.
  const addToField = useCallback((field, option) => {
    setForm((cur) => {
      const current = splitProfileList(cur[field]);
      if (current.includes(option)) return cur;
      const next = [...current, option].join(", ");
      return { ...cur, [field]: next };
    });
  }, []);

  const counts = useMemo(
    () => ({
      interests: splitProfileList(form.interests).length,
      topContentTypes: splitProfileList(form.topContentTypes).length,
      favoriteCreators: splitProfileList(form.favoriteCreators).length,
      recentEngagement: splitProfileList(form.recentEngagement).length,
      nftHoldings: splitProfileList(form.nftHoldings).length,
      fungibleTokenHoldings: splitProfileList(form.fungibleTokenHoldings).length,
    }),
    [form]
  );

  const universeScore = useMemo(() => {
    if (!savedProfile?.analysis) return null;
    const { activityScore = 0, collectorScore = 0, stabilityScore = 0 } =
      savedProfile.analysis;
    return Math.round((activityScore + collectorScore + stabilityScore) / 3);
  }, [savedProfile]);

  function goTo(i) {
    if (i > maxReached) return;
    setStepIndex(i);
  }

  function nextStep() {
    const next = Math.min(stepIndex + 1, STEPS.length - 1);
    setStepIndex(next);
    setMaxReached((m) => Math.max(m, next));
  }

  function prevStep() {
    setStepIndex((i) => Math.max(0, i - 1));
  }

  function runSynthesis() {
    setError("");
    try {
      // Validate eagerly so scan animation only plays on a valid profile.
      const profile = buildProfileFromDataset({
        walletAddress: form.walletAddress,
        socialGraphDataset: buildSocialGraphDataset(form),
        onChain: {
          solBalance: form.solBalance,
          transactionCount: form.transactionCount,
          walletAgeDaysApprox: form.walletAgeDaysApprox,
          nftHoldings: form.nftHoldings,
          fungibleTokenHoldings: form.fungibleTokenHoldings,
        },
      });
      setScanning(true);
      // Stash the result; ScanSequence reveals it on completion.
      runSynthesis._pending = profile;
    } catch (err) {
      setError(err.message);
    }
  }

  function handleScanDone() {
    const profile = runSynthesis._pending;
    setScanning(false);
    if (profile) {
      setSavedProfile(profile);
      setSavedProfiles(Object.values(getSavedProfiles()));
    }
  }

  function resetAll() {
    setForm(EMPTY_FORM);
    setError("");
    setSavedProfile(null);
    setStepIndex(0);
    setMaxReached(0);
  }

  function loadSample() {
    setForm(SAMPLE_FORM);
    setError("");
  }

  function loadProfile(profile) {
    setForm(loadFormFromProfile(profile));
    setSavedProfile(profile);
    setError("");
    setStepIndex(3);
    setMaxReached(3);
  }

  return (
    <>
      <Starfield />
      <div className="mx-auto min-h-screen max-w-5xl px-6 pb-24 pt-12 sm:px-10">
        {/* hero intro */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10 text-center"
        >
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.3em] text-solstice">
            GiftMind · Cosmic Intelligence
          </p>
          <h1 className="font-display text-3xl font-semibold text-starlight sm:text-4xl">
            Chart someone's digital universe
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-starlightDim">
            Combine social signals and on-chain wallet data. GiftMind synthesizes
            it all into a Solar Persona that powers personalized gift
            recommendations.
          </p>
        </motion.div>

        <StepTrail stepIndex={stepIndex} onJump={goTo} maxReached={maxReached} />

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
          {/* ── left: step content ── */}
          <div className="rounded-2xl border border-violet/20 bg-violetDeep/10 p-6 backdrop-blur-sm sm:p-8">
            <AnimatePresence mode="wait">
              {scanning ? (
                <motion.div
                  key="scan"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <ScanSequence onDone={handleScanDone} />
                </motion.div>
              ) : stepIndex === 3 && savedProfile ? (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.35 }}
                >
                  <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.2em] text-solstice">
                    Solar persona synthesized
                  </p>
                  <h2 className="font-display text-3xl font-semibold text-starlight">
                    {savedProfile.social.displayName}
                  </h2>
                  <p className="mt-1 text-base text-solstice">
                    {savedProfile.solarPersona?.archetype}
                  </p>
                  <p className="mt-4 max-w-xl text-sm leading-relaxed text-starlightDim">
                    {savedProfile.solarPersona?.summary}
                  </p>

                  <div className="mt-8 flex flex-wrap items-center gap-8">
                    <ScoreDial label="Wallet intelligence" value={savedProfile.analysis?.stabilityScore} />
                    <ScoreDial label="Social affinity" value={savedProfile.analysis?.activityScore} />
                    <ScoreDial label="NFT collector" value={savedProfile.analysis?.collectorScore} />
                    {universeScore !== null && (
                      <div className="flex flex-col items-center gap-2">
                        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-solstice-gradient font-display text-lg font-bold text-spaceDeep shadow-glow">
                          {universeScore}
                        </div>
                        <span className="text-center font-mono text-[10px] uppercase tracking-[0.14em] text-starlightDim">
                          Universe score
                        </span>
                      </div>
                    )}
                  </div>

                  <ConstellationChart
                    dataPoints={chartPointsFor(savedProfile)}
                    centerLabel="Recipient profile"
                  />

                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {savedProfile.social.interests.slice(0, 6).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-violet/30 px-2.5 py-0.5 font-mono text-[10px] text-starlightDim"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="mt-8 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={resetAll}
                      className="rounded-full border border-violet/50 px-5 py-2.5 text-sm text-starlightDim transition hover:border-solstice hover:text-solstice"
                    >
                      Build another profile
                    </button>
                    <Link
                      to="/send"
                      className="rounded-full bg-solstice-gradient px-6 py-2.5 font-display text-sm font-semibold text-spaceDeep shadow-glowSm transition hover:shadow-glow"
                    >
                      Use in send flow →
                    </Link>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key={STEPS[stepIndex].key}
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.25 }}
                >
                  <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.2em] text-solstice">
                    Step {stepIndex + 1} of {STEPS.length}
                  </p>
                  <h2 className="mb-6 font-display text-xl font-semibold text-starlight">
                    {STEPS[stepIndex].label}
                  </h2>

                  {stepIndex === 0 && (
                    <IdentityStep form={form} updateField={updateField} onAdd={addToField} />
                  )}
                  {stepIndex === 1 && (
                    <SocialStep form={form} updateField={updateField} counts={counts} onAdd={addToField} />
                  )}
                  {stepIndex === 2 && (
                    <OnChainStep form={form} updateField={updateField} counts={counts} onAdd={addToField} />
                  )}
                  {stepIndex === 3 && !savedProfile && (
                    <div className="py-6 text-center text-sm text-starlightDim">
                      All signals captured. Ready to synthesize the Solar Persona.
                    </div>
                  )}

                  {error && (
                    <p className="mt-5 rounded-lg border border-ember/30 bg-ember/10 px-4 py-2.5 text-sm text-ember">
                      {error}
                    </p>
                  )}

                  <div className="mt-8 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={prevStep}
                      disabled={stepIndex === 0}
                      className="rounded-full border border-violet/40 px-5 py-2.5 text-sm text-starlightDim transition hover:border-solstice hover:text-solstice disabled:opacity-30"
                    >
                      ← Back
                    </button>

                    {stepIndex < 3 ? (
                      <button
                        type="button"
                        onClick={nextStep}
                        className="rounded-full bg-solstice-gradient px-7 py-2.5 font-display text-sm font-semibold text-spaceDeep shadow-glowSm transition hover:shadow-glow"
                      >
                        Continue →
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={runSynthesis}
                        className="rounded-full bg-solstice-gradient px-7 py-2.5 font-display text-sm font-semibold text-spaceDeep shadow-glowSm transition hover:shadow-glow"
                      >
                        Build Recipient Profile ✦
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={loadSample}
                    className="mt-4 block font-mono text-[10px] uppercase tracking-[0.16em] text-starlightDim/60 transition hover:text-solstice"
                  >
                    Load Zara sample
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── right: live avatar + saved profiles ── */}
          <aside className="space-y-5">
            <div className="rounded-2xl border border-violet/20 bg-violetDeep/10 p-5 text-center backdrop-blur-sm">
              <h3 className="mb-2 font-display text-sm font-semibold text-starlight">
                Live recipient signal
              </h3>
              <LiveAvatar form={form} counts={counts} />
              <p className="mt-2 truncate font-mono text-xs text-starlightDim">
                {form.displayName || "Unnamed"}
              </p>
              <p className="truncate break-all font-mono text-[10px] text-starlightDim/60">
                {form.walletAddress}
              </p>
            </div>

            {savedProfiles.length > 0 && (
              <div className="rounded-2xl border border-violet/20 bg-violetDeep/5 p-5 backdrop-blur-sm">
                <h3 className="mb-3 font-display text-sm font-semibold text-starlight">
                  Saved profiles
                </h3>
                <div className="space-y-2">
                  {savedProfiles.map((profile) => (
                    <button
                      key={profile.walletAddress}
                      type="button"
                      onClick={() => loadProfile(profile)}
                      className="w-full rounded-lg border border-violet/30 px-3 py-2.5 text-left transition hover:border-solstice/60"
                    >
                      <span className="block text-sm font-medium text-starlight">
                        {profile.social.displayName}
                      </span>
                      {profile.solarPersona?.archetype && (
                        <span className="block text-xs text-solstice">
                          {profile.solarPersona.archetype}
                        </span>
                      )}
                      <span className="block break-all font-mono text-[10px] text-starlightDim">
                        {profile.walletAddress}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </>
  );
}