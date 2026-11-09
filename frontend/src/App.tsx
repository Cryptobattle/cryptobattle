import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownToLine, Check, ChevronDown, Copy, ExternalLink, LoaderCircle,
  RefreshCw, ShieldCheck, Unplug, Wallet,
} from "lucide-react";
import {
  createPublicClient, createWalletClient, custom, formatUnits,
  fallback, getAddress, hexToString, http, isAddress, parseUnits, parseEventLogs, type Address, type TransactionReceipt,
} from "viem";
import { base, baseSepolia } from "viem/chains";
import { assetRegistryAbi, coreAbi, erc20Abi, factoryAbi, keeperTreasuryAbi, proxyAbi, swapDistributorAbi } from "./contracts";
import { MarketPerformance } from "./MarketPerformance";
import { CoinIcon } from "./CoinIcon";
import { Swapper } from "./Swapper";
import { frontendConfig } from "./config";
import { OperatorCommunity } from "./OperatorCommunity";
import { customerDraft, receiptStart } from "./customer-links";

const ASSETS = ["BTC", "ETH", "SOL", "XRP", "BNB", "DOGE", "ADA", "AVAX", "LINK", "LTC"] as const;
const DURATIONS = [
  ["1 min", 60], ["10 min", 600], ["1 hour", 3600],
  ["1 day", 86400], ["1 week", 604800], ["30 days", 2592000],
] as const;
const ENTRY_WINDOWS: Record<number, { label: string; seconds: number }> = {
  60: { label: "30 sec", seconds: 30 },
  600: { label: "2 min", seconds: 120 },
  3600: { label: "10 min", seconds: 600 },
  86400: { label: "2 hours", seconds: 7200 },
  604800: { label: "1 day", seconds: 86400 },
  2592000: { label: "3 days", seconds: 259200 },
};

const networkName = frontendConfig.VITE_NETWORK === "base" ? "base" : "baseSepolia";
const chain = networkName === "base" ? base : baseSepolia;
const rpcUrls = (frontendConfig.VITE_RPC_URLS || frontendConfig.VITE_RPC_URL || "")
  .split(",").map((value: string) => value.trim()).filter(Boolean);
type StakeToken = "USDC" | "EURC" | "WETH" | "ETH";
const STAKE_TOKENS = ["USDC", "EURC", "WETH", "ETH"] as const;
const configuredStakeTokens = (frontendConfig.VITE_ENABLED_SETTLEMENT_ASSETS || STAKE_TOKENS.join(","))
  .split(",").map((value: string) => value.trim().toUpperCase()).filter(Boolean);
if (configuredStakeTokens.length === 0 || configuredStakeTokens.some((value: string) => !STAKE_TOKENS.includes(value as StakeToken))) {
  throw new Error("VITE_ENABLED_SETTLEMENT_ASSETS must contain one or more of: USDC,EURC,WETH,ETH");
}
const enabledStakeTokens = STAKE_TOKENS.filter((value) => configuredStakeTokens.includes(value));
const defaultStakeToken = enabledStakeTokens[0];
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as Address;
const PROCESS_GAS_LIMIT = 1_000_000n;
const factoryAddresses: Record<StakeToken, Address> = {
  USDC: (frontendConfig.VITE_USDC_FACTORY_ADDRESS || frontendConfig.VITE_FACTORY_ADDRESS || ZERO_ADDRESS) as Address,
  EURC: (frontendConfig.VITE_EURC_FACTORY_ADDRESS || ZERO_ADDRESS) as Address,
  WETH: (frontendConfig.VITE_WETH_FACTORY_ADDRESS || ZERO_ADDRESS) as Address,
  ETH: (frontendConfig.VITE_ETH_FACTORY_ADDRESS || ZERO_ADDRESS) as Address,
};
const operatorAddress = (frontendConfig.VITE_OPERATOR_ADDRESS || ZERO_ADDRESS) as Address;
const operatorCommunityBot = frontendConfig.VITE_OPERATOR_TELEGRAM_BOT || "";
const customerBot = (frontendConfig.VITE_CUSTOMER_TELEGRAM_BOT || "").replace(/^@/, "");
const ethAddressMode = frontendConfig.VITE_ETH_ADDRESS_MODE === "personal" ? "personal" : "shared";
const expectedUsdcAddress = (networkName === "base"
  ? "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
  : "0x036CbD53842c5426634e7929541eC2318f3dCF7e") as Address;
const expectedWethAddress = "0x4200000000000000000000000000000000000006" as Address;
const expectedEurcAddress = (networkName === "base"
  ? "0x60a3E35Cc302bFA44Cb288Bc5a4F316Fdb1adb42"
  : "0x808456652fdb597867f38412077A9182bf77359F") as Address;
const publicTransport = rpcUrls.length > 1
  ? fallback(rpcUrls.map((url: string) => http(url)))
  : http(rpcUrls[0]);
const publicClient = createPublicClient({ chain, transport: publicTransport });
const apiUrl = (frontendConfig.VITE_MARKET_API_URL || "").replace(/\/$/, "");
const swapperEnabled = frontendConfig.VITE_SWAPPER_ENABLED !== "false";
const swapperApiUrl = (frontendConfig.VITE_SWAPPER_API_URL || "").replace(/\/$/, "");
const swapperOperatorId = frontendConfig.VITE_SWAPPER_OPERATOR_ID || "";
const swapDistributorAddress = (frontendConfig.VITE_SWAP_DISTRIBUTOR_ADDRESS || ZERO_ADDRESS) as Address;
const swapNetworkName = frontendConfig.VITE_SWAP_NETWORK === "baseSepolia" ? "baseSepolia" : "base";
const swapChain = swapNetworkName === "baseSepolia" ? baseSepolia : base;
const swapRpcUrls = (frontendConfig.VITE_SWAP_RPC_URLS || "").split(",").map((value: string) => value.trim()).filter(Boolean);
const swapTransport = swapRpcUrls.length > 1 ? fallback(swapRpcUrls.map((url: string) => http(url))) : http(swapRpcUrls[0]);
const swapPublicClient = createPublicClient({ chain: swapChain, transport: swapTransport });
const expectedSwapUsdcAddress = (swapNetworkName === "base"
  ? "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
  : "0x036CbD53842c5426634e7929541eC2318f3dCF7e") as Address;
const readSwapClaimable = (address: Address) => swapPublicClient.readContract({ address: swapDistributorAddress, abi: swapDistributorAbi, functionName: "claimable", args: [address] });
const readSwapDistributorToken = () => swapPublicClient.readContract({ address: swapDistributorAddress, abi: swapDistributorAbi, functionName: "token" });
const waitForSwapReceipt = (hash: `0x${string}`) => swapPublicClient.waitForTransactionReceipt({ hash });

type Status = "idle" | "working" | "success" | "error";
type EthereumProvider = { request: (args: { method: string; params?: unknown[] }) => Promise<unknown>; on?: (event: string, cb: (...args: unknown[]) => void) => void; removeListener?: (event: string, cb: (...args: unknown[]) => void) => void };
declare global { interface Window { ethereum?: EthereumProvider } }

function short(address: string) { return `${address.slice(0, 6)}...${address.slice(-4)}`; }
function countdown(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours ? `${hours}h ${minutes}m` : `${minutes}m`;
}

export function App() {
  const prefill = useMemo(() => {
    const draft = customerDraft(window.location.search);
    return draft && enabledStakeTokens.includes(draft.settlementAsset as StakeToken) ? draft : undefined;
  }, []);
  const initialToken = prefill && enabledStakeTokens.includes(prefill.settlementAsset as StakeToken) ? prefill.settlementAsset as StakeToken : defaultStakeToken;
  const initialView = window.location.hash === "#markets" ? "markets" : window.location.hash === "#swapper" && swapperEnabled ? "swapper" : "battle";
  const [view, setView] = useState<"battle" | "markets" | "swapper">(initialView);
  const [account, setAccount] = useState<Address>();
  const [assetOne, setAssetOne] = useState(prefill?.assetA ?? 0);
  const [assetTwo, setAssetTwo] = useState(prefill?.assetB ?? 1);
  const [assetNames, setAssetNames] = useState<string[]>([...ASSETS]);
  const [enabledAssetIds, setEnabledAssetIds] = useState<number[]>([0, 1, 2, 3, 4, 5]);
  const [pick, setPick] = useState(prefill?.sideB ? 1 : 0);
  const [duration, setDuration] = useState(prefill?.duration ?? 3600);
  const [amount, setAmount] = useState(prefill?.amount || (initialToken === "USDC" || initialToken === "EURC" ? "50" : "0.025"));
  const [stakeToken, setStakeToken] = useState<StakeToken>(initialToken);
  const [entryReceipt, setEntryReceipt] = useState<{hash: `0x${string}`; asset: StakeToken}>();
  const [depositAddress, setDepositAddress] = useState<Address>();
  const [tokenAddress, setTokenAddress] = useState<Address>();
  const [coreAddress, setCoreAddress] = useState<Address>();
  const [tokenDecimals, setTokenDecimals] = useState(6);
  const [minimumDeposit, setMinimumDeposit] = useState(10_000_000n);
  const [totalFeeBps, setTotalFeeBps] = useState(500);
  const [claimable, setClaimable] = useState(0n);
  const [claimRecipient, setClaimRecipient] = useState("");
  const [operatorEarnings, setOperatorEarnings] = useState(0n);
  const [operatorFeesLoading, setOperatorFeesLoading] = useState(false);
  const [operatorFeesError, setOperatorFeesError] = useState(false);
  const [operatorFeesRefresh, setOperatorFeesRefresh] = useState(0);
  const [operatorRegistry, setOperatorRegistry] = useState<Address>();
  const [operatorActive, setOperatorActive] = useState(false);
  const [operatorActivationFee, setOperatorActivationFee] = useState(0n);
  const [operatorRecipient, setOperatorRecipient] = useState("");
  const [tokenVerified, setTokenVerified] = useState(false);
  const [active, setActive] = useState(false);
  const [balance, setBalance] = useState(0n);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [poolTotals, setPoolTotals] = useState({ totalA: 0n, totalB: 0n, matched: 0n });
  const [poolLoading, setPoolLoading] = useState(false);
  const [poolUnavailable, setPoolUnavailable] = useState(false);
  const [poolRefresh, setPoolRefresh] = useState(0);
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  const factoryAddress = factoryAddresses[stakeToken];
  const configured = isAddress(factoryAddress) && BigInt(factoryAddress) !== 0n;
  const operatorConfigured = isAddress(operatorAddress) && BigInt(operatorAddress) !== 0n;
  const native = stakeToken === "ETH";
  const personalNative = native && ethAddressMode === "personal";
  const expectedTokenAddress = stakeToken === "USDC"
    ? expectedUsdcAddress
    : stakeToken === "EURC"
      ? expectedEurcAddress
      : stakeToken === "WETH" ? expectedWethAddress : ZERO_ADDRESS;
  const minimumLabel = formatUnits(minimumDeposit, tokenDecimals);
  const poolForAssetOne = assetOne < assetTwo ? poolTotals.totalA : poolTotals.totalB;
  const poolForAssetTwo = assetOne < assetTwo ? poolTotals.totalB : poolTotals.totalA;
  const entryWindow = ENTRY_WINDOWS[duration];
  const currentBoundary = Math.floor(now / duration) * duration;
  const entryClosesAt = currentBoundary + entryWindow.seconds;
  const joinsCurrentRound = now < entryClosesAt;
  const entryStatus = joinsCurrentRound
    ? `Current round closes to new entries in ${countdown(entryClosesAt - now)}`
    : `New entries join the next ${DURATIONS.find(item => item[1] === duration)?.[0]} round`;

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => { setEntryReceipt(undefined); }, [account, stakeToken]);

  function rememberEntry(receipt: TransactionReceipt) {
    if (receipt.status !== "success") throw new Error("Entry transaction reverted. Check the pending balance before sending again.");
    if (!coreAddress || !account) return;
    const events = parseEventLogs({ abi: coreAbi, logs: receipt.logs.filter(log => getAddress(log.address) === getAddress(coreAddress)), strict: false });
    if (events.some(event => event.eventName === "DepositRecorded" && event.args.beneficiary && event.args.operator && getAddress(event.args.beneficiary) === getAddress(account) && getAddress(event.args.operator) === getAddress(operatorAddress))) {
      setEntryReceipt({ hash: receipt.transactionHash, asset: stakeToken });
    }
  }

  const ordered = useMemo(() => {
    const a = Math.min(assetOne, assetTwo);
    const b = Math.max(assetOne, assetTwo);
    const pickedAsset = pick === 0 ? assetOne : assetTwo;
    return { assetA: a, assetB: b, duration, sideB: pickedAsset === b, beneficiary: account!, operator: operatorAddress };
  }, [assetOne, assetTwo, pick, duration, account]);

  useEffect(() => {
    if (!configured) { setTokenAddress(undefined); setCoreAddress(undefined); setTokenVerified(false); return; }
    let live = true;
    void (async () => {
      try {
        const [factoryToken, factoryCore] = await Promise.all([
          publicClient.readContract({ address: factoryAddress, abi: factoryAbi, functionName: "token" }),
          publicClient.readContract({ address: factoryAddress, abi: factoryAbi, functionName: "core" }),
        ]);
        let registry: Address | undefined;
        try {
          registry = await publicClient.readContract({ address: factoryAddress, abi: factoryAbi, functionName: "operatorRegistry" });
        } catch {
          // Legacy factories deployed before operator registration remain usable until migration.
        }
        if (!live) return;
        const verified = getAddress(factoryToken) === getAddress(expectedTokenAddress);
        setTokenAddress(factoryToken);
        setCoreAddress(factoryCore);
        setOperatorRegistry(registry);
        setTokenVerified(verified);
        if (!verified) {
          setMessage(`Factory token does not match canonical ${stakeToken} on this network.`);
          return;
        }
        const assetRegistry = await publicClient.readContract({ address: factoryCore, abi: coreAbi, functionName: "assetRegistry" });
        const [symbols, assetFlags] = await publicClient.readContract({ address: assetRegistry, abi: assetRegistryAbi, functionName: "allAssets" });
        const [decimals, minimum, feeBps, registryActive, activationFee] = await Promise.all([
          native
            ? Promise.resolve(18)
            : publicClient.readContract({ address: factoryToken, abi: erc20Abi, functionName: "decimals" }),
          publicClient.readContract({ address: factoryCore, abi: coreAbi, functionName: "minDeposit" }),
          publicClient.readContract({ address: factoryCore, abi: coreAbi, functionName: "FEE_BPS" }),
          registry
            ? publicClient.readContract({ address: registry, abi: keeperTreasuryAbi, functionName: "isOperatorActive", args: [operatorAddress] })
            : Promise.resolve(true),
          registry
            ? publicClient.readContract({ address: registry, abi: keeperTreasuryAbi, functionName: "activationFee" })
            : Promise.resolve(0n),
        ]);
        if (live) {
          const names = symbols.map(symbol => hexToString(symbol, { size: 32 }).replace(/\0+$/, ""));
          const enabled = assetFlags.map((value, index) => value ? index : -1).filter(index => index >= 0);
          if (enabled.length < 2) throw new Error("The selected Core has fewer than two enabled battle assets.");
          setAssetNames(names);
          setEnabledAssetIds(enabled);
          if (!enabled.includes(assetOne) || !enabled.includes(assetTwo)) {
            setAssetOne(enabled[0]);
            setAssetTwo(enabled[1]);
            setPick(0);
          }
          setTokenDecimals(decimals); setMinimumDeposit(minimum); setTotalFeeBps(Number(feeBps)); setOperatorActive(registryActive); setOperatorActivationFee(activationFee);
        }
      } catch { if (live) setMessage("Could not read the configured factory."); }
    })();
    return () => { live = false; };
  }, [stakeToken]);

  useEffect(() => {
    setOperatorEarnings(0n);
    setOperatorFeesError(false);
    setOperatorFeesLoading(false);
    if (!coreAddress || !tokenVerified || !operatorConfigured || !account || getAddress(account) !== getAddress(operatorAddress)) return;
    let live = true;
    const load = async () => {
      setOperatorFeesLoading(true);
      try {
        const earnings = await publicClient.readContract({ address: coreAddress, abi: coreAbi, functionName: "operatorFees", args: [operatorAddress] });
        if (live) { setOperatorEarnings(earnings); setOperatorFeesError(false); }
      } catch {
        if (live) setOperatorFeesError(true);
      } finally {
        if (live) setOperatorFeesLoading(false);
      }
    };
    void load();
    return () => { live = false; };
  }, [coreAddress, tokenVerified, account, operatorFeesRefresh]);

  useEffect(() => {
    if (!coreAddress || !tokenVerified) {
      setPoolTotals({ totalA: 0n, totalB: 0n, matched: 0n });
      setPoolUnavailable(false);
      return;
    }
    let live = true;
    let controller: AbortController | undefined;
    const load = async () => {
      if (controller) return;
      controller = new AbortController();
      if (live) setPoolLoading(true);
      try {
        const query = new URLSearchParams({
          settlementAsset: stakeToken,
          assetA: String(Math.min(assetOne, assetTwo)),
          assetB: String(Math.max(assetOne, assetTwo)),
          duration: String(duration),
        });
        const response = await fetch(`${apiUrl}/api/round-pool?${query}`, {
          signal: controller.signal,
        });
        const body = await response.json() as {
          totalA?: string;
          totalB?: string;
          matchedPerSide?: string;
          error?: string;
        };
        if (!response.ok || body.totalA === undefined || body.totalB === undefined || body.matchedPerSide === undefined) {
          throw new Error(body.error || "Pool totals are unavailable");
        }
        if (live) {
          setPoolTotals({
            totalA: BigInt(body.totalA),
            totalB: BigInt(body.totalB),
            matched: BigInt(body.matchedPerSide),
          });
          setPoolUnavailable(false);
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        if (live) setPoolUnavailable(true);
      } finally {
        controller = undefined;
        if (live) setPoolLoading(false);
      }
    };
    void load();
    const timer = window.setInterval(() => void load(), 30_000);
    return () => { live = false; controller?.abort(); window.clearInterval(timer); };
  }, [coreAddress, tokenVerified, stakeToken, assetOne, assetTwo, duration, poolRefresh]);

  useEffect(() => {
    if (!account || !configured || !operatorConfigured || !tokenVerified || !tokenAddress || !coreAddress) {
      setDepositAddress(undefined); setActive(false); setBalance(0n); setClaimable(0n); return;
    }
    let live = true;
    void (async () => {
      try {
        const predicted = await publicClient.readContract({ address: factoryAddress, abi: factoryAbi, functionName: personalNative ? "predictPersonal" : "predict", args: [ordered] });
        const [code, funds, deferred] = await Promise.all([
          publicClient.getCode({ address: predicted }),
          native
            ? publicClient.getBalance({ address: predicted })
            : publicClient.readContract({ address: tokenAddress, abi: erc20Abi, functionName: "balanceOf", args: [predicted] }),
          publicClient.readContract({ address: coreAddress, abi: coreAbi, functionName: "claimable", args: [account] }),
        ]);
        if (live) { setDepositAddress(predicted); setActive(Boolean(code && code !== "0x")); setBalance(funds); setClaimable(deferred); }
      } catch { if (live) setMessage("Could not calculate the personal deposit address."); }
    })();
    return () => { live = false; };
  }, [account, ordered, stakeToken, tokenVerified, tokenAddress, coreAddress]);

  function chooseStakeToken(next: StakeToken) {
    setStakeToken(next);
    setAmount(next === "USDC" || next === "EURC" ? "50" : "0.025");
    setTokenDecimals(next === "USDC" || next === "EURC" ? 6 : 18);
    setMinimumDeposit(next === "USDC" || next === "EURC" ? 50_000_000n : 25_000_000_000_000_000n);
    setDepositAddress(undefined); setTokenAddress(undefined); setCoreAddress(undefined);
    setActive(false); setBalance(0n); setClaimable(0n); setTokenVerified(false); setMessage("");
    setOperatorEarnings(0n); setOperatorRecipient("");
    setOperatorRegistry(undefined); setOperatorActive(false); setOperatorActivationFee(0n);
  }

  useEffect(() => {
    const provider = window.ethereum;
    if (!provider?.on) return;
    const changed = (...args: unknown[]) => setAccount((args[0] as string[])?.[0] as Address | undefined);
    provider.on("accountsChanged", changed);
    return () => provider.removeListener?.("accountsChanged", changed);
  }, []);

  async function walletFor(targetChain: typeof base | typeof baseSepolia) {
    if (!window.ethereum) throw new Error("No wallet connection found. Open this page in your wallet's dApp browser, or use a desktop browser with a wallet extension. Never send private keys to a Telegram bot.");
    await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: `0x${targetChain.id.toString(16)}` }] }).catch(async () => {
      await window.ethereum!.request({ method: "wallet_addEthereumChain", params: [{ chainId: `0x${targetChain.id.toString(16)}`, chainName: targetChain.name, nativeCurrency: targetChain.nativeCurrency, rpcUrls: targetChain.rpcUrls.default.http, blockExplorerUrls: [targetChain.blockExplorers.default.url] }] });
    });
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" }) as string[];
    const address = getAddress(accounts[0]);
    setAccount(address);
    return createWalletClient({ account: address, chain: targetChain, transport: custom(window.ethereum) });
  }

  const wallet = () => walletFor(chain);
  const swapWallet = () => walletFor(swapChain);

  async function signCommunityMessage(message: string) {
    const client = await wallet();
    if (getAddress(client.account.address) !== getAddress(operatorAddress)) throw new Error("Connect the configured operator wallet.");
    return client.signMessage({ message });
  }

  async function connect() {
    setStatus("working"); setMessage("");
    try { await wallet(); setStatus("idle"); } catch (e) { setStatus("error"); setMessage(e instanceof Error ? e.message : "Wallet connection failed."); }
  }

  async function activate() {
    setStatus("working"); setMessage("Activating your permanent address...");
    try {
      const client = await wallet();
      const hash = await client.writeContract({ address: factoryAddress, abi: factoryAbi, functionName: personalNative ? "deployPersonal" : "deploy", args: [ordered] });
      await publicClient.waitForTransactionReceipt({ hash });
      setActive(true); setStatus("success"); setMessage("Address active. It stays yours permanently.");
    } catch (e) { setStatus("error"); setMessage(e instanceof Error ? e.message : "Activation failed."); }
  }

  async function activateFrontendOperator() {
    if (!operatorRegistry || !account || getAddress(account) !== getAddress(operatorAddress)) return;
    setStatus("working"); setMessage("Confirm the one-time frontend operator activation...");
    try {
      const client = await wallet();
      const hash = await client.writeContract({ address: operatorRegistry, abi: keeperTreasuryAbi, functionName: "activateOperator", value: operatorActivationFee });
      await publicClient.waitForTransactionReceipt({ hash });
      setOperatorActive(true); setStatus("success"); setMessage("Frontend operator activated for all settlement assets.");
    } catch (e) { setStatus("error"); setMessage(e instanceof Error ? e.message : "Operator activation failed."); }
  }

  async function sendAndEnter() {
    if (!depositAddress || !tokenAddress || !tokenVerified) return;
    let value: bigint;
    try { value = parseUnits(amount, tokenDecimals); } catch { return; }
    if (value < minimumDeposit) return;
    setStatus("working"); setMessage(`Confirm the ${stakeToken} transfer in your wallet...`);
    try {
      const client = await wallet();
      if (getAddress(client.account.address) !== getAddress(ordered.beneficiary)) throw new Error("Wallet account changed. Review your deposit address and submit again.");
      if (!active) {
        const deployHash = await client.writeContract({ address: factoryAddress, abi: factoryAbi, functionName: personalNative ? "deployPersonal" : "deploy", args: [ordered] });
        await publicClient.waitForTransactionReceipt({ hash: deployHash });
        setActive(true);
      }
      const transferHash = native
        ? await client.sendTransaction({ to: depositAddress, value })
        : await client.writeContract({ address: tokenAddress, abi: erc20Abi, functionName: "transfer", args: [depositAddress, value] });
      const transferReceipt = await publicClient.waitForTransactionReceipt({ hash: transferHash });
      if (transferReceipt.status !== "success") throw new Error("Transfer reverted. No entry was created.");
      if (native && !personalNative) rememberEntry(transferReceipt);
      if (!native || personalNative) {
        setMessage("Transfer confirmed. Confirm entry processing...");
        const processHash = await client.writeContract({
          address: depositAddress,
          abi: proxyAbi,
          functionName: "process",
          gas: PROCESS_GAS_LIMIT,
        });
        rememberEntry(await publicClient.waitForTransactionReceipt({ hash: processHash }));
      }
      setBalance(0n); setStatus("success"); setMessage(`${amount} ${stakeToken} entered for ${assetNames[pick === 0 ? assetOne : assetTwo]}.`);
      setPoolRefresh(value => value + 1);
    } catch (e) { setStatus("error"); setMessage(e instanceof Error ? e.message : "Transaction failed."); }
  }

  async function processBalance() {
    if (!depositAddress || !tokenVerified || balance < minimumDeposit) return;
    setStatus("working"); setMessage("Processing address balance...");
    try {
      const client = await wallet();
      const hash = await client.writeContract({
        address: depositAddress,
        abi: proxyAbi,
        functionName: "process",
        gas: PROCESS_GAS_LIMIT,
      });
      rememberEntry(await publicClient.waitForTransactionReceipt({ hash }));
      setBalance(0n); setStatus("success"); setMessage(`Pending ${stakeToken} entered successfully.`);
      setPoolRefresh(value => value + 1);
    } catch (e) { setStatus("error"); setMessage(e instanceof Error ? e.message : "Processing failed."); }
  }

  async function refundDust() {
    if (!depositAddress || balance === 0n || balance >= minimumDeposit) return;
    setStatus("working"); setMessage("Confirm dust refund...");
    try {
      const client = await wallet();
      const hash = await client.writeContract({ address: depositAddress, abi: proxyAbi, functionName: "refundDust" });
      await publicClient.waitForTransactionReceipt({ hash });
      setBalance(0n); setStatus("success"); setMessage(`${stakeToken} returned to your wallet.`);
    } catch (e) { setStatus("error"); setMessage(e instanceof Error ? e.message : "Refund failed."); }
  }

  async function claimDeferred() {
    if (!coreAddress || !account || !isAddress(claimRecipient) || claimable === 0n) return;
    setStatus("working"); setMessage("Confirm deferred payout claim...");
    try {
      const client = await wallet();
      const recipient = getAddress(claimRecipient);
      const hash = await client.writeContract({ address: coreAddress, abi: coreAbi, functionName: "claim", args: [recipient] });
      await publicClient.waitForTransactionReceipt({ hash });
      setClaimable(0n); setStatus("success"); setMessage("Deferred payout claimed successfully.");
    } catch (e) { setStatus("error"); setMessage(e instanceof Error ? e.message : "Claim failed."); }
  }

  async function claimOperatorEarnings() {
    if (!coreAddress || !account || !operatorConfigured || getAddress(account) !== getAddress(operatorAddress) || !isAddress(operatorRecipient) || operatorEarnings === 0n) return;
    setStatus("working"); setMessage("Confirm operator fee claim...");
    try {
      const client = await wallet();
      const recipient = getAddress(operatorRecipient);
      const hash = await client.writeContract({ address: coreAddress, abi: coreAbi, functionName: "claimOperatorFee", args: [recipient] });
      await publicClient.waitForTransactionReceipt({ hash });
      setOperatorEarnings(0n); setOperatorFeesRefresh(value => value + 1); setStatus("success"); setMessage("Operator fees claimed successfully.");
    } catch (e) { setStatus("error"); setMessage(e instanceof Error ? e.message : "Operator claim failed."); }
  }

  function selectAsset(position: 0 | 1, next: number) {
    if (position === 0) { setAssetOne(next); if (next === assetTwo) setAssetTwo(assetOne); }
    else { setAssetTwo(next); if (next === assetOne) setAssetOne(assetTwo); }
  }

  function selectView(next: "battle" | "markets" | "swapper") {
    setView(next);
    window.history.replaceState(null, "", next === "battle" ? window.location.pathname + window.location.search : `#${next}`);
  }

  let amountValid = false;
  try { amountValid = parseUnits(amount || "0", tokenDecimals) >= minimumDeposit; } catch { amountValid = false; }

  return <div className="app-shell">
    <header>
      <a className="brand" href="/" aria-label="CryptoBattle home"><span className="brand-mark">CB</span><span>CryptoBattle</span></a>
      <div className="header-center"><nav className="view-tabs" aria-label="Primary"><button className={view === "battle" ? "active" : ""} onClick={() => selectView("battle")}>Battle</button><button className={view === "markets" ? "active" : ""} onClick={() => selectView("markets")}>Markets</button>{swapperEnabled && <button className={view === "swapper" ? "active" : ""} onClick={() => selectView("swapper")}>Swapper</button>}</nav><div className="network"><i />{chain.name}</div></div>
      {account ? <button className="wallet-button connected" onClick={() => setAccount(undefined)}><Unplug size={16}/>{short(account)}</button>
        : view !== "swapper" && <button className="wallet-button" onClick={connect}><Wallet size={17}/>Connect wallet</button>}
    </header>

    {view === "battle" ? <main>
      <section className="workspace">
        {prefill && <div className="notice">Prepared in Telegram. Review the market, stake, network and wallet before signing. This link does not submit a transaction.</div>}
        <div className="title-row"><div><p className="eyebrow">PERFORMANCE DUEL</p><h1>Choose your winner.</h1></div><div className="fee"><span>Total fee</span><strong>{totalFeeBps / 100}%</strong></div></div>
        <div className="token-choice"><label>PAYMENT TOKEN</label><div className="segments compact">{enabledStakeTokens.map(symbol => <button className={stakeToken === symbol ? "active" : ""} onClick={() => chooseStakeToken(symbol)} key={symbol}>{symbol}</button>)}</div></div>

        <div className="matchup">
          {[assetOne, assetTwo].map((asset, position) => <div className={`side ${pick === position ? "selected" : ""}`} key={position} onClick={() => setPick(position)}>
            <div className="side-top"><span className="coin"><CoinIcon symbol={assetNames[asset]} /></span><span className="pick-status">{pick === position && <Check size={14}/>} {pick === position ? "Your pick" : "Choose"}</span></div>
            <label>ASSET {position + 1}</label>
            <div className="select-wrap"><select value={asset} onChange={e => selectAsset(position as 0|1, Number(e.target.value))}>{enabledAssetIds.map(i => <option key={assetNames[i]} value={i}>{assetNames[i]}</option>)}</select><ChevronDown size={20}/></div>
          </div>)}
          <span className="versus">VS</span>
        </div>

        <section className="live-pool" aria-label="Current round stake totals">
          <div className="live-pool-head"><div><label>LIVE ROUND POOL</label><span>Updates every 30 seconds</span></div><button title="Refresh pool totals" onClick={() => setPoolRefresh(value => value + 1)} disabled={poolLoading}><RefreshCw className={poolLoading ? "spin" : ""} size={16}/></button></div>
          {poolUnavailable ? <div className="pool-unavailable">Pool totals are temporarily unavailable.</div> : <div className="pool-sides">
            <div><span><CoinIcon symbol={assetNames[assetOne]} size={18}/>{assetNames[assetOne]}</span><strong>{formatUnits(poolForAssetOne, tokenDecimals)} {stakeToken}</strong></div>
            <div className="pool-matched"><span>MATCHED</span><strong>{formatUnits(poolTotals.matched * 2n, tokenDecimals)} {stakeToken}</strong></div>
            <div><span><CoinIcon symbol={assetNames[assetTwo]} size={18}/>{assetNames[assetTwo]}</span><strong>{formatUnits(poolForAssetTwo, tokenDecimals)} {stakeToken}</strong></div>
          </div>}
        </section>

        <div className="controls-band">
          <div><label>ROUND LENGTH</label><div className="segments">{DURATIONS.map(([label, seconds]) => <button className={duration === seconds ? "active" : ""} onClick={() => setDuration(seconds)} key={seconds}>{label}</button>)}</div><div className={`entry-status ${joinsCurrentRound ? "open" : "next"}`}><span>{entryStatus}</span><strong>Entry window: first {entryWindow.label}</strong></div></div>
          <div className="amount-control"><label>STAKE · MIN {minimumLabel} {stakeToken}</label><div className="amount-input"><input inputMode="decimal" min={minimumLabel} step="any" value={amount} onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}/><span>{stakeToken}</span></div></div>
        </div>
        <details className="rules-disclosure">
          <summary><span><ShieldCheck size={17}/>Battle rules</span><ChevronDown size={18}/></summary>
          <div className="rules-body">
            <p>Each round accepts entries only near its start. An entry processed after that window is assigned to the next round, so late bets cannot use most of a period's price movement.</p>
            <div className="entry-window-grid">{DURATIONS.map(([label, seconds]) => <div key={seconds}><span>{label}</span><strong>{ENTRY_WINDOWS[seconds].label}</strong></div>)}</div>
            <p>For ERC-20 and personal ETH addresses, the on-chain processing time determines the round. Shared native ETH is processed when received. Only matched stakes compete; unmatched stakes roll forward under the contract rules. Draws are refunded without a platform fee.</p>
          </div>
        </details>
      </section>

      <aside>
        <div className="summary-head"><ArrowDownToLine size={20}/><div><span>PERMANENT DEPOSIT ADDRESS</span><strong>{assetNames[pick === 0 ? assetOne : assetTwo]} wins · {DURATIONS.find(d => d[1] === duration)?.[0]}</strong></div></div>
        {!configured && <div className="notice error">Factory address is not configured for this deployment.</div>}
        {!operatorConfigured && <div className="notice error">Frontend operator address is not configured.</div>}
        {operatorConfigured && operatorRegistry && !operatorActive && <div className="notice error">This frontend operator is not active yet.</div>}
        {configured && account && tokenAddress && !tokenVerified && <div className="notice error">Blocked: factory token is not canonical {stakeToken}.</div>}
        {stakeToken === "ETH" && ethAddressMode === "shared" && <div className="notice">Shared ETH address. Send only from the connected personal wallet you control. Do not send directly from an exchange or custodial account. The sending wallet becomes the beneficiary and receives payouts and refunds.</div>}
        {stakeToken === "ETH" && ethAddressMode === "personal" && <div className="notice">Personal ETH address bound to your connected beneficiary wallet. Do not send directly from an exchange or custodial account.</div>}
        {!account ? <button className="primary large" onClick={connect}><Wallet size={19}/>Connect wallet</button> : <>
          <div className="address-box"><code>{depositAddress || "Calculating..."}</code><button title="Copy address" onClick={() => depositAddress && navigator.clipboard.writeText(depositAddress)}><Copy size={18}/></button></div>
          <div className="address-meta"><span><i className={active ? "ok" : ""}/>{active ? "Active" : "Not activated"}</span><a href={depositAddress ? `${chain.blockExplorers.default.url}/address/${depositAddress}` : "#"} target="_blank">Explorer <ExternalLink size={13}/></a></div>
          {balance > 0n && <div className="pending"><span>Pending at address</span><strong>{formatUnits(balance, tokenDecimals)} {stakeToken}</strong><button onClick={balance < minimumDeposit ? refundDust : processBalance}><RefreshCw size={15}/>{balance < minimumDeposit ? "Refund to wallet" : "Process"}</button></div>}
          {claimable > 0n && <div className="pending"><span>Deferred payout</span><strong>{formatUnits(claimable, tokenDecimals)} {stakeToken}</strong><input value={claimRecipient} onChange={e => setClaimRecipient(e.target.value)} placeholder="Alternative recipient address"/><button disabled={!isAddress(claimRecipient) || status === "working"} onClick={claimDeferred}><ArrowDownToLine size={15}/>Claim</button></div>}
          {operatorConfigured && getAddress(account) === getAddress(operatorAddress) && <div className="pending"><span>Operator fees available · {stakeToken}</span><strong>{operatorFeesError ? "Temporarily unavailable" : operatorFeesLoading ? "Updating..." : `${formatUnits(operatorEarnings, tokenDecimals)} ${stakeToken}`}</strong><button disabled={operatorFeesLoading} onClick={() => setOperatorFeesRefresh(value => value + 1)}><RefreshCw size={15}/>Refresh fees</button><input value={operatorRecipient} onChange={e => setOperatorRecipient(e.target.value)} placeholder="Fee recipient address"/><button disabled={operatorFeesError || operatorFeesLoading || operatorEarnings === 0n || !isAddress(operatorRecipient) || status === "working"} onClick={claimOperatorEarnings}><ArrowDownToLine size={15}/>Claim operator fees</button><small>Refreshes when you connect, change settlement currency, or claim fees. Use Refresh fees to check for new earnings. Platform fees are separate and are withdrawn through the platform FeeVault.</small></div>}
          {operatorConfigured && operatorRegistry && !operatorActive && getAddress(account) === getAddress(operatorAddress) && <button className="secondary large" disabled={status === "working"} onClick={activateFrontendOperator}><ShieldCheck size={18}/>Activate frontend · {formatUnits(operatorActivationFee, 18)} ETH</button>}
          {operatorConfigured && operatorRegistry && !operatorActive && getAddress(account) === getAddress(operatorAddress) && <div className="notice">The one-time activation fee helps fund the platform's keeper and price-reporter operations. It is separate from player stakes and round fees. Confirm activation in your wallet; a direct ETH transfer does not activate your operator account.</div>}
          {operatorConfigured && getAddress(account) === getAddress(operatorAddress) && <OperatorCommunity account={account} operator={operatorAddress} chainId={chain.id} botUsername={operatorCommunityBot} signMessage={signCommunityMessage}/>}
          {!active && <button className="secondary large" disabled={!configured || !operatorConfigured || !operatorActive || !tokenVerified || status === "working"} onClick={activate}><ShieldCheck size={18}/>Activate deposit address</button>}
          <button className="primary large" disabled={!active || !operatorConfigured || !operatorActive || !tokenVerified || status === "working" || !amountValid} onClick={sendAndEnter}>{status === "working" ? <LoaderCircle className="spin" size={19}/> : <ArrowDownToLine size={19}/>}Send {amount || "0"} {stakeToken} & enter</button>
          <div className="facts"><div><span>Beneficiary</span><strong>{short(account)}</strong></div><div><span>Frontend operator</span><strong>{operatorConfigured ? short(operatorAddress) : "Missing"}</strong></div><div><span>{native ? "Native asset" : `${stakeToken} contract`}</span><strong>{tokenVerified ? "Verified" : "Checking"}</strong></div><div><span>Network</span><strong>{chain.name}</strong></div><div><span>Address reuse</span><strong>Permanent</strong></div><div><span>Unclaimed dust</span><strong>Recoverable for 1 year</strong></div></div>
        </>}
        {message && <div className={`notice ${status}`}>{status === "success" && <Check size={15}/>} {message}</div>}
        {customerBot && <div className="notice"><a href={`https://t.me/${customerBot}`} target="_blank" rel="noreferrer">Open customer bot</a>{entryReceipt && <> · <a href={`https://t.me/${customerBot}?start=${receiptStart(chain.id, entryReceipt.asset, entryReceipt.hash)}`} target="_blank" rel="noreferrer">Track this entry in Telegram</a></>}</div>}
      </aside>
    </main> : view === "markets" ? <main className="market-main"><MarketPerformance assets={enabledAssetIds.map(id => assetNames[id])}/></main> : <Swapper account={account} connectWallet={swapWallet} readClaimable={readSwapClaimable} readDistributorToken={readSwapDistributorToken} waitForReceipt={waitForSwapReceipt} apiUrl={swapperApiUrl} operatorId={swapperOperatorId} operatorAddress={operatorAddress} distributorAddress={swapDistributorAddress} expectedUsdcAddress={expectedSwapUsdcAddress} explorerUrl={swapChain.blockExplorers.default.url}/>} 
  </div>;
}
