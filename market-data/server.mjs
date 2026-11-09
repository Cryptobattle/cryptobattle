import { createServer } from "node:http";
import { createClient } from "redis";
import { customerMarkets, customerReceipt } from "./customer-api.mjs";
import {
  createPublicClient, encodeAbiParameters, encodeFunctionData, fallback, getAddress, http,
  isAddress, keccak256,
} from "viem";

const PORT = Number(process.env.PORT || 3001);
const REDIS_URL = process.env.REDIS_URL || "redis://redis:6379";
const REDIS_REQUIRED = process.env.REDIS_REQUIRED === "true";
const MARKET_DATA_BASE_URL = process.env.MARKET_DATA_BASE_URL || "https://data-api.binance.vision";
const CACHE_TTL_SECONDS = Number(process.env.CACHE_TTL_SECONDS || 300);
const POOL_CACHE_TTL_SECONDS = Math.max(5, Number(process.env.POOL_CACHE_TTL_SECONDS || 30));
const POOL_CACHE_CLEANUP_INTERVAL_SECONDS = Math.max(
  60,
  Number(process.env.POOL_CACHE_CLEANUP_INTERVAL_SECONDS || 600),
);
const ALLOWED_ORIGINS = new Set(
  (process.env.ALLOWED_ORIGINS || "http://localhost:5173,http://localhost:4175")
    .split(",").map((value) => value.trim()).filter(Boolean),
);
const PUBLIC_MARKET_CORS = process.env.PUBLIC_MARKET_CORS !== "false";
const SIX_WEEKS_MS = 42 * 24 * 60 * 60 * 1000;
const MAX_PAGE_SIZE = 50;
const VALID_ASSET_SYMBOL = /^[A-Z0-9]{2,12}$/;
const ENDUSER_BET_API_ENABLED = process.env.ENDUSER_BET_API_ENABLED === "true";
const ENDUSER_SWAP_API_ENABLED = process.env.ENDUSER_SWAP_API_ENABLED === "true";
const SWAP_API_URL = (process.env.SWAP_API_URL || "").replace(/\/$/, "");
const OPERATOR_ADDRESS = process.env.OPERATOR_ADDRESS && isAddress(process.env.OPERATOR_ADDRESS)
  ? getAddress(process.env.OPERATOR_ADDRESS) : undefined;
const SWAP_OPERATOR_ID = process.env.SWAP_OPERATOR_ID || (OPERATOR_ADDRESS ? `op_${OPERATOR_ADDRESS.slice(2).toLowerCase()}` : "");
const DURATIONS = new Map([
  [60, { interval: "1m", sourceMs: 60_000 }],
  [600, { interval: "5m", sourceMs: 300_000 }],
  [3600, { interval: "1h", sourceMs: 3_600_000 }],
  [86400, { interval: "1d", sourceMs: 86_400_000 }],
  [604800, { interval: "1d", sourceMs: 86_400_000 }],
  [2592000, { interval: "1d", sourceMs: 86_400_000 }],
]);
const ROUND_DURATIONS = new Set(DURATIONS.keys());
const RPC_URLS = (process.env.RPC_URLS || process.env.RPC_URL || "")
  .split(",").map((value) => value.trim()).filter(Boolean);
const CORE_ADDRESSES = new Map(
  ["USDC", "EURC", "WETH", "ETH"]
    .map((symbol) => [symbol, process.env[`${symbol}_CORE_ADDRESS`]])
    .filter(([, address]) => address)
    .map(([symbol, address]) => [symbol, getAddress(address)]),
);
const FACTORY_ADDRESSES = new Map(
  ["USDC", "EURC", "WETH", "ETH"]
    .map((symbol) => [symbol, process.env[`${symbol}_FACTORY_ADDRESS`]])
    .filter(([, address]) => address && isAddress(address))
    .map(([symbol, address]) => [symbol, getAddress(address)]),
);
const TOKEN_ADDRESSES = new Map(
  ["USDC", "EURC", "WETH"]
    .map((symbol) => [symbol, process.env[`${symbol}_TOKEN_ADDRESS`]])
    .filter(([, address]) => address && isAddress(address))
    .map(([symbol, address]) => [symbol, getAddress(address)]),
);
const rpcTransport = RPC_URLS.length > 1
  ? fallback(RPC_URLS.map((url) => http(url)))
  : RPC_URLS.length === 1 ? http(RPC_URLS[0]) : undefined;
const publicClient = rpcTransport ? createPublicClient({ transport: rpcTransport }) : undefined;
const roundTotalsAbi = [{
  type: "function",
  name: "roundTotals",
  stateMutability: "view",
  inputs: [{ name: "id", type: "bytes32" }, { name: "start", type: "uint64" }],
  outputs: [
    { name: "totalA", type: "uint128" },
    { name: "totalB", type: "uint128" },
    { name: "matchedPerSide", type: "uint128" },
  ],
}];
const depositKeyComponents = [
  { name: "assetA", type: "uint16" }, { name: "assetB", type: "uint16" },
  { name: "duration", type: "uint32" }, { name: "sideB", type: "bool" },
  { name: "beneficiary", type: "address" }, { name: "operator", type: "address" },
];
const factoryAbi = [
  { type: "function", name: "core", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "token", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "predict", stateMutability: "view", inputs: [{ name: "key", type: "tuple", components: depositKeyComponents }], outputs: [{ type: "address" }] },
  { type: "function", name: "predictPersonal", stateMutability: "view", inputs: [{ name: "key", type: "tuple", components: depositKeyComponents }], outputs: [{ type: "address" }] },
  { type: "function", name: "deploy", stateMutability: "nonpayable", inputs: [{ name: "key", type: "tuple", components: depositKeyComponents }], outputs: [{ type: "address" }] },
  { type: "function", name: "deployPersonal", stateMutability: "nonpayable", inputs: [{ name: "key", type: "tuple", components: depositKeyComponents }], outputs: [{ type: "address" }] },
];
const coreReadAbi = [
  { type: "function", name: "minDeposit", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "roundInfo", stateMutability: "view", inputs: [{ type: "bytes32" }, { type: "uint64" }], outputs: [{ type: "uint64" }, { type: "uint64" }, { type: "bool" }, { type: "uint8" }, { type: "uint128" }, { type: "uint256" }, { type: "uint256" }] },
  { type: "function", name: "betInfo", stateMutability: "view", inputs: [{ type: "bytes32" }, { type: "uint64" }, { type: "bool" }, { type: "uint256" }], outputs: [{ type: "address" }, { type: "uint128" }, { type: "uint128" }, { type: "uint8" }, { type: "bool" }, { type: "bool" }] },
];
const erc20TransferAbi = [{ type: "function", name: "transfer", stateMutability: "nonpayable", inputs: [{ type: "address" }, { type: "uint256" }], outputs: [{ type: "bool" }] }];
const proxyAbi = [{ type: "function", name: "process", stateMutability: "nonpayable", inputs: [], outputs: [] }];

let configuredChainId;
if (process.env.DISCOVER_FACTORY_CONFIG === "true") {
  if (!publicClient) throw new Error("Factory discovery requires RPC_URLS");
  const expected = { base: 8453, baseSepolia: 84532 }[process.env.EXPECTED_NETWORK];
  if (!expected) throw new Error("EXPECTED_NETWORK must be base or baseSepolia");
  configuredChainId = await publicClient.getChainId();
  if (configuredChainId !== expected) throw new Error(`RPC network mismatch: expected ${expected}, got ${configuredChainId}`);
  const assets = (process.env.ENABLED_SETTLEMENT_ASSETS || "USDC,ETH").split(",").map(value => value.trim().toUpperCase());
  if (assets.some(asset => !["USDC", "EURC", "WETH", "ETH"].includes(asset))) throw new Error("Invalid ENABLED_SETTLEMENT_ASSETS");
  for (const asset of new Set(assets)) {
    const factory = FACTORY_ADDRESSES.get(asset);
    if (!factory) throw new Error(`Missing ${asset}_FACTORY_ADDRESS`);
    const [core, token] = await Promise.all([
      publicClient.readContract({ address: factory, abi: factoryAbi, functionName: "core" }),
      publicClient.readContract({ address: factory, abi: factoryAbi, functionName: "token" }),
    ]);
    const coreToken = await publicClient.readContract({ address: core, abi: factoryAbi, functionName: "token" });
    if (getAddress(token) !== getAddress(coreToken) || (asset === "ETH") !== (BigInt(token) === 0n)) {
      throw new Error(`${asset} factory and core token configuration do not match`);
    }
    CORE_ADDRESSES.set(asset, getAddress(core));
    if (asset !== "ETH") TOKEN_ADDRESSES.set(asset, getAddress(token));
  }
}

const memoryCache = new Map();
const poolRequests = new Map();
const redis = createClient({ url: REDIS_URL, socket: { reconnectStrategy: false } });
redis.on("error", (error) => console.error(new Date().toISOString(), "redis", error.message));
try {
  await redis.connect();
} catch (error) {
  if (REDIS_REQUIRED) throw error;
  console.warn(new Date().toISOString(), "Redis unavailable; using the in-memory development cache");
}

async function cacheGet(key) {
  if (redis.isReady) return redis.get(key);
  const entry = memoryCache.get(key);
  if (!entry || entry.expiresAt <= Date.now()) {
    memoryCache.delete(key);
    return null;
  }
  return entry.value;
}

async function cacheSet(key, value, ttlSeconds = CACHE_TTL_SECONDS) {
  if (redis.isReady) return redis.set(key, value, { EX: ttlSeconds });
  memoryCache.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

async function cleanupCaches() {
  const now = Date.now();
  for (const [key, entry] of memoryCache) {
    if (entry.expiresAt <= now) memoryCache.delete(key);
  }
  if (!redis.isReady) return;
  for await (const keys of redis.scanIterator({ MATCH: "round-pool:v1:*", COUNT: 100 })) {
    const batch = Array.isArray(keys) ? keys : [keys];
    const expirations = await Promise.all(batch.map((key) => redis.ttl(key)));
    const invalid = batch.filter((_, index) => expirations[index] < 0);
    if (invalid.length) await redis.del(invalid);
  }
}

function corsOrigin(origin, method, pathname) {
  if (PUBLIC_MARKET_CORS && method === "GET" && ["/health", "/api/performance", "/api/round-pool"].includes(pathname)) return "*";
  return origin && ALLOWED_ORIGINS.has(origin) ? origin : "";
}

function json(response, status, body, allowedOrigin, extraHeaders = {}) {
  const headers = {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    ...extraHeaders,
  };
  if (allowedOrigin) headers["access-control-allow-origin"] = allowedOrigin;
  response.writeHead(status, headers);
  response.end(JSON.stringify(body));
}

async function requestBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 32_768) throw new Error("Request body is too large");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

function validPair(assetA, assetB, duration) {
  return Number.isInteger(assetA) && Number.isInteger(assetB) && assetA >= 0
    && assetB <= 65_534 && assetA < assetB && ROUND_DURATIONS.has(duration);
}

async function betIntent(body) {
  if (!ENDUSER_BET_API_ENABLED) return { status: 404, body: { error: "Bet API is disabled" } };
  if (!publicClient || !OPERATOR_ADDRESS) return { status: 503, body: { error: "Bet API is not configured" } };
  const settlementAsset = String(body.settlementAsset || "").toUpperCase();
  const core = CORE_ADDRESSES.get(settlementAsset);
  const factory = FACTORY_ADDRESSES.get(settlementAsset);
  const beneficiary = body.beneficiary;
  const assetA = Number(body.assetA);
  const assetB = Number(body.assetB);
  const duration = Number(body.duration);
  const sideB = body.side === "B" || body.sideB === true;
  if (!core || !factory || !isAddress(beneficiary) || !["A", "B"].includes(body.side) || !validPair(assetA, assetB, duration)) {
    return { status: 400, body: { error: "Invalid settlement asset, beneficiary, pair or duration" } };
  }
  const key = { assetA, assetB, duration, sideB, beneficiary: getAddress(beneficiary), operator: OPERATOR_ADDRESS };
  const personalEth = settlementAsset === "ETH" && process.env.ETH_ADDRESS_MODE === "personal";
  const predictFunction = personalEth ? "predictPersonal" : "predict";
  const deployFunction = personalEth ? "deployPersonal" : "deploy";
  const [depositAddress, minimumDeposit, chainId] = await Promise.all([
    publicClient.readContract({ address: factory, abi: factoryAbi, functionName: predictFunction, args: [key] }),
    publicClient.readContract({ address: core, abi: coreReadAbi, functionName: "minDeposit" }),
    publicClient.getChainId(),
  ]);
  const amountText = String(body.amountAtomic || "");
  if (!/^\d+$/.test(amountText)) return { status: 400, body: { error: "amountAtomic must be an integer string" } };
  const amount = BigInt(amountText);
  if (amount < minimumDeposit) return { status: 400, body: { error: "Amount is below the on-chain minimum", minimumDeposit: minimumDeposit.toString() } };
  const code = await publicClient.getCode({ address: depositAddress });
  const deployed = Boolean(code && code !== "0x");
  const transactions = [];
  if (!deployed) transactions.push({ purpose: "deploy deposit address", to: factory, data: encodeFunctionData({ abi: factoryAbi, functionName: deployFunction, args: [key] }), value: "0" });
  if (settlementAsset === "ETH") {
    transactions.push({ purpose: "deposit native ETH", to: depositAddress, data: "0x", value: amount.toString() });
    if (personalEth) transactions.push({ purpose: "process deposit", to: depositAddress, data: encodeFunctionData({ abi: proxyAbi, functionName: "process" }), value: "0" });
  } else {
    const token = TOKEN_ADDRESSES.get(settlementAsset);
    if (!token) return { status: 503, body: { error: `${settlementAsset}_TOKEN_ADDRESS is not configured` } };
    transactions.push({ purpose: "transfer settlement token", to: token, data: encodeFunctionData({ abi: erc20TransferAbi, functionName: "transfer", args: [depositAddress, amount] }), value: "0" });
    transactions.push({ purpose: "process deposit", to: depositAddress, data: encodeFunctionData({ abi: proxyAbi, functionName: "process" }), value: "0" });
  }
  const start = selectedRoundStart(duration, Math.floor(Date.now() / 1000));
  const id = keccak256(encodeAbiParameters([{ type: "uint16" }, { type: "uint16" }, { type: "uint32" }], [assetA, assetB, duration]));
  return { status: 200, body: { chainId, settlementAsset, operator: OPERATOR_ADDRESS, key, depositAddress, deployed, minimumDeposit: minimumDeposit.toString(), amountAtomic: amount.toString(), round: { id, expectedStart: start, expectedEnd: start + duration }, transactions } };
}

async function betStatus(searchParams) {
  if (!ENDUSER_BET_API_ENABLED) return { status: 404, body: { error: "Bet API is disabled" } };
  if (!publicClient) return { status: 503, body: { error: "Bet API RPC is not configured" } };
  const settlementAsset = (searchParams.get("settlementAsset") || "").toUpperCase();
  const core = CORE_ADDRESSES.get(settlementAsset);
  const id = searchParams.get("id");
  const start = BigInt(searchParams.get("start") || "0");
  const sideB = searchParams.get("side") === "B";
  const index = BigInt(searchParams.get("index") || "-1");
  if (!core || !/^0x[0-9a-fA-F]{64}$/.test(id || "") || start <= 0n || index < 0n) return { status: 400, body: { error: "Invalid bet reference" } };
  const [round, bet] = await Promise.all([
    publicClient.readContract({ address: core, abi: coreReadAbi, functionName: "roundInfo", args: [id, start] }),
    publicClient.readContract({ address: core, abi: coreReadAbi, functionName: "betInfo", args: [id, start, sideB, index] }),
  ]);
  const [, end, settled, outcome] = round;
  const [beneficiary, amount, matched, rollovers, paid, unmatchedHandled] = bet;
  let result = "pending";
  // Matching is allocated lazily by rollover processing, even after a round is settled.
  if (settled && unmatchedHandled) result = matched === 0n ? "unmatched" : Number(outcome) === 3 ? "draw" : (Number(outcome) === (sideB ? 2 : 1) ? "won" : "lost");
  return { status: 200, body: { settlementAsset, id, start: start.toString(), end: end.toString(), side: sideB ? "B" : "A", index: index.toString(), beneficiary, amount: amount.toString(), matched: matched.toString(), rollovers, paid, unmatchedHandled, settled, outcome, result } };
}

async function proxySwap(request, url) {
  if (!ENDUSER_SWAP_API_ENABLED) return { status: 404, body: { error: "Swap API is disabled" } };
  if (!SWAP_API_URL) return { status: 503, body: { error: "Swap API is not configured" } };
  const suffix = url.pathname.slice("/api/v1/swap".length) || "/";
  const readable = suffix === "/coins" || suffix === "/pair" || /^\/shifts\/[a-zA-Z0-9-]+$/.test(suffix);
  if (!(request.method === "GET" && readable) && !(request.method === "POST" && suffix === "/shifts/variable")) {
    return { status: 404, body: { error: "Swap endpoint is not exposed" } };
  }
  if (!/^op_[a-zA-Z0-9_-]{4,48}$/.test(SWAP_OPERATOR_ID)) return { status: 503, body: { error: "Swap operator is not configured" } };
  if (request.method === "POST") await requestBody(request);
  const target = new URL(SWAP_API_URL);
  if (!["https:", "http:"].includes(target.protocol) || target.username || target.password) {
    return { status: 503, body: { error: "Invalid Swap Worker URL" } };
  }
  target.pathname = `${target.pathname.replace(/\/$/, "")}/api/v1/operators/${SWAP_OPERATOR_ID}/swap${suffix}`;
  target.search = url.search;
  target.hash = "";
  // The user's client follows this redirect, so Cloudflare receives its IP directly.
  return { status: 307, headers: { location: target.href }, body: { redirect: target.href, operator: SWAP_OPERATOR_ID } };
}

async function klines(asset, interval, startTime, endTime) {
  const url = new URL("/api/v3/klines", MARKET_DATA_BASE_URL);
  url.searchParams.set("symbol", `${asset}USDT`);
  url.searchParams.set("interval", interval);
  url.searchParams.set("startTime", String(startTime));
  url.searchParams.set("endTime", String(endTime - 1));
  url.searchParams.set("limit", "1000");
  const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error(`Market data provider returned ${response.status}`);
  const rows = await response.json();
  if (!Array.isArray(rows)) throw new Error("Invalid market data response");
  return rows.map((row) => ({
    openTime: Number(row[0]),
    open: Number(row[1]),
    close: Number(row[4]),
    closeTime: Number(row[6]),
  })).filter((row) => Number.isFinite(row.open) && Number.isFinite(row.close));
}

function windowResult(start, end, candlesA, candlesB, assetA, assetB) {
  const select = (candles) => candles.filter((candle) => candle.openTime >= start && candle.closeTime < end + 1);
  const a = select(candlesA);
  const b = select(candlesB);
  if (a.length === 0 || b.length === 0) return undefined;
  const aOpen = a[0].open;
  const aClose = a[a.length - 1].close;
  const bOpen = b[0].open;
  const bClose = b[b.length - 1].close;
  const performanceA = (aClose / aOpen - 1) * 100;
  const performanceB = (bClose / bOpen - 1) * 100;
  return {
    start,
    end,
    assetA: { symbol: assetA, open: aOpen, close: aClose, performance: performanceA },
    assetB: { symbol: assetB, open: bOpen, close: bClose, performance: performanceB },
    winner: performanceA === performanceB ? null : performanceA > performanceB ? assetA : assetB,
  };
}

async function performance(searchParams) {
  const assetA = (searchParams.get("assetA") || "").toUpperCase();
  const assetB = (searchParams.get("assetB") || "").toUpperCase();
  const duration = Number(searchParams.get("duration"));
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(searchParams.get("limit") || 12)));
  const requestedBefore = Number(searchParams.get("before") || Date.now());
  if (!VALID_ASSET_SYMBOL.test(assetA) || !VALID_ASSET_SYMBOL.test(assetB) || assetA === assetB || !DURATIONS.has(duration)) {
    return { status: 400, body: { error: "Invalid asset pair or duration" } };
  }
  if (!Number.isFinite(requestedBefore)) return { status: 400, body: { error: "Invalid cursor" } };

  const now = Date.now();
  const oldest = now - SIX_WEEKS_MS;
  const durationMs = duration * 1000;
  const before = Math.min(now, requestedBefore);
  const alignedEnd = Math.floor(before / durationMs) * durationMs;
  const start = Math.max(oldest, alignedEnd - durationMs * limit);
  if (alignedEnd <= oldest || start >= alignedEnd) {
    return { status: 200, body: { periods: [], nextCursor: null, hasMore: false } };
  }

  const key = `performance:v1:${assetA}:${assetB}:${duration}:${alignedEnd}:${limit}`;
  const cached = await cacheGet(key);
  if (cached) return { status: 200, body: JSON.parse(cached) };

  const source = DURATIONS.get(duration);
  const expectedCandles = Math.ceil((alignedEnd - start) / source.sourceMs);
  if (expectedCandles > 1000) return { status: 400, body: { error: "Requested page is too large" } };
  const [candlesA, candlesB] = await Promise.all([
    klines(assetA, source.interval, start, alignedEnd),
    klines(assetB, source.interval, start, alignedEnd),
  ]);

  const periods = [];
  for (let end = alignedEnd; end > start && periods.length < limit; end -= durationMs) {
    const periodStart = end - durationMs;
    if (periodStart < oldest || periodStart < start) break;
    const row = windowResult(periodStart, end, candlesA, candlesB, assetA, assetB);
    if (row) periods.push(row);
  }
  const nextCursor = periods.length === 0 ? null : periods[periods.length - 1].start;
  const body = {
    pair: `${assetA}/${assetB}`,
    duration,
    periods,
    nextCursor,
    hasMore: nextCursor !== null && nextCursor > oldest,
    rangeStart: oldest,
    rangeEnd: now,
    source: "Binance Spot USDT markets",
    cachedAt: now,
  };
  await cacheSet(key, JSON.stringify(body));
  return { status: 200, body };
}

function selectedRoundStart(duration, timestamp) {
  const current = Math.floor(timestamp / duration) * duration;
  const entryWindow = new Map([[60, 30], [600, 120], [3600, 600], [86400, 7200], [604800, 86400], [2592000, 259200]]).get(duration);
  return timestamp < current + entryWindow ? current : current + duration;
}

async function roundPool(searchParams) {
  const settlementAsset = (searchParams.get("settlementAsset") || "").toUpperCase();
  const assetA = Number(searchParams.get("assetA"));
  const assetB = Number(searchParams.get("assetB"));
  const duration = Number(searchParams.get("duration"));
  const core = CORE_ADDRESSES.get(settlementAsset);
  if (
    !core || !Number.isInteger(assetA) || !Number.isInteger(assetB)
      || assetA < 0 || assetB > 65_534 || assetA >= assetB || !ROUND_DURATIONS.has(duration)
  ) {
    return { status: 400, body: { error: "Invalid settlement asset, pair or duration" } };
  }
  if (!publicClient) return { status: 503, body: { error: "Pool RPC is not configured" } };

  const timestamp = Math.floor(Date.now() / 1000);
  const start = selectedRoundStart(duration, timestamp);
  const id = keccak256(encodeAbiParameters(
    [{ type: "uint16" }, { type: "uint16" }, { type: "uint32" }],
    [assetA, assetB, duration],
  ));
  const key = `round-pool:v1:${core.toLowerCase()}:${id}:${start}`;
  const cached = await cacheGet(key);
  if (cached) return { status: 200, body: JSON.parse(cached) };

  let pending = poolRequests.get(key);
  if (!pending) {
    pending = (async () => {
      const [totalA, totalB, matchedPerSide] = await publicClient.readContract({
        address: core,
        abi: roundTotalsAbi,
        functionName: "roundTotals",
        args: [id, BigInt(start)],
      });
      const body = {
        settlementAsset,
        assetA,
        assetB,
        duration,
        start,
        end: start + duration,
        totalA: totalA.toString(),
        totalB: totalB.toString(),
        matchedPerSide: matchedPerSide.toString(),
        cachedAt: Date.now(),
      };
      await cacheSet(key, JSON.stringify(body), POOL_CACHE_TTL_SECONDS);
      return body;
    })().finally(() => poolRequests.delete(key));
    poolRequests.set(key, pending);
  }
  return { status: 200, body: await pending };
}

const server = createServer(async (request, response) => {
  const origin = request.headers.origin;
  try {
    const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
    const allowedOrigin = corsOrigin(origin, request.method || "GET", url.pathname);
    if (request.method === "OPTIONS") {
      const requestedMethod = request.headers["access-control-request-method"] || "GET";
      response.writeHead(204, {
        "access-control-allow-origin": corsOrigin(origin, requestedMethod, url.pathname),
        "access-control-allow-methods": "GET, POST, OPTIONS",
        "access-control-allow-headers": "content-type",
      });
      return response.end();
    }
    if (request.method === "GET" && url.pathname === "/health") {
      const redisHealthy = redis.isReady && await redis.ping() === "PONG";
      return json(response, 200, { status: "ok", cache: redisHealthy ? "redis" : "memory" }, allowedOrigin);
    }
    if (request.method === "GET" && url.pathname === "/api/operator-config") {
      if (!OPERATOR_ADDRESS || !publicClient) return json(response, 503, { error: "Operator configuration unavailable" }, allowedOrigin);
      return json(response, 200, {
        operator: OPERATOR_ADDRESS, chainId: configuredChainId ?? await publicClient.getChainId(),
        cores: Object.fromEntries(CORE_ADDRESSES), tokens: Object.fromEntries(TOKEN_ADDRESSES),
      }, allowedOrigin);
    }
    if (request.method === "GET" && url.pathname === "/api/performance") {
      const result = await performance(url.searchParams);
      return json(response, result.status, result.body, allowedOrigin);
    }
    if (request.method === "GET" && url.pathname === "/api/round-pool") {
      const result = await roundPool(url.searchParams);
      return json(response, result.status, result.body, allowedOrigin);
    }
    if (request.method === "POST" && url.pathname === "/api/v1/bets/intent") {
      const result = await betIntent(await requestBody(request));
      return json(response, result.status, result.body, allowedOrigin);
    }
    if (request.method === "GET" && url.pathname === "/api/v1/bets/markets") {
      if (!ENDUSER_BET_API_ENABLED) return json(response, 404, { error: "Bet API is disabled" }, allowedOrigin);
      if (!publicClient || !OPERATOR_ADDRESS) return json(response, 503, { error: "Bet API is not configured" }, allowedOrigin);
      const key = `customer-markets:v1:${[...CORE_ADDRESSES.values()].join(":")}`;
      let body = await cacheGet(key);
      if (body) body = JSON.parse(body);
      else { body = { ...(await customerMarkets(publicClient, CORE_ADDRESSES)), chainId: await publicClient.getChainId(), operator: OPERATOR_ADDRESS }; await cacheSet(key, JSON.stringify(body), 30); }
      return json(response, 200, body, allowedOrigin);
    }
    if (request.method === "GET" && url.pathname === "/api/v1/bets/receipt") {
      if (!ENDUSER_BET_API_ENABLED) return json(response, 404, { error: "Bet API is disabled" }, allowedOrigin);
      if (!publicClient || !OPERATOR_ADDRESS) return json(response, 503, { error: "Bet API is not configured" }, allowedOrigin);
      const result = await customerReceipt(publicClient, CORE_ADDRESSES, OPERATOR_ADDRESS, url.searchParams);
      return json(response, result.status, result.body, allowedOrigin);
    }
    if (request.method === "GET" && url.pathname === "/api/v1/bets/status") {
      const result = await betStatus(url.searchParams);
      return json(response, result.status, result.body, allowedOrigin);
    }
    if ((request.method === "GET" || request.method === "POST") && url.pathname.startsWith("/api/v1/swap")) {
      const result = await proxySwap(request, url);
      return json(response, result.status, result.body, allowedOrigin, result.headers);
    }
    return json(response, 404, { error: "Not found" }, allowedOrigin);
  } catch (error) {
    console.error(new Date().toISOString(), error);
    return json(response, 502, { error: "Market data is temporarily unavailable" }, "");
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`CryptoBattle market data listening on :${server.address().port}`);
});
const cleanupTimer = setInterval(() => {
  void cleanupCaches().catch((error) => {
    console.error(new Date().toISOString(), "cache cleanup", error.message);
  });
}, POOL_CACHE_CLEANUP_INTERVAL_SECONDS * 1000);
cleanupTimer.unref();

async function shutdown() {
  clearInterval(cleanupTimer);
  server.close();
  if (redis.isOpen) await redis.quit();
  process.exit(0);
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
