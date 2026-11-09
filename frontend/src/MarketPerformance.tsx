import { useEffect, useState } from "react";
import { AlertTriangle, ChevronDown, LoaderCircle, RefreshCw, TrendingDown, TrendingUp } from "lucide-react";
import { CoinIcon } from "./CoinIcon";
import { frontendConfig } from "./config";

const DURATIONS = [
  ["1 min", 60], ["10 min", 600], ["1 hour", 3600],
  ["1 day", 86400], ["1 week", 604800], ["30 days", 2592000],
] as const;
const API_URL = (frontendConfig.VITE_MARKET_API_URL || "").replace(/\/$/, "");

type AssetResult = { symbol: string; open: number; close: number; performance: number };
type Period = { start: number; end: number; assetA: AssetResult; assetB: AssetResult; winner: string | null };
type Response = {
  periods: Period[];
  nextCursor: number | null;
  hasMore: boolean;
  source?: string;
  cachedAt?: number;
  error?: string;
};

function price(value: number) {
  if (value >= 1000) return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (value >= 1) return value.toLocaleString("en-US", { maximumFractionDigits: 4 });
  return value.toLocaleString("en-US", { maximumSignificantDigits: 6 });
}

function percent(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function periodLabel(start: number, end: number) {
  const format = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC",
  });
  return `${format.format(new Date(start))} - ${format.format(new Date(end))} UTC`;
}

export function MarketPerformance({ assets }: { assets: string[] }) {
  const [assetA, setAssetA] = useState("BTC");
  const [assetB, setAssetB] = useState("ETH");
  const [duration, setDuration] = useState(3600);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [source, setSource] = useState("Off-chain spot market data");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (assets.length < 2) return;
    if (!assets.includes(assetA) || !assets.includes(assetB)) {
      setAssetA(assets[0]);
      setAssetB(assets[1]);
    }
  }, [assets]);

  async function load(reset: boolean, signal?: AbortSignal) {
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams({ assetA, assetB, duration: String(duration), limit: "12" });
      if (!reset && cursor) query.set("before", String(cursor));
      const response = await fetch(`${API_URL}/api/performance?${query}`, { signal });
      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) throw new Error("Market data service is temporarily unavailable");
      const body = await response.json() as Response;
      if (!response.ok) throw new Error(body.error || "Market data request failed");
      setPeriods((current) => reset ? body.periods : [...current, ...body.periods]);
      setCursor(body.nextCursor);
      setHasMore(body.hasMore);
      setSource(body.source || "Off-chain spot market data");
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === "AbortError") return;
      setError(caught instanceof Error ? caught.message : "Market data is temporarily unavailable");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    setPeriods([]); setCursor(null); setHasMore(false);
    void load(true, controller.signal);
    return () => controller.abort();
  }, [assetA, assetB, duration]);

  function selectAsset(position: "a" | "b", value: string) {
    if (position === "a") {
      if (value === assetB) setAssetB(assetA);
      setAssetA(value);
    } else {
      if (value === assetA) setAssetA(assetB);
      setAssetB(value);
    }
  }

  return <section className="market-view">
    <div className="market-title">
      <div><p className="eyebrow">MARKET HISTORY</p><h1>Pair performance.</h1></div>
      <span>Last 6 weeks</span>
    </div>

    <div className="market-filters">
      <div><label>ASSET A</label><div className="market-select"><select value={assetA} onChange={(event) => selectAsset("a", event.target.value)}>{assets.map((asset) => <option value={asset} key={asset}>{asset}</option>)}</select><ChevronDown size={16}/></div></div>
      <div><label>ASSET B</label><div className="market-select"><select value={assetB} onChange={(event) => selectAsset("b", event.target.value)}>{assets.map((asset) => <option value={asset} key={asset}>{asset}</option>)}</select><ChevronDown size={16}/></div></div>
      <div className="market-duration"><label>PERIOD</label><div className="segments">{DURATIONS.map(([label, seconds]) => <button className={duration === seconds ? "active" : ""} onClick={() => setDuration(seconds)} key={seconds}>{label}</button>)}</div></div>
    </div>

    <div className="data-disclaimer"><AlertTriangle size={16}/><span>Indicative display data only. Settlement uses the round's immutable 2-of-3 reporter or Pyth policy; sources, prices and boundaries can differ from this view.</span></div>

    <div className="performance-head"><span>Completed period</span><span>{assetA}</span><span>{assetB}</span><span>Leader</span></div>
    <div className="performance-list">
      {periods.map((period) => <article className="performance-row" key={`${period.start}-${period.end}`}>
        <div className="period-cell"><strong>{periodLabel(period.start, period.end)}</strong><span>{source}</span></div>
        {[period.assetA, period.assetB].map((asset) => <div className={`asset-performance ${period.winner === asset.symbol ? "winner" : ""}`} key={asset.symbol}>
          <div className={asset.performance >= 0 ? "positive" : "negative"}>{asset.performance >= 0 ? <TrendingUp size={15}/> : <TrendingDown size={15}/>}<strong>{percent(asset.performance)}</strong></div>
          <span>${price(asset.open)} to ${price(asset.close)}</span>
        </div>)}
        <div className="leader-cell">{period.winner ? <><span className="leader-mark"><CoinIcon symbol={period.winner} size={28}/></span><strong>{period.winner}</strong></> : <strong>Draw</strong>}</div>
      </article>)}
      {!loading && periods.length === 0 && !error && <div className="market-empty">No completed periods are available for this selection.</div>}
      {error && <div className="notice error"><AlertTriangle size={15}/>{error}</div>}
    </div>

    <div className="market-actions">
      {hasMore && <button className="secondary load-more" disabled={loading} onClick={() => void load(false)}>{loading ? <LoaderCircle className="spin" size={17}/> : <RefreshCw size={17}/>}Load earlier periods</button>}
      {loading && periods.length === 0 && <span className="market-loading"><LoaderCircle className="spin" size={18}/>Loading performance history...</span>}
    </div>
  </section>;
}
