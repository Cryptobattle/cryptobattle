import { useEffect, useMemo, useState } from "react";
import { ArrowDownUp, Check, ChevronDown, Copy, ExternalLink, LoaderCircle, RefreshCw, Settings2, Wallet } from "lucide-react";
import { formatUnits, getAddress, isAddress, type Address } from "viem";
import { swapDistributorAbi } from "./contracts";

type Coin = {
  coin: string;
  name: string;
  networks: string[];
  depositOffline: boolean | string[];
  settleOffline: boolean | string[];
};
type Shift = {
  id: string;
  depositAddress: string;
  depositMemo?: string;
  depositMin: string;
  depositMax: string;
  expiresAt: string;
  status: string;
};
type WalletClientLike = {
  writeContract: (args: { address: Address; abi: typeof swapDistributorAbi; functionName: "claim" }) => Promise<`0x${string}`>;
};

function available(offline: boolean | string[], network: string) {
  return offline !== true && (!Array.isArray(offline) || !offline.includes(network));
}

export function Swapper({
  account, connectWallet, readClaimable, readDistributorToken, waitForReceipt, apiUrl, operatorId,
  operatorAddress, distributorAddress, expectedUsdcAddress, explorerUrl,
}: {
  account?: Address;
  connectWallet: () => Promise<WalletClientLike>;
  readClaimable: (account: Address) => Promise<bigint>;
  readDistributorToken: () => Promise<Address>;
  waitForReceipt: (hash: `0x${string}`) => Promise<unknown>;
  apiUrl: string;
  operatorId: string;
  operatorAddress: Address;
  distributorAddress: Address;
  expectedUsdcAddress: Address;
  explorerUrl: string;
}) {
  const [coins, setCoins] = useState<Coin[]>([]);
  const [depositCoin, setDepositCoin] = useState("BTC");
  const [depositNetwork, setDepositNetwork] = useState("bitcoin");
  const [settleCoin, setSettleCoin] = useState("USDC");
  const [settleNetwork, setSettleNetwork] = useState("base");
  const [settleAddress, setSettleAddress] = useState("");
  const [refundAddress, setRefundAddress] = useState("");
  const [pair, setPair] = useState<{ min?: string; max?: string; rate?: string }>({});
  const [shift, setShift] = useState<Shift>();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [swapClaimable, setSwapClaimable] = useState(0n);
  const [distributorVerified, setDistributorVerified] = useState(false);
  const [operatorStats, setOperatorStats] = useState<{ settled_shifts?: number; pending_shifts?: number }>();
  const [operatorRegistered, setOperatorRegistered] = useState(false);
  const [telegramCode, setTelegramCode] = useState("");

  const fromCoin = useMemo(() => coins.find((coin) => coin.coin === depositCoin), [coins, depositCoin]);
  const toCoin = useMemo(() => coins.find((coin) => coin.coin === settleCoin), [coins, settleCoin]);
  const operatorConnected = Boolean(account && isAddress(operatorAddress) && getAddress(account) === getAddress(operatorAddress));
  const distributorConfigured = isAddress(distributorAddress) && BigInt(distributorAddress) !== 0n;
  const effectiveOperatorId = operatorId || (isAddress(operatorAddress) ? `op_${operatorAddress.slice(2).toLowerCase()}` : "");

  useEffect(() => {
    if (!apiUrl) { setMessage("Swapper gateway is not configured."); return; }
    void fetch(`${apiUrl}/api/coins`).then(async (response) => {
      const body = await response.json();
      if (!response.ok || !Array.isArray(body)) throw new Error(body.error || "Could not load SideShift assets");
      setCoins(body);
      const usdc = body.find((coin: Coin) => coin.coin === "USDC");
      if (usdc) {
        setSettleCoin("USDC");
        setSettleNetwork(usdc.networks.includes("base") && available(usdc.settleOffline, "base")
          ? "base"
          : usdc.networks.find((network: string) => available(usdc.settleOffline, network)) || usdc.networks[0]);
      }
    }).catch((error) => setMessage(error.message));
  }, [apiUrl]);

  useEffect(() => {
    if (!apiUrl || !depositCoin || !settleCoin || !depositNetwork || !settleNetwork) return;
    const query = new URLSearchParams({ from: `${depositCoin.toLowerCase()}-${depositNetwork}`, to: `${settleCoin.toLowerCase()}-${settleNetwork}` });
    void fetch(`${apiUrl}/api/pair?${query}`).then(async (response) => {
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message || body.error || "Pair unavailable");
      setPair(body); setMessage("");
    }).catch((error) => { setPair({}); setMessage(error.message); });
  }, [apiUrl, depositCoin, depositNetwork, settleCoin, settleNetwork]);

  useEffect(() => {
    if (!apiUrl || !isAddress(operatorAddress)) return;
    void fetch(`${apiUrl}/api/operators/${operatorAddress}`).then(async (response) => {
      if (!response.ok) { setOperatorRegistered(false); return; }
      setOperatorStats(await response.json()); setOperatorRegistered(true);
    }).catch(() => setOperatorRegistered(false));
  }, [apiUrl, operatorAddress]);

  useEffect(() => {
    if (!account || !operatorConnected || !distributorConfigured || !apiUrl) {
      setSwapClaimable(0n); setDistributorVerified(false); return;
    }
    void Promise.all([readClaimable(account), readDistributorToken()]).then(([amount, token]) => {
      if (getAddress(token) !== getAddress(expectedUsdcAddress)) throw new Error("Commission distributor is not configured for canonical Base USDC.");
      setDistributorVerified(true); setSwapClaimable(amount);
    }).catch((error) => { setDistributorVerified(false); setMessage(error instanceof Error ? error.message : "Could not load swap commission."); });
  }, [account, operatorConnected, distributorConfigured, distributorAddress, expectedUsdcAddress, readClaimable, readDistributorToken, apiUrl]);

  useEffect(() => {
    if (!shift || ["settled", "refunded", "expired", "failed"].includes(shift.status)) return;
    const timer = window.setInterval(() => {
      void fetch(`${apiUrl}/api/shifts/${shift.id}`).then(async (response) => {
        const body = await response.json();
        if (response.ok) setShift(body);
      });
    }, 15_000);
    return () => window.clearInterval(timer);
  }, [apiUrl, shift]);

  function changeCoin(side: "deposit" | "settle", symbol: string) {
    const coin = coins.find((item) => item.coin === symbol);
    if (!coin) return;
    if (side === "deposit") { setDepositCoin(symbol); setDepositNetwork(coin.networks[0]); }
    else { setSettleCoin(symbol); setSettleNetwork(coin.networks[0]); }
  }

  async function createShift() {
    if (settleAddress.length < 3) { setMessage("Enter a receiving address for the selected network."); return; }
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`${apiUrl}/api/shifts/variable`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          operatorId: effectiveOperatorId, depositCoin, depositNetwork, settleCoin, settleNetwork,
          settleAddress, refundAddress: refundAddress || undefined,
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message || body.error || "Shift creation failed");
      setShift(body); setMessage("Shift created. Send only within the displayed limits.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Shift creation failed"); }
    finally { setBusy(false); }
  }

  async function registerOperator() {
    if (!operatorConnected || !account || !window.ethereum) return;
    setBusy(true); setMessage("Confirm the gas-free operator registration signature...");
    try {
      const challengeResponse = await fetch(`${apiUrl}/api/operators/challenge`, {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ wallet: account }),
      });
      const challenge = await challengeResponse.json();
      if (!challengeResponse.ok) throw new Error(challenge.error || "Could not create registration challenge");
      const encoded = `0x${Array.from(new TextEncoder().encode(challenge.message), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
      const signature = await window.ethereum.request({ method: "personal_sign", params: [encoded, account] });
      const verifyResponse = await fetch(`${apiUrl}/api/operators/verify`, {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ nonce: challenge.nonce, signature }),
      });
      const result = await verifyResponse.json();
      if (!verifyResponse.ok) throw new Error(result.error || "Operator registration failed");
      setOperatorRegistered(true); setMessage(`Operator registered as ${result.id}.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Operator registration failed"); }
    finally { setBusy(false); }
  }

  async function claimSwapCommission() {
    if (!operatorConnected || !distributorVerified || swapClaimable === 0n) return;
    setBusy(true); setMessage("Confirm the separate swap commission claim...");
    try {
      const client = await connectWallet();
      const hash = await client.writeContract({ address: distributorAddress, abi: swapDistributorAbi, functionName: "claim" });
      await waitForReceipt(hash);
      setSwapClaimable(0n); setMessage("Swap commission claimed in USDC.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Swap commission claim failed"); }
    finally { setBusy(false); }
  }

  async function linkTelegram() {
    if (!operatorConnected || !account || !operatorRegistered || !/^\d{12}$/.test(telegramCode) || !window.ethereum) return;
    setBusy(true); setMessage("Confirm the Telegram link with your operator wallet...");
    try {
      const challengeResponse = await fetch(`${apiUrl}/api/operators/telegram/challenge`, {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ wallet: account, code: telegramCode }),
      });
      const challenge = await challengeResponse.json();
      if (!challengeResponse.ok) throw new Error(challenge.error || "Could not verify Telegram code");
      const encoded = `0x${Array.from(new TextEncoder().encode(challenge.message), byte => byte.toString(16).padStart(2, "0")).join("")}`;
      const signature = await window.ethereum.request({ method: "personal_sign", params: [encoded, account] });
      const response = await fetch(`${apiUrl}/api/operators/telegram/verify`, {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ nonce: challenge.nonce, signature }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Telegram link failed");
      setTelegramCode(""); setMessage("Telegram linked to this operator wallet.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Telegram link failed"); }
    finally { setBusy(false); }
  }

  return <main className="swapper-main">
    <section className="swapper-workspace">
      <div className="title-row"><div><p className="eyebrow">DIRECT-TO-WALLET EXCHANGE</p><h1>Swap across networks.</h1></div><div className="fee"><span>Commission</span><strong>2%</strong></div></div>
      <div className="swap-grid">
        <div className="swap-leg"><label>YOU SEND</label><div className="swap-fields"><select value={depositCoin} onChange={(event) => changeCoin("deposit", event.target.value)}>{coins.map((coin) => <option key={coin.coin}>{coin.coin}</option>)}</select><select value={depositNetwork} onChange={(event) => setDepositNetwork(event.target.value)}>{fromCoin?.networks.filter((network) => available(fromCoin.depositOffline, network)).map((network) => <option key={network}>{network}</option>)}</select></div></div>
        <ArrowDownUp className="swap-direction" size={22}/>
        <div className="swap-leg"><label>YOU RECEIVE</label><div className="swap-fields"><select value={settleCoin} onChange={(event) => changeCoin("settle", event.target.value)}>{coins.map((coin) => <option key={coin.coin}>{coin.coin}</option>)}</select><select value={settleNetwork} onChange={(event) => setSettleNetwork(event.target.value)}>{toCoin?.networks.filter((network) => available(toCoin.settleOffline, network)).map((network) => <option key={network}>{network}</option>)}</select></div></div>
      </div>
      <div className="pair-strip"><span>Variable rate</span><strong>{pair.rate ? `1 ${depositCoin} = ${pair.rate} ${settleCoin}` : "Rate unavailable"}</strong><span>{pair.min && pair.max ? `Send ${pair.min}–${pair.max} ${depositCoin}` : ""}</span></div>
      <div className="swap-addresses"><label>RECEIVING ADDRESS<input value={settleAddress} onChange={(event) => setSettleAddress(event.target.value.trim())} placeholder={`${settleCoin} address on ${settleNetwork}`}/></label><label>REFUND ADDRESS · RECOMMENDED<input value={refundAddress} onChange={(event) => setRefundAddress(event.target.value.trim())} placeholder={`${depositCoin} address on ${depositNetwork}`}/></label></div>
      {!operatorRegistered && <div className="notice">Swaps are unavailable while this frontend operator is unverified.</div>}
      <button className="primary large" disabled={busy || !effectiveOperatorId || !operatorRegistered || !pair.rate || settleAddress.length < 3} onClick={createShift}>{busy ? <LoaderCircle className="spin" size={19}/> : <ArrowDownUp size={19}/>}Create variable swap</button>
      <div className="notice">SideShift executes the exchange on live networks, even when CryptoBattle is configured for a testnet. Your IP address is sent to SideShift for availability and compliance checks. The displayed quote includes a 2% integration commission. Network fees and the final variable rate may change before your deposit is received.</div>
    </section>
    <aside>
      <div className="summary-head"><ArrowDownUp size={20}/><div><span>SIDESHIFT ORDER</span><strong>{shift ? `${depositCoin} to ${settleCoin}` : "Create a swap to continue"}</strong></div></div>
      {shift && <><div className="address-box"><code>{shift.depositAddress}</code><button title="Copy deposit address" onClick={() => navigator.clipboard.writeText(shift.depositAddress)}><Copy size={18}/></button></div>{shift.depositMemo && <div className="address-box"><code>Memo: {shift.depositMemo}</code><button title="Copy memo" onClick={() => navigator.clipboard.writeText(shift.depositMemo!)}><Copy size={18}/></button></div>}<div className="facts"><div><span>Status</span><strong>{shift.status}</strong></div><div><span>Minimum</span><strong>{shift.depositMin} {depositCoin}</strong></div><div><span>Maximum</span><strong>{shift.depositMax} {depositCoin}</strong></div><div><span>Expires</span><strong>{new Date(shift.expiresAt).toLocaleString()}</strong></div></div><a className="secondary large link-button" href={`https://sideshift.ai/orders/${shift.id}`} target="_blank" rel="noreferrer">Order details <ExternalLink size={15}/></a></>}
      {message && <div className="notice"><Check size={15}/> {message}</div>}
      <details className="swap-admin">
        <summary><Settings2 size={16}/><span>Admin</span><ChevronDown className="swap-admin-chevron" size={16}/></summary>
        <div className="swap-admin-body">
          {!account ? <button className="secondary large" onClick={() => void connectWallet()}><Wallet size={18}/>Connect operator wallet</button> : operatorConnected ? <>
            {!operatorRegistered && <button className="secondary large" disabled={busy} onClick={registerOperator}><Wallet size={18}/>Verify frontend operator</button>}
            {operatorRegistered && <div className="pending"><span>Telegram swap reports</span><small>Send /link to the operator Telegram bot, then enter its one-time code.</small><input value={telegramCode} onChange={event => setTelegramCode(event.target.value.replace(/\D/g, "").slice(0, 12))} inputMode="numeric" maxLength={12} placeholder="12-digit code" aria-label="Telegram link code"/><button disabled={busy || !/^\d{12}$/.test(telegramCode)} onClick={linkTelegram}><Wallet size={15}/>Link Telegram</button></div>}
            <div className="pending"><span>Swap commission available</span><strong>{formatUnits(swapClaimable, 6)} USDC</strong><small>{operatorStats?.settled_shifts || 0} settled · {operatorStats?.pending_shifts || 0} pending shifts</small><button disabled={busy || !distributorVerified || swapClaimable === 0n} onClick={claimSwapCommission}><RefreshCw size={15}/>Claim swap commission</button></div>
          </> : <div className="notice">Connect this frontend's configured operator wallet to manage commissions.</div>}
          {distributorConfigured && <a className="address-meta" href={`${explorerUrl}/address/${distributorAddress}`} target="_blank" rel="noreferrer">Commission distributor <ExternalLink size={13}/></a>}
        </div>
      </details>
    </aside>
  </main>;
}
