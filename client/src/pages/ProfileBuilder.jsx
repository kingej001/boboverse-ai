import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import ConstellationChart from "../components/ConstellationChart.jsx";
import { buildProfileFromDataset, getSavedProfiles, splitProfileList } from "../lib/ProfileContext.jsx";

const INITIAL_FORM = {
  walletAddress: "ZARA_DEMO_WALLET",
  displayName: "Zara",
  age: "22",
  interests: "generative art, fashion, indie music, travel, reading, emerging crypto culture",
  topContentTypes: "aesthetic/visual content, travel posts, book recommendations, DeFi explainer threads",
  tone: "curates an aesthetic feed; crypto-curious but not loudly crypto-native",
  favoriteCreators: "digital artists, indie designers",
  recentEngagement: "liked NFT collection launch, shared summer travel photos",
  solBalance: "1.42",
  transactionCount: "23",
  walletAgeDaysApprox: "243",
  nftHoldings: "DemoGenArt1, DemoGenArt2, DemoGenArt3, DemoGenArt4",
  fungibleTokenHoldings: "USDC",
};

function chartPointsFor(profile) {
  return [
    { label: `${profile.analysis?.activityScore || 0} activity` },
    { label: `${profile.analysis?.collectorScore || 0} collector` },
    { label: `${profile.analysis?.stabilityScore || 0} stable` },
    { label: profile.social.interests[0] || "interests" },
    { label: profile.solarPersona?.archetype || "persona" },
  ];
}

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

export default function ProfileBuilder() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [savedProfile, setSavedProfile] = useState(null);
  const [error, setError] = useState("");
  const [savedProfiles, setSavedProfiles] = useState(() => Object.values(getSavedProfiles()));

  const draftSummary = useMemo(
    () => ({
      interests: splitProfileList(form.interests),
      topContentTypes: splitProfileList(form.topContentTypes),
      favoriteCreators: splitProfileList(form.favoriteCreators),
      recentEngagement: splitProfileList(form.recentEngagement),
      nftHoldings: splitProfileList(form.nftHoldings),
      fungibleTokenHoldings: splitProfileList(form.fungibleTokenHoldings),
    }),
    [form]
  );

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function loadSampleDataset() {
    setForm(INITIAL_FORM);
    setError("");
  }

  function loadProfile(profile) {
    const socialSignals = profile.socialGraph?.socialSignals || {};
    setForm({
      walletAddress: profile.walletAddress,
      displayName: profile.social.displayName,
      age: String(profile.social.age || ""),
      interests: profile.social.interests.join(", "),
      topContentTypes: profile.social.topContentTypes.join(", "),
      tone: profile.social.tone || "",
      favoriteCreators: splitProfileList(socialSignals.favoriteCreators).join(", "),
      recentEngagement: splitProfileList(socialSignals.recentEngagement).join(", "),
      solBalance: String(profile.onChain.solBalance || 0),
      transactionCount: String(profile.onChain.transactionCount || 0),
      walletAgeDaysApprox: String(profile.onChain.walletAgeDaysApprox || 0),
      nftHoldings: profile.onChain.nftHoldings.map((item) => item.mint).join(", "),
      fungibleTokenHoldings: profile.onChain.fungibleTokenHoldings.map((item) => item.mint).join(", "),
    });
    setSavedProfile(profile);
    setError("");
  }

  function handleSubmit(e) {
    e.preventDefault();
    setError("");

    try {
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
      setSavedProfile(profile);
      setSavedProfiles(Object.values(getSavedProfiles()));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="relative mx-auto grid max-w-6xl gap-8 px-6 pb-24 pt-8 sm:px-10 lg:grid-cols-[minmax(0,1fr)_380px]">
      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-starlightDim">Recipient signal</p>
          <h1 className="mt-3 font-display text-2xl font-semibold text-starlight sm:text-3xl">
            Build a recipient profile
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-starlightDim">
            Combine recipient social signals and wallet activity into a Solar Persona.
            Use the same wallet on the send page to run the Zara Test.
          </p>
        </div>

        <section className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm text-starlightDim">Wallet address</span>
            <input
              value={form.walletAddress}
              onChange={(e) => updateField("walletAddress", e.target.value)}
              placeholder="e.g. MAYA_DEMO_WALLET"
              className="w-full rounded-xl border border-violet/40 bg-violetDeep/20 px-4 py-3 font-mono text-sm text-starlight placeholder:text-starlightDim/60 focus:border-solstice focus:outline-none"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-starlightDim">Display name</span>
            <input
              value={form.displayName}
              onChange={(e) => updateField("displayName", e.target.value)}
              placeholder="Zara"
              className="w-full rounded-xl border border-violet/40 bg-violetDeep/20 px-4 py-3 text-sm text-starlight placeholder:text-starlightDim/60 focus:border-solstice focus:outline-none"
            />
          </label>
        </section>

        <section className="grid gap-4 sm:grid-cols-[140px_minmax(0,1fr)]">
          <label className="block">
            <span className="mb-2 block text-sm text-starlightDim">Age</span>
            <input
              type="number"
              min="0"
              value={form.age}
              onChange={(e) => updateField("age", e.target.value)}
              placeholder="22"
              className="w-full rounded-xl border border-violet/40 bg-violetDeep/20 px-4 py-3 text-sm text-starlight placeholder:text-starlightDim/60 focus:border-solstice focus:outline-none"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-starlightDim">Tone</span>
            <input
              value={form.tone}
              onChange={(e) => updateField("tone", e.target.value)}
              placeholder="crypto-curious, aesthetic, quietly practical"
              className="w-full rounded-xl border border-violet/40 bg-violetDeep/20 px-4 py-3 text-sm text-starlight placeholder:text-starlightDim/60 focus:border-solstice focus:outline-none"
            />
          </label>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm text-starlightDim">Interests</span>
            <textarea
              value={form.interests}
              onChange={(e) => updateField("interests", e.target.value)}
              rows={3}
              placeholder="generative art, fashion, indie music"
              className="w-full rounded-xl border border-violet/40 bg-violetDeep/20 px-4 py-3 text-sm text-starlight placeholder:text-starlightDim/60 focus:border-solstice focus:outline-none"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-starlightDim">Top content types</span>
            <textarea
              value={form.topContentTypes}
              onChange={(e) => updateField("topContentTypes", e.target.value)}
              rows={3}
              placeholder="aesthetic posts, travel posts, DeFi explainers"
              className="w-full rounded-xl border border-violet/40 bg-violetDeep/20 px-4 py-3 text-sm text-starlight placeholder:text-starlightDim/60 focus:border-solstice focus:outline-none"
            />
          </label>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm text-starlightDim">Favorite creators</span>
            <textarea
              value={form.favoriteCreators}
              onChange={(e) => updateField("favoriteCreators", e.target.value)}
              rows={2}
              placeholder="digital artists, indie designers"
              className="w-full rounded-xl border border-violet/40 bg-violetDeep/20 px-4 py-3 text-sm text-starlight placeholder:text-starlightDim/60 focus:border-solstice focus:outline-none"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-starlightDim">Recent engagement</span>
            <textarea
              value={form.recentEngagement}
              onChange={(e) => updateField("recentEngagement", e.target.value)}
              rows={2}
              placeholder="liked NFT collection launch, shared summer travel photos"
              className="w-full rounded-xl border border-violet/40 bg-violetDeep/20 px-4 py-3 text-sm text-starlight placeholder:text-starlightDim/60 focus:border-solstice focus:outline-none"
            />
          </label>
        </section>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={loadSampleDataset}
            className="rounded-full border border-violet/50 px-3 py-1.5 text-xs text-starlightDim transition hover:border-solstice hover:text-solstice"
          >
            Reset to Zara Sample
          </button>
        </div>

        <section className="grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="mb-2 block text-sm text-starlightDim">SOL balance</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.solBalance}
              onChange={(e) => updateField("solBalance", e.target.value)}
              className="w-full rounded-xl border border-violet/40 bg-violetDeep/20 px-4 py-3 text-sm text-starlight focus:border-solstice focus:outline-none"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-starlightDim">Transactions</span>
            <input
              type="number"
              min="0"
              value={form.transactionCount}
              onChange={(e) => updateField("transactionCount", e.target.value)}
              className="w-full rounded-xl border border-violet/40 bg-violetDeep/20 px-4 py-3 text-sm text-starlight focus:border-solstice focus:outline-none"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-starlightDim">Wallet age days</span>
            <input
              type="number"
              min="0"
              value={form.walletAgeDaysApprox}
              onChange={(e) => updateField("walletAgeDaysApprox", e.target.value)}
              className="w-full rounded-xl border border-violet/40 bg-violetDeep/20 px-4 py-3 text-sm text-starlight focus:border-solstice focus:outline-none"
            />
          </label>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm text-starlightDim">NFT mints or collections</span>
            <textarea
              value={form.nftHoldings}
              onChange={(e) => updateField("nftHoldings", e.target.value)}
              rows={3}
              placeholder="Sketchbook #42, Neon Garden"
              className="w-full rounded-xl border border-violet/40 bg-violetDeep/20 px-4 py-3 text-sm text-starlight placeholder:text-starlightDim/60 focus:border-solstice focus:outline-none"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-starlightDim">Token holdings</span>
            <textarea
              value={form.fungibleTokenHoldings}
              onChange={(e) => updateField("fungibleTokenHoldings", e.target.value)}
              rows={3}
              placeholder="USDC, BONK"
              className="w-full rounded-xl border border-violet/40 bg-violetDeep/20 px-4 py-3 text-sm text-starlight placeholder:text-starlightDim/60 focus:border-solstice focus:outline-none"
            />
          </label>
        </section>

        {error && <p className="text-sm text-ember">{error}</p>}

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="submit"
            className="rounded-full bg-solstice-gradient px-7 py-3 font-display text-sm font-semibold text-spaceDeep shadow-glowSm transition hover:shadow-glow"
          >
            Analyze & Build Profile
          </button>
          <Link
            to="/send"
            className="rounded-full border border-violet/60 px-7 py-3 text-center font-display text-sm font-semibold text-starlight transition hover:border-solstice/60 hover:text-solstice"
          >
            Use in Send Flow
          </Link>
        </div>
      </motion.form>

      <aside className="space-y-6">
        <div className="rounded-xl border border-violet/30 bg-violetDeep/20 p-5">
          <h2 className="font-display text-lg font-semibold text-starlight">Live profile</h2>
          <div className="mt-4 grid gap-3 text-sm text-starlightDim">
            <p>
              <span className="text-solstice">Interests:</span> {draftSummary.interests.length || 0}
            </p>
            <p>
              <span className="text-solstice">Content signals:</span> {draftSummary.topContentTypes.length || 0}
            </p>
            <p>
              <span className="text-solstice">Creators:</span> {draftSummary.favoriteCreators.length || 0}
            </p>
            <p>
              <span className="text-solstice">Engagement:</span> {draftSummary.recentEngagement.length || 0}
            </p>
            <p>
              <span className="text-solstice">NFTs:</span> {draftSummary.nftHoldings.length || 0}
            </p>
            <p>
              <span className="text-solstice">Tokens:</span> {draftSummary.fungibleTokenHoldings.length || 0}
            </p>
          </div>
        </div>

        {savedProfile && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-solstice/40 bg-violetDeep/20 p-5"
          >
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-solstice">Saved</p>
            <h2 className="mt-2 font-display text-xl font-semibold text-starlight">{savedProfile.social.displayName}</h2>
            <p className="mt-1 text-sm text-solstice">{savedProfile.solarPersona?.archetype}</p>
            <p className="mt-1 break-all font-mono text-xs text-starlightDim">{savedProfile.walletAddress}</p>
            <ConstellationChart dataPoints={chartPointsFor(savedProfile)} centerLabel="Recipient profile" />
            <p className="mt-3 text-sm text-starlightDim">{savedProfile.solarPersona?.summary}</p>
          </motion.div>
        )}

        {savedProfiles.length > 0 && (
          <div className="rounded-xl border border-violet/30 bg-violetDeep/10 p-5">
            <h2 className="font-display text-lg font-semibold text-starlight">Saved profiles</h2>
            <div className="mt-4 space-y-2">
              {savedProfiles.map((profile) => (
                <button
                  key={profile.walletAddress}
                  type="button"
                  onClick={() => loadProfile(profile)}
                  className="w-full rounded-lg border border-violet/30 px-3 py-2 text-left transition hover:border-solstice/60"
                >
                  <span className="block text-sm text-starlight">{profile.social.displayName}</span>
                  <span className="block break-all font-mono text-xs text-starlightDim">{profile.walletAddress}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
