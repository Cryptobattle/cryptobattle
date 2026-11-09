import bnb from "cryptocurrency-icons/svg/color/bnb.svg";
import btc from "cryptocurrency-icons/svg/color/btc.svg";
import doge from "cryptocurrency-icons/svg/color/doge.svg";
import eth from "cryptocurrency-icons/svg/color/eth.svg";
import sol from "cryptocurrency-icons/svg/color/sol.svg";
import xrp from "cryptocurrency-icons/svg/color/xrp.svg";
import ada from "cryptocurrency-icons/svg/color/ada.svg";
import avax from "cryptocurrency-icons/svg/color/avax.svg";
import link from "cryptocurrency-icons/svg/color/link.svg";
import ltc from "cryptocurrency-icons/svg/color/ltc.svg";

const icons: Record<string, string> = {
  BNB: bnb,
  BTC: btc,
  DOGE: doge,
  ETH: eth,
  SOL: sol,
  XRP: xrp,
  ADA: ada,
  AVAX: avax,
  LINK: link,
  LTC: ltc,
};

export function CoinIcon({ symbol = "?", size = 44 }: { symbol: string; size?: number }) {
  if (!icons[symbol]) {
    return <span className="coin-icon coin-fallback" style={{ width: size, height: size }} aria-label={`${symbol} logo`}>{symbol.slice(0, 1)}</span>;
  }
  return <img className="coin-icon" src={icons[symbol]} width={size} height={size} alt={`${symbol} logo`} />;
}
