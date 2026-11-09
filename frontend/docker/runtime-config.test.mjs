import assert from "node:assert/strict";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import { publicConfig, renderConfig, validateOperatorConfig } from "./runtime-config.mjs";

const address = "0x1111111111111111111111111111111111111111";
const valid = () => ({
  VITE_NETWORK: "baseSepolia",
  VITE_OPERATOR_ADDRESS: address,
  VITE_ENABLED_SETTLEMENT_ASSETS: "USDC,ETH",
  VITE_USDC_FACTORY_ADDRESS: address,
  VITE_ETH_FACTORY_ADDRESS: address,
  VITE_RPC_URLS: "https://rpc.example,https://fallback.example",
  VITE_MARKET_API_URL: "https://market.example",
  VITE_SWAPPER_ENABLED: "false",
});

test("only explicitly approved public settings reach the browser", () => {
  const output = publicConfig({
    ...valid(),
    TELEGRAM_BOT_TOKEN: "private-token",
    OPERATOR_TELEGRAM_BOT_TOKEN: "private-token",
    KEEPER_PRIVATE_KEY: "private-key",
    SIDESHIFT_SECRET: "private-secret",
    SWAP_PROXY_SECRET: "private-proxy-secret",
    OPERATOR_API_RPC_URLS: "https://rpc.example/private-backend-key",
    CUSTOMER_TELEGRAM_BOT_TOKEN: "private-customer-token",
    VITE_UNRECOGNIZED_SECRET: "private-secret",
  });
  assert.deepEqual(output, valid());
});

test("serialized configuration cannot turn values into executable JavaScript", () => {
  const value = "</script><script>window.compromised=true</script>\u2028\u2029";
  const rendered = renderConfig({ VITE_OPERATOR_TELEGRAM_BOT: value });
  assert.equal(rendered.includes("<"), false);
  const context = { window: {} };
  runInNewContext(rendered, context);
  assert.equal(context.window.__CRYPTOBATTLE_CONFIG__.VITE_OPERATOR_TELEGRAM_BOT, value);
  assert.equal(context.window.compromised, undefined);
  assert.equal(Object.isFrozen(context.window.__CRYPTOBATTLE_CONFIG__), true);
});

test("standalone USDC/ETH operator does not need disabled asset addresses", () => {
  assert.doesNotThrow(() => validateOperatorConfig(valid()));
});

test("customer bot username is public while the group bot must remain separate", () => {
  assert.doesNotThrow(() => validateOperatorConfig({ ...valid(), VITE_CUSTOMER_TELEGRAM_BOT: "CryptoBattleCustomersBot" }));
  assert.throws(() => validateOperatorConfig({ ...valid(), VITE_OPERATOR_TELEGRAM_BOT: "GroupBot", VITE_CUSTOMER_TELEGRAM_BOT: "@GroupBot" }), /dedicated customer/);
});

test("missing/zero operator and enabled factory addresses fail startup", () => {
  for (const key of ["VITE_OPERATOR_ADDRESS", "VITE_USDC_FACTORY_ADDRESS", "VITE_ETH_FACTORY_ADDRESS"]) {
    for (const value of ["", "0x0000000000000000000000000000000000000000"]) {
      assert.throws(() => validateOperatorConfig({ ...valid(), [key]: value }), new RegExp(key));
    }
  }
});

test("network, asset and address-mode typos fail startup", () => {
  for (const [key, value] of [["VITE_NETWORK", "mainnet"], ["VITE_ENABLED_SETTLEMENT_ASSETS", "USDC,ET"], ["VITE_ETH_ADDRESS_MODE", "private"]]) {
    assert.throws(() => validateOperatorConfig({ ...valid(), [key]: value }), new RegExp(key));
  }
});

test("unsafe RPC URLs fail startup; local same-origin markets need no URL", () => {
  assert.throws(() => validateOperatorConfig({ ...valid(), VITE_RPC_URLS: "javascript:alert(1)" }), /VITE_RPC_URLS/);
  assert.throws(() => validateOperatorConfig({ ...valid(), VITE_RPC_URLS: "https://user:password@rpc.example" }), /VITE_RPC_URLS/);
  assert.doesNotThrow(() => validateOperatorConfig({ ...valid(), VITE_MARKET_API_URL: "" }));
});

test("standalone package strips stale central endpoints and disables swaps", () => {
  const config = publicConfig({ ...valid(), CRYPTOBATTLE_STANDALONE: "true", VITE_MARKET_API_URL: "https://private.workers.dev", VITE_SWAPPER_ENABLED: "true", VITE_SWAPPER_API_URL: "https://private.workers.dev", VITE_OPERATOR_COMMUNITY_URL: "https://private.workers.dev" });
  assert.equal(config.VITE_MARKET_API_URL, "");
  assert.equal(config.VITE_SWAPPER_ENABLED, "false");
  assert.equal(JSON.stringify(config).includes("workers.dev"), false);
});

test("enabled Swapper requires its own distributor, API, and RPC settings", () => {
  const swapper = {
    ...valid(), VITE_SWAPPER_ENABLED: "true", VITE_SWAPPER_API_URL: "https://swap.example",
    VITE_SWAP_DISTRIBUTOR_ADDRESS: address, VITE_SWAP_RPC_URLS: "https://base.example", VITE_SWAP_NETWORK: "base",
  };
  assert.doesNotThrow(() => validateOperatorConfig(swapper));
  for (const key of ["VITE_SWAPPER_API_URL", "VITE_SWAP_DISTRIBUTOR_ADDRESS", "VITE_SWAP_RPC_URLS"]) {
    assert.throws(() => validateOperatorConfig({ ...swapper, [key]: "" }), new RegExp(key));
  }
});
