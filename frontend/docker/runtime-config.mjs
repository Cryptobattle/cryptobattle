import { writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const publicKeys = [
  "VITE_NETWORK", "VITE_USDC_FACTORY_ADDRESS", "VITE_EURC_FACTORY_ADDRESS",
  "VITE_WETH_FACTORY_ADDRESS", "VITE_ETH_FACTORY_ADDRESS", "VITE_FACTORY_ADDRESS",
  "VITE_ETH_ADDRESS_MODE", "VITE_ENABLED_SETTLEMENT_ASSETS", "VITE_OPERATOR_ADDRESS",
  "VITE_OPERATOR_TELEGRAM_BOT", "VITE_CUSTOMER_TELEGRAM_BOT", "VITE_MARKET_API_URL", "VITE_RPC_URL", "VITE_RPC_URLS",
  "VITE_SWAPPER_ENABLED", "VITE_SWAPPER_API_URL", "VITE_SWAPPER_OPERATOR_ID",
  "VITE_SWAP_DISTRIBUTOR_ADDRESS", "VITE_SWAP_NETWORK", "VITE_SWAP_RPC_URLS",
];

export function publicConfig(env) {
  const config = Object.fromEntries(publicKeys.filter(key => env[key] !== undefined).map(key => [key, env[key]]));
  if (env.CRYPTOBATTLE_STANDALONE === "true") {
    config.VITE_MARKET_API_URL = "";
    config.VITE_SWAPPER_ENABLED = "false";
    for (const key of publicKeys.filter(key => key.startsWith("VITE_SWAP"))) {
      if (key !== "VITE_SWAPPER_ENABLED") delete config[key];
    }
  }
  return config;
}

function requireAddress(config, key) {
  const value = config[key] || "";
  if (!/^0x[0-9a-f]{40}$/i.test(value) || /^0x0{40}$/i.test(value)) {
    throw new Error(`Set ${key} to the platform-provided address for the selected network`);
  }
}

function requireUrls(value, name, optional = false) {
  if (!value && optional) return;
  if (!value) throw new Error(`Missing ${name}`);
  for (const entry of value.split(",")) {
    const url = new URL(entry.trim());
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
      throw new Error(`Invalid ${name}: use HTTP(S) URLs without embedded credentials`);
    }
  }
}

export function validateOperatorConfig(config) {
  if (!["base", "baseSepolia"].includes(config.VITE_NETWORK)) {
    throw new Error("VITE_NETWORK must be base or baseSepolia");
  }
  requireAddress(config, "VITE_OPERATOR_ADDRESS");
  const assets = (config.VITE_ENABLED_SETTLEMENT_ASSETS || "USDC,EURC,WETH,ETH").split(",").map(x => x.trim().toUpperCase());
  if (!assets.length || assets.some(asset => !["USDC", "EURC", "WETH", "ETH"].includes(asset))) {
    throw new Error("VITE_ENABLED_SETTLEMENT_ASSETS must contain USDC, EURC, WETH and/or ETH");
  }
  for (const asset of assets) requireAddress(config, `VITE_${asset}_FACTORY_ADDRESS`);
  if (config.VITE_ETH_ADDRESS_MODE && !["personal", "shared"].includes(config.VITE_ETH_ADDRESS_MODE)) {
    throw new Error("VITE_ETH_ADDRESS_MODE must be personal or shared");
  }
  requireUrls(config.VITE_RPC_URLS || config.VITE_RPC_URL, "VITE_RPC_URLS");
  requireUrls(config.VITE_MARKET_API_URL, "VITE_MARKET_API_URL", true);
  if (config.VITE_OPERATOR_TELEGRAM_BOT && !/^@?[A-Za-z0-9_]{5,32}$/.test(config.VITE_OPERATOR_TELEGRAM_BOT)) {
    throw new Error("VITE_OPERATOR_TELEGRAM_BOT must be a Telegram bot username, not a URL");
  }
  if (config.VITE_CUSTOMER_TELEGRAM_BOT && (!/^@?[A-Za-z0-9_]{5,32}$/.test(config.VITE_CUSTOMER_TELEGRAM_BOT) || config.VITE_CUSTOMER_TELEGRAM_BOT.replace(/^@/, "").toLowerCase() === (config.VITE_OPERATOR_TELEGRAM_BOT || "").replace(/^@/, "").toLowerCase())) {
    throw new Error("VITE_CUSTOMER_TELEGRAM_BOT must be a dedicated customer bot username, different from the central group bot");
  }
  if (config.VITE_SWAPPER_ENABLED && !["true", "false"].includes(config.VITE_SWAPPER_ENABLED)) {
    throw new Error("VITE_SWAPPER_ENABLED must be true or false");
  }
  if (config.VITE_SWAPPER_ENABLED !== "false") {
    requireUrls(config.VITE_SWAPPER_API_URL, "VITE_SWAPPER_API_URL");
    requireAddress(config, "VITE_SWAP_DISTRIBUTOR_ADDRESS");
    if (config.VITE_SWAP_NETWORK && !["base", "baseSepolia"].includes(config.VITE_SWAP_NETWORK)) {
      throw new Error("VITE_SWAP_NETWORK must be base or baseSepolia");
    }
    requireUrls(config.VITE_SWAP_RPC_URLS, "VITE_SWAP_RPC_URLS");
  }
}

export function renderConfig(config) {
  const json = JSON.stringify(config).replaceAll("<", "\\u003c").replaceAll("\u2028", "\\u2028").replaceAll("\u2029", "\\u2029");
  return `window.__CRYPTOBATTLE_CONFIG__ = Object.freeze(${json});\n`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const config = publicConfig(process.env);
  try {
    if (process.env.CRYPTOBATTLE_STANDALONE === "true") validateOperatorConfig(config);
    writeFileSync(process.argv[2] || "/usr/share/nginx/html/runtime-config.js", renderConfig(config));
  } catch (error) {
    console.error(`CryptoBattle operator configuration: ${error.message}`);
    process.exitCode = 1;
  }
}
