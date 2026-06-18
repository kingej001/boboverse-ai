import { Link } from "react-router-dom";
import WalletConnectButton from "./WalletConnectButton.jsx";

export default function Header() {
  return (
    <header className="relative z-10 flex items-center justify-between px-6 py-5 sm:px-10">
      <Link to="/" className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full bg-solstice shadow-glowSm" />
        <span className="font-display text-lg font-semibold tracking-tight text-starlight">
          Gift<span className="text-solstice">Mind</span>
        </span>
      </Link>
      <div className="flex items-center gap-4">
        <Link to="/send" className="hidden text-sm text-starlightDim transition hover:text-solstice sm:inline">
          Send Gift
        </Link>
        <Link to="/profile" className="hidden text-sm text-starlightDim transition hover:text-solstice sm:inline">
          Profile Builder
        </Link>
        <WalletConnectButton />
      </div>
    </header>
  );
}
