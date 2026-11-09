import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:http";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { encodeAbiParameters, parseAbiParameters, toFunctionSelector, stringToHex } from "viem";

const operator = "0x1111111111111111111111111111111111111111";
const user = "0x2222222222222222222222222222222222222222";
const core = "0x3333333333333333333333333333333333333333";
const factory = "0x4444444444444444444444444444444444444444";
const token = "0x5555555555555555555555555555555555555555";
const deposit = "0x6666666666666666666666666666666666666666";
const operatorId = `op_${operator.slice(2)}`;

async function listen(handler) {
  const server = createServer(handler);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  return { url: `http://127.0.0.1:${server.address().port}`, close: () => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }) };
}

async function body(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString() || "{}");
}

async function startApi({ rpc, swap, bets = true, swaps = true, publicMarketCors = true, discover = false }) {
  const child = spawn(process.execPath, [fileURLToPath(new URL("./server.mjs", import.meta.url))], {
    env: {
      ...process.env, PORT: "0", REDIS_URL: "redis://127.0.0.1:1", REDIS_REQUIRED: "false",
      DISCOVER_FACTORY_CONFIG: String(discover), EXPECTED_NETWORK: "baseSepolia", ENABLED_SETTLEMENT_ASSETS: "USDC",
      RPC_URLS: rpc, OPERATOR_ADDRESS: operator, USDC_CORE_ADDRESS: core,
      USDC_FACTORY_ADDRESS: factory, USDC_TOKEN_ADDRESS: token,
      EURC_CORE_ADDRESS: "", WETH_CORE_ADDRESS: "", ETH_CORE_ADDRESS: "",
      ENDUSER_BET_API_ENABLED: String(bets), ENDUSER_SWAP_API_ENABLED: String(swaps),
      SWAP_API_URL: swap, SWAP_OPERATOR_ID: "",
      PUBLIC_MARKET_CORS: String(publicMarketCors), ALLOWED_ORIGINS: "http://localhost:8080",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let errors = "";
  child.stderr.on("data", chunk => { errors += chunk.toString(); });
  const url = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => { child.kill("SIGKILL"); reject(new Error(`API startup timed out: ${errors}`)); }, 10_000);
    child.on("error", error => { clearTimeout(timer); reject(error); });
    child.on("exit", code => { clearTimeout(timer); reject(new Error(`API exited ${code}: ${errors}`)); });
    child.stdout.on("data", chunk => {
      const match = chunk.toString().match(/listening on :(\d+)/);
      if (match) { clearTimeout(timer); resolve(`http://127.0.0.1:${match[1]}`); }
    });
  });
  return { url, close: async () => { const exited = once(child, "exit"); child.kill("SIGTERM"); await exited; } };
}

test("Bet and Swap APIs honor all four independent enable/disable combinations", async () => {
  let forwarded = 0;
  const upstream = await listen((_request, response) => { forwarded++; response.setHeader("content-type", "application/json"); response.end("[]"); });
  try {
    for (const bets of [false, true]) for (const swaps of [false, true]) {
      const api = await startApi({ rpc: upstream.url, swap: upstream.url, bets, swaps });
      try {
        const intent = await fetch(`${api.url}/api/v1/bets/intent`, { method: "POST", body: "{}" });
        assert.equal(intent.status, bets ? 400 : 404);
        const status = await fetch(`${api.url}/api/v1/bets/status`);
        assert.equal(status.status, bets ? 400 : 404);
        if (!bets) for (const path of ["markets", "receipt"]) assert.equal((await fetch(`${api.url}/api/v1/bets/${path}`)).status, 404);
        const before = forwarded;
        const coins = await fetch(`${api.url}/api/v1/swap/coins`, { redirect: "manual" });
        assert.equal(coins.status, swaps ? 307 : 404);
        assert.equal(forwarded - before, 0);
        if (swaps) {
          assert.equal(coins.headers.get("location"), `${upstream.url}/api/v1/operators/${operatorId}/swap/coins`);
          assert.equal((await fetch(coins.headers.get("location"))).status, 200);
        }
      } finally { await api.close(); }
    }
  } finally { await upstream.close(); }
});

test("local operator configuration discovers and cross-checks core and token from the factory", async () => {
  const rpc = await listen(async (request, response) => {
    const input = await body(request);
    let result;
    if (input.method === 'eth_chainId') result = '0x14a34';
    else {
      const selector = input.params[0].data.slice(0, 10);
      assert.ok([toFunctionSelector('core()'), toFunctionSelector('token()')].includes(selector));
      result = encodeAbiParameters(parseAbiParameters('address'), [selector === toFunctionSelector('core()') ? core : token]);
    }
    response.setHeader('content-type', 'application/json');
    response.end(JSON.stringify({ jsonrpc: '2.0', id: input.id, result }));
  });
  try {
    const api = await startApi({ rpc: rpc.url, swap: '', swaps: false, discover: true });
    try {
      const result = await (await fetch(`${api.url}/api/operator-config`)).json();
      assert.equal(result.chainId, 84532);
      assert.equal(result.operator, operator);
      assert.equal(result.cores.USDC, core);
      assert.equal(result.tokens.USDC, token);
      assert.equal(JSON.stringify(result).includes(rpc.url), false);
    } finally { await api.close(); }
  } finally { await rpc.close(); }
});

test("Swap redirect binds the operator URL and preserves the client's POST without a shared secret", async () => {
  const forwarded = [];
  const upstream = await listen(async (request, response) => {
    forwarded.push({ path: request.url, headers: request.headers, payload: await body(request) });
    response.setHeader("content-type", "application/json");
    response.end('{"id":"mock-shift"}');
  });
  const api = await startApi({ rpc: upstream.url, swap: upstream.url });
  try {
    const response = await fetch(`${api.url}/api/v1/swap/shifts/variable`, {
      redirect: "manual",
      method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": "198.51.100.5, 203.0.113.9", "cf-connecting-ip": "192.0.2.99" },
      body: JSON.stringify({ operatorId: "op_attacker", settleAddress: user }),
    });
    assert.equal(response.status, 307);
    assert.equal(forwarded.length, 0);
    assert.equal(response.headers.get("location"), `${upstream.url}/api/v1/operators/${operatorId}/swap/shifts/variable`);
    const followed = await fetch(`${api.url}/api/v1/swap/shifts/variable`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ operatorId: "op_attacker", settleAddress: user }),
    });
    assert.equal(followed.status, 200);
    assert.equal(forwarded[0].path, `/api/v1/operators/${operatorId}/swap/shifts/variable`);
    // The redirect preserves the original POST; the real Worker binds attribution from its URL.
    assert.equal(forwarded[0].payload.operatorId, "op_attacker");
    assert.equal(forwarded[0].payload.settleAddress, user);
    assert.equal(forwarded[0].headers["x-cryptobattle-proxy-secret"], undefined);
    assert.equal(forwarded[0].headers["x-cryptobattle-client-ip"], undefined);
    assert.equal((await fetch(`${api.url}/api/v1/swap/admin/operators`)).status, 404);
    assert.equal((await fetch(`${api.url}/api/v1/swap/coins`, { method: "POST", body: "{}" })).status, 404);
    assert.equal(forwarded.length, 1);
  } finally { await api.close(); await upstream.close(); }
});

test("Bet intent returns unsigned transactions, actual chain ID and the fixed operator", async () => {
  const methods = [];
  const rpc = await listen(async (request, response) => {
    const input = await body(request);
    methods.push(input.method);
    let result;
    if (input.method === "eth_chainId") result = "0x14a34";
    else if (input.method === "eth_getCode") result = "0x";
    else if (input.method === "eth_call") {
      const selector = input.params[0].data.slice(0, 10);
      if (selector === toFunctionSelector("minDeposit()")) result = encodeAbiParameters(parseAbiParameters("uint256"), [50_000_000n]);
      else result = encodeAbiParameters(parseAbiParameters("address"), [deposit]);
    }
    response.setHeader("content-type", "application/json");
    response.end(JSON.stringify({ jsonrpc: "2.0", id: input.id, result }));
  });
  const api = await startApi({ rpc: rpc.url, swap: rpc.url });
  try {
    const response = await fetch(`${api.url}/api/v1/bets/intent`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ settlementAsset: "USDC", beneficiary: user, operator: user, assetA: 0, assetB: 1, duration: 600, side: "A", amountAtomic: "50000000" }),
    });
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.chainId, 84532);
    assert.equal(result.key.operator, operator);
    assert.equal(result.depositAddress, deposit);
    assert.equal(result.deployed, false);
    assert.deepEqual(result.transactions.map(tx => tx.to), [factory, token, deposit]);
    assert.ok(methods.every(method => ["eth_call", "eth_chainId", "eth_getCode"].includes(method)));
  } finally { await api.close(); await rpc.close(); }
});

test("Bet status waits for matching allocation before reporting a final result", async () => {
  let sample;
  const rpc = await listen(async (request, response) => {
    const input = await body(request);
    const isRound = input.params[0].data.startsWith(toFunctionSelector("roundInfo(bytes32,uint64)"));
    const result = isRound
      ? encodeAbiParameters(parseAbiParameters("uint64,uint64,bool,uint8,uint128,uint256,uint256"), [100n, 700n, true, sample.outcome, 50_000_000n, 1n, 1n])
      : encodeAbiParameters(parseAbiParameters("address,uint128,uint128,uint8,bool,bool"), [user, 50_000_000n, sample.matched, 0, false, sample.handled]);
    response.setHeader("content-type", "application/json");
    response.end(JSON.stringify({ jsonrpc: "2.0", id: input.id, result }));
  });
  const api = await startApi({ rpc: rpc.url, swap: rpc.url });
  try {
    for (sample of [
      { handled: false, matched: 0n, outcome: 1, side: "A", expected: "pending" },
      { handled: true, matched: 0n, outcome: 3, side: "A", expected: "unmatched" },
      { handled: true, matched: 50_000_000n, outcome: 3, side: "A", expected: "draw" },
      { handled: true, matched: 50_000_000n, outcome: 1, side: "A", expected: "won" },
      { handled: true, matched: 50_000_000n, outcome: 2, side: "A", expected: "lost" },
      { handled: true, matched: 50_000_000n, outcome: 2, side: "B", expected: "won" },
    ]) {
      const query = new URLSearchParams({ settlementAsset: "USDC", id: `0x${"ab".repeat(32)}`, start: "100", side: sample.side, index: "0" });
      const response = await fetch(`${api.url}/api/v1/bets/status?${query}`);
      assert.equal(response.status, 200);
      assert.equal((await response.json()).result, sample.expected);
    }
  } finally { await api.close(); await rpc.close(); }
});

test("shared pool reads permit the operator origin and reuse the same cached RPC result", async () => {
  let calls = 0;
  const rpc = await listen(async (request, response) => {
    const input = await body(request);
    calls++;
    const result = encodeAbiParameters(parseAbiParameters("uint128,uint128,uint128"), [50_000_000n, 100_000_000n, 50_000_000n]);
    response.setHeader("content-type", "application/json");
    response.end(JSON.stringify({ jsonrpc: "2.0", id: input.id, result }));
  });
  const api = await startApi({ rpc: rpc.url, swap: rpc.url });
  try {
    const query = "settlementAsset=USDC&assetA=0&assetB=1&duration=3600";
    for (const origin of ["http://localhost:8081", "https://another-operator.example"]) {
      const response = await fetch(`${api.url}/api/round-pool?${query}`, { headers: { Origin: origin } });
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("access-control-allow-origin"), "*");
      const result = await response.json();
      assert.equal(result.totalA, "50000000");
      assert.equal(result.totalB, "100000000");
    }
    assert.equal(calls, 1);
    const intent = await fetch(`${api.url}/api/v1/bets/intent`, { method: "POST", headers: { Origin: "http://localhost:8081" }, body: "{}" });
    assert.equal(intent.headers.get("access-control-allow-origin"), null);
  } finally { await api.close(); await rpc.close(); }
});

test("customer market metadata is exposed only by the enabled API and cached for repeated reads", async () => {
  let registryReads = 0;
  const rpc = await listen(async (request, response) => {
    const input = await body(request);
    let result;
    if (input.method === 'eth_chainId') result = '0x14a34';
    else {
      const selector = input.params[0].data.slice(0,10);
      if (selector === toFunctionSelector('assetRegistry()')) result = encodeAbiParameters(parseAbiParameters('address'), [factory]);
      else if (selector === toFunctionSelector('minDeposit()')) result = encodeAbiParameters(parseAbiParameters('uint256'), [50_000_000n]);
      else {
        assert.equal(selector, toFunctionSelector('allAssets()')); registryReads++;
        result = encodeAbiParameters([{type:'bytes32[]'},{type:'bool[]'}], [[stringToHex('BTC',{size:32}),stringToHex('ETH',{size:32})],[true,true]]);
      }
    }
    response.setHeader('content-type','application/json');
    response.end(JSON.stringify({jsonrpc:'2.0',id:input.id,result}));
  });
  const api = await startApi({rpc:rpc.url, swap:rpc.url});
  try {
    for (let i=0;i<2;i++) {
      const response=await fetch(`${api.url}/api/v1/bets/markets`);assert.equal(response.status,200);
      const data=await response.json();assert.equal(data.chainId,84532);assert.equal(data.operator,operator);
      assert.deepEqual(data.assets,[{id:0,symbol:'BTC'},{id:1,symbol:'ETH'}]);
      assert.equal(data.settlementAssets[0].minimumDeposit,'50000000');
    }
    assert.equal(registryReads,1);
    assert.equal((await fetch(`${api.url}/api/v1/bets/receipt?settlementAsset=USDC&hash=invalid`)).status,400);
  } finally {await api.close();await rpc.close();}
});
