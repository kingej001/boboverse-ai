export const PROFILE_STORAGE_KEY = "giftmind.profiles.v1";

export function normalizeWalletAddress(walletAddress) {
  return walletAddress.trim();
}

export function splitProfileList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  return String(value || "")
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function parseSocialGraphDataset(rawDataset) {
  if (!String(rawDataset || "").trim()) {
    throw new Error("Social graph dataset is required.");
  }

  try {
    const parsed = JSON.parse(rawDataset);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Dataset must be a JSON object.");
    }
    return parsed;
  } catch (err) {
    if (err.message === "Dataset must be a JSON object.") throw err;
    throw new Error("Social graph dataset must be valid JSON.");
  }
}

function valueFromDataset(dataset, keys, fallback = "") {
  for (const key of keys) {
    if (dataset[key] !== undefined && dataset[key] !== null) return dataset[key];
  }
  return fallback;
}

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function analyzeWalletActivity(onChain) {
  const solBalance = Number(onChain.solBalance || 0);
  const transactionCount = Number(onChain.transactionCount || 0);
  const walletAgeDaysApprox = Number(onChain.walletAgeDaysApprox || 0);
  const nftCount = splitProfileList(onChain.nftHoldings).length;
  const tokenCount = splitProfileList(onChain.fungibleTokenHoldings).length;

  return {
    activityScore: clampScore(transactionCount * 2.4 + walletAgeDaysApprox * 0.12),
    collectorScore: clampScore(nftCount * 18 + tokenCount * 6),
    stabilityScore: clampScore(solBalance * 18 + walletAgeDaysApprox * 0.16),
    liquidityScore: clampScore(solBalance * 25 + tokenCount * 12),
  };
}

function buildSolarPersona({ social, onChain, analysis }) {
  const interests = splitProfileList(social.interests);
  const contentTypes = splitProfileList(social.topContentTypes);
  const tone = String(social.tone || "").toLowerCase();
  const hasAestheticSignals = /art|aesthetic|fashion|design|music|visual/.test(
    `${interests.join(" ")} ${contentTypes.join(" ")} ${tone}`
  );
  const hasPracticalSignals = /defi|finance|builder|tool|practical|invest|stable/.test(
    `${interests.join(" ")} ${contentTypes.join(" ")} ${tone}`
  );

  let archetype = "Solar Explorer";
  if (analysis.collectorScore >= 55 || hasAestheticSignals) archetype = "Aesthetic Collector";
  if (analysis.stabilityScore >= 65 || hasPracticalSignals) archetype = "Steady Builder";
  if (analysis.activityScore >= 75 && analysis.collectorScore >= 45) archetype = "On-Chain Curator";

  return {
    archetype,
    summary: `${social.displayName || "This recipient"} is a ${archetype.toLowerCase()} with signals across ${interests
      .slice(0, 3)
      .join(", ") || "emerging interests"}.`,
    solarSignals: [
      { label: "Activity", value: analysis.activityScore },
      { label: "Collecting", value: analysis.collectorScore },
      { label: "Stability", value: analysis.stabilityScore },
      { label: "Liquidity", value: analysis.liquidityScore },
    ],
  };
}

function readProfilesFromStorage() {
  if (typeof window === "undefined") return {};

  try {
    const rawProfiles = window.localStorage.getItem(PROFILE_STORAGE_KEY);
    return rawProfiles ? JSON.parse(rawProfiles) : {};
  } catch {
    return {};
  }
}

function writeProfilesToStorage(profiles) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profiles));
}

export function getSavedProfiles() {
  return readProfilesFromStorage();
}

export function getSavedProfile(walletAddress) {
  const normalizedWallet = normalizeWalletAddress(walletAddress);
  if (!normalizedWallet) return null;
  return readProfilesFromStorage()[normalizedWallet] || null;
}

export function saveProfile(profile) {
  const walletAddress = normalizeWalletAddress(profile.walletAddress || "");
  if (!walletAddress) {
    throw new Error("Wallet address is required.");
  }

  const profiles = readProfilesFromStorage();
  const analysis = profile.analysis || analyzeWalletActivity(profile.onChain || {});
  const savedProfile = {
    walletAddress,
    onChain: {
      solBalance: Number(profile.onChain?.solBalance || 0),
      transactionCount: Number(profile.onChain?.transactionCount || 0),
      walletAgeDaysApprox: Number(profile.onChain?.walletAgeDaysApprox || 0),
      nftHoldings: splitProfileList(profile.onChain?.nftHoldings).map((mint) => ({ mint, amount: "1" })),
      fungibleTokenHoldings: splitProfileList(profile.onChain?.fungibleTokenHoldings).map((mint) => ({
        mint,
        amount: "1",
      })),
      source: "Profile Builder",
    },
    social: {
      displayName: String(profile.social?.displayName || "").trim() || "Recipient",
      age: Number(profile.social?.age || 0),
      interests: splitProfileList(profile.social?.interests),
      topContentTypes: splitProfileList(profile.social?.topContentTypes),
      tone: String(profile.social?.tone || "").trim(),
    },
    socialGraph: profile.socialGraph || null,
    analysis,
    solarPersona: profile.solarPersona || buildSolarPersona({ social: profile.social || {}, onChain: profile.onChain || {}, analysis }),
    builtAt: new Date().toISOString(),
  };

  profiles[walletAddress] = savedProfile;
  writeProfilesToStorage(profiles);
  return savedProfile;
}

export function buildProfileFromDataset({ walletAddress, socialGraphDataset, onChain }) {
  const normalizedWallet = normalizeWalletAddress(walletAddress || "");
  if (!normalizedWallet) {
    throw new Error("Wallet address is required.");
  }

  const dataset = typeof socialGraphDataset === "string" ? parseSocialGraphDataset(socialGraphDataset) : socialGraphDataset;
  const social = {
    displayName: String(valueFromDataset(dataset, ["displayName", "name", "username"], "Recipient")).trim(),
    age: Number(valueFromDataset(dataset, ["age"], 0)),
    interests: splitProfileList(valueFromDataset(dataset, ["interests", "likes", "topics"], [])),
    topContentTypes: splitProfileList(valueFromDataset(dataset, ["topContentTypes", "contentTypes", "content"], [])),
    tone: String(valueFromDataset(dataset, ["tone", "personality", "bio"], "")).trim(),
  };
  const walletSignals = {
    solBalance: Number(onChain?.solBalance || 0),
    transactionCount: Number(onChain?.transactionCount || 0),
    walletAgeDaysApprox: Number(onChain?.walletAgeDaysApprox || 0),
    nftHoldings: splitProfileList(onChain?.nftHoldings),
    fungibleTokenHoldings: splitProfileList(onChain?.fungibleTokenHoldings),
  };
  const analysis = analyzeWalletActivity(walletSignals);

  return saveProfile({
    walletAddress: normalizedWallet,
    social,
    onChain: walletSignals,
    socialGraph: dataset,
    analysis,
    solarPersona: buildSolarPersona({ social, onChain: walletSignals, analysis }),
  });
}
