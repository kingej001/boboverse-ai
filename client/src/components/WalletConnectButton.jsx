import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";

function truncateAddress(address) {
  if (!address) return "";
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}

export default function WalletConnectButton() {
  const { publicKey, disconnect, connecting } = useWallet();
  const { setVisible } = useWalletModal();

  if (publicKey) {
    return (
      <button
        onClick={disconnect}
        className="flex items-center gap-2 rounded-full border border-violet/60 bg-violetDeep/40 px-4 py-2 font-mono text-sm text-starlight transition hover:border-solstice/60 hover:text-solstice"
      >
        <span className="h-2 w-2 rounded-full bg-solstice" />
        {truncateAddress(publicKey.toBase58())}
      </button>
    );
  }

  return (
    <button
      onClick={() => setVisible(true)}
      disabled={connecting}
      className="rounded-full bg-solstice-gradient px-5 py-2 font-display text-sm font-semibold text-spaceDeep shadow-glowSm transition hover:shadow-glow disabled:opacity-60"
    >
      {connecting ? "Connecting…" : "Connect Wallet"}
    </button>
  );
}
