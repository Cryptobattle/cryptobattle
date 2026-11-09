import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import {
  createPublicClient,
  fallback,
  formatEther,
  formatUnits,
  getAddress,
  http,
  isAddress,
  parseEventLogs,
  zeroAddress,
} from "viem";

const required = ["TELEGRAM_BOT_TOKEN", "TELEGRAM_ALLOWED_CHAT_IDS", "OPERATOR_ADDRESS"];
for (const name of required) if (!process.env[name]) throw new Error(`Missing ${name}`);
if (!process.env.RPC_URLS && !process.env.RPC_URL) throw new Error("Missing RPC_URLS or RPC_URL");
if (!isAddress(process.env.OPERATOR_ADDRESS) || getAddress(process.env.OPERATOR_ADDRESS) === zeroAddress) throw new Error("Invalid OPERATOR_ADDRESS");

const marketApi = (process.env.MARKET_API_URL || "").replace(/\/$/, "");
let cores = [
  ["USDC", process.env.USDC_CORE_ADDRESS],
  ["EURC", process.env.EURC_CORE_ADDRESS],
  ["WETH", process.env.WETH_CORE_ADDRESS],
  ["ETH", process.env.ETH_CORE_ADDRESS],
].filter(([, address]) => address && isAddress(address) && getAddress(address) !== zeroAddress).map(([symbol, address]) => ({ symbol, address: getAddress(address) }));
let discoveredChain;
if (cores.length === 0 && marketApi) {
  const response = await fetch(`${marketApi}/api/operator-config`, { signal: AbortSignal.timeout(10_000) });
  const config = await response.json();
  if (!response.ok || !isAddress(config.operator) || getAddress(config.operator) !== getAddress(process.env.OPERATOR_ADDRESS)) {
    throw new Error("The local API does not match this operator wallet");
  }
  cores = Object.entries(config.cores || {}).filter(([symbol, address]) => ["USDC", "EURC", "WETH", "ETH"].includes(symbol) && isAddress(address) && getAddress(address) !== zeroAddress)
    .map(([symbol, address]) => ({ symbol, address: getAddress(address) }));
  discoveredChain = config.chainId;
}
if (cores.length === 0) throw new Error("Configure core addresses or enable the local operator API");

const operator = getAddress(process.env.OPERATOR_ADDRESS);
const token = process.env.TELEGRAM_BOT_TOKEN;
const allowedChats = new Set(process.env.TELEGRAM_ALLOWED_CHAT_IDS.split(",").map((value) => value.trim()).filter(Boolean));
const rpcUrls = (process.env.RPC_URLS || process.env.RPC_URL).split(",").map((value) => value.trim()).filter(Boolean);
const transport = rpcUrls.length === 1 ? http(rpcUrls[0]) : fallback(rpcUrls.map((url) => http(url)));
const client = createPublicClient({ transport });
if (discoveredChain && await client.getChainId() !== discoveredChain) throw new Error("Operator bot RPC and local API use different networks");
const interval = Math.max(30_000, Number(process.env.POLL_INTERVAL_MS || 300_000));
const logChunk = BigInt(process.env.LOG_BLOCK_CHUNK || 2_000);
const stateFile = process.env.BOT_STATE_FILE || "/data/operator-bot-state.json";
const reportMode = (process.env.OPERATOR_TELEGRAM_REPORT_MODE || "each").toLowerCase();
const pollingEnabled = process.env.TELEGRAM_POLLING_ENABLED || "true";
if (!["true", "false"].includes(pollingEnabled)) throw new Error("TELEGRAM_POLLING_ENABLED must be true or false");
if (!["each", "hourly", "daily", "off"].includes(reportMode)) throw new Error("Invalid OPERATOR_TELEGRAM_REPORT_MODE");

const coreAbi = [
  { type: "function", name: "token", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "operatorFees", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "event", name: "RoundSettled", inputs: [{ indexed: true, name: "id", type: "bytes32" }, { indexed: true, name: "start", type: "uint64" }, { indexed: false, name: "outcome", type: "uint8" }, { indexed: false, name: "fee", type: "uint128" }, { indexed: false, name: "payoutPool", type: "uint128" }] },
  { type: "event", name: "OperatorFeeAccrued", inputs: [{ indexed: true, name: "id", type: "bytes32" }, { indexed: true, name: "start", type: "uint64" }, { indexed: true, name: "operator", type: "address" }, { indexed: false, name: "amount", type: "uint256" }] },
];
const erc20Abi = [
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "decimals", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
];

let state;
let monitoring = false;

async function telegram(method, body) {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(35_000),
  });
  if (!response.ok) throw new Error(`Telegram ${response.status}: ${await response.text()}`);
  return response.json();
}

async function send(chatId, text) {
  await telegram("sendMessage", { chat_id: chatId, text, disable_web_page_preview: true });
}

async function broadcast(text) {
  await Promise.allSettled([...allowedChats].map((chatId) => send(chatId, text)));
}

async function coreSnapshot(core) {
  const tokenAddress = await client.readContract({ address: core.address, abi: coreAbi, functionName: "token" });
  const native = getAddress(tokenAddress) === zeroAddress;
  const [fees, balance, decimals] = await Promise.all([
    client.readContract({ address: core.address, abi: coreAbi, functionName: "operatorFees", args: [operator] }),
    native
      ? client.getBalance({ address: operator })
      : client.readContract({ address: tokenAddress, abi: erc20Abi, functionName: "balanceOf", args: [operator] }),
    native
      ? Promise.resolve(18)
      : client.readContract({ address: tokenAddress, abi: erc20Abi, functionName: "decimals" }),
  ]);
  return { ...core, tokenAddress, fees, balance, decimals };
}

async function snapshots() {
  return Promise.all(cores.map(coreSnapshot));
}

async function loadState() {
  try {
    state = JSON.parse(await readFile(stateFile, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    const [block, current] = await Promise.all([client.getBlockNumber(), snapshots()]);
    state = {
      lastBlock: block.toString(),
      fees: Object.fromEntries(current.map((item) => [item.symbol, item.fees.toString()])),
    };
    await saveState();
  }
}

async function saveState() {
  await mkdir(dirname(stateFile), { recursive: true });
  const temporary = `${stateFile}.tmp`;
  await writeFile(temporary, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 });
  await rename(temporary, stateFile);
}

async function marketStatus() {
  if (!marketApi) return "not configured";
  try {
    const response = await fetch(`${marketApi}/health`, { signal: AbortSignal.timeout(5_000) });
    return response.ok ? "online" : `HTTP ${response.status}`;
  } catch {
    return "offline";
  }
}

async function statusText() {
  const [chainId, block, market] = await Promise.all([client.getChainId(), client.getBlockNumber(), marketStatus()]);
  return `CryptoBattle operator monitor\nChain ID: ${chainId}\nBlock: ${block}\nRPC providers: ${rpcUrls.length}\nOperator: ${operator}\nTracked cores: ${cores.map((core) => core.symbol).join(", ")}\nMarket API: ${market}\nMode: read-only`;
}

async function earningsText() {
  const current = await snapshots();
  return ["Unclaimed operator fees", ...current.map((item) => `${item.symbol}: ${formatUnits(item.fees, item.decimals)}`)].join("\n");
}

async function balancesText() {
  const [eth, current] = await Promise.all([client.getBalance({ address: operator }), snapshots()]);
  return [
    `Operator wallet ${operator}`,
    `ETH: ${formatEther(eth)}`,
    ...current.filter((item) => item.symbol !== "ETH").map((item) => `${item.symbol}: ${formatUnits(item.balance, item.decimals)}`),
  ].join("\n");
}

function reportPeriodMs() {
  return reportMode === "hourly" ? 3_600_000 : reportMode === "daily" ? 86_400_000 : 0;
}

function addSummarySettlement(symbol) {
  if (reportMode !== "hourly" && reportMode !== "daily") return;
  state.report ||= { since: Date.now(), settlements: {}, fees: {} };
  state.report.settlements[symbol] = (state.report.settlements[symbol] || 0) + 1;
}

function addSummaryFee(symbol, amount) {
  if (reportMode !== "hourly" && reportMode !== "daily") return;
  state.report ||= { since: Date.now(), settlements: {}, fees: {} };
  state.report.fees[symbol] = (BigInt(state.report.fees[symbol] || 0) + amount).toString();
}

async function flushSummary(current) {
  const period = reportPeriodMs();
  if (!period || !state.report || Date.now() - state.report.since < period) return;
  const decimals = Object.fromEntries(current.map((item) => [item.symbol, item.decimals]));
  const symbols = new Set([...Object.keys(state.report.settlements), ...Object.keys(state.report.fees)]);
  const lines = [...symbols].sort().map((symbol) => `${symbol}: ${state.report.settlements[symbol] || 0} settlements, ${formatUnits(BigInt(state.report.fees[symbol] || 0), decimals[symbol] || 18)} fees earned`);
  await broadcast([`CryptoBattle ${reportMode} operator summary`, `Operator: ${operator}`, ...lines].join("\n"));
  state.report = { since: Date.now(), settlements: {}, fees: {} };
}

async function monitor() {
  if (monitoring) return;
  monitoring = true;
  try {
    if (!state) await loadState();
    const latest = await client.getBlockNumber();
    let fromBlock = BigInt(state.lastBlock) + 1n;
    while (fromBlock <= latest) {
      const toBlock = fromBlock + logChunk - 1n > latest ? latest : fromBlock + logChunk - 1n;
      for (const core of cores) {
        const logs = await client.getLogs({ address: core.address, event: coreAbi[3], args: { operator }, fromBlock, toBlock });
        const events = parseEventLogs({ abi: coreAbi, logs, strict: true });
        const rounds = new Map();
        for (const event of events) {
          const key = `${event.args.id}:${event.args.start}`;
          const current = rounds.get(key) || { id: event.args.id, start: event.args.start, amount: 0n };
          current.amount += event.args.amount;
          rounds.set(key, current);
        }
        const snapshot = await coreSnapshot(core);
        for (const event of rounds.values()) {
          addSummarySettlement(core.symbol);
          addSummaryFee(core.symbol, event.amount);
          if (reportMode === "each") await broadcast(`${core.symbol} operator settlement\nStart: ${event.start}\nOperator fees earned: ${formatUnits(event.amount, snapshot.decimals)} ${core.symbol}\nRound: ${event.id}`);
        }
      }
      state.lastBlock = toBlock.toString();
      await saveState();
      fromBlock = toBlock + 1n;
    }

    const current = await snapshots();
    for (const item of current) {
      const previous = BigInt(state.fees[item.symbol] || 0);
      if (item.fees > previous) {
        // OperatorFeeAccrued logs above carry exact round attribution.
      } else if (item.fees < previous) {
        if (reportMode === "each") await broadcast(`${item.symbol} operator fee balance decreased\nPrevious: ${formatUnits(previous, item.decimals)}\nAvailable: ${formatUnits(item.fees, item.decimals)}\nA claim may have been completed.`);
      }
      state.fees[item.symbol] = item.fees.toString();
    }
    await flushSummary(current);
    await saveState();
  } catch (error) {
    console.error(new Date().toISOString(), error.shortMessage || error.message || error);
  } finally {
    monitoring = false;
  }
}

async function telegramLoop() {
  let offset = 0;
  await broadcast("CryptoBattle operator monitor online (read-only)");
  for (;;) {
    try {
      const result = await telegram("getUpdates", { offset, timeout: 25, allowed_updates: ["message"] });
      for (const update of result.result || []) {
        offset = update.update_id + 1;
        const chatId = String(update.message?.chat?.id || "");
        if (!allowedChats.has(chatId)) continue;
        const command = (update.message?.text || "").trim().split(/\s+/)[0].split("@")[0];
        if (command === "/status") await send(chatId, await statusText());
        else if (command === "/earnings") await send(chatId, await earningsText());
        else if (command === "/balances") await send(chatId, await balancesText());
        else if (command === "/help" || command === "/start") {
          await send(chatId, "/status - network and service status\n/earnings - unclaimed USDC/EURC/WETH/ETH operator fees\n/balances - operator wallet balances\n\nClaims must be confirmed in the frontend or operator wallet.");
        }
      }
    } catch (error) {
      console.error(new Date().toISOString(), "telegram", error.message || error);
      await new Promise((resolve) => setTimeout(resolve, 5_000));
    }
  }
}

await loadState();
if (pollingEnabled === "true") {
  telegramLoop().catch((error) => {
    console.error(new Date().toISOString(), "telegram stopped", error.message || error);
    process.exitCode = 1;
  });
} else {
  console.log("Telegram command polling disabled; scheduled operator-fee monitoring remains active.");
}
for (;;) {
  await monitor();
  await new Promise((resolve) => setTimeout(resolve, interval));
}
