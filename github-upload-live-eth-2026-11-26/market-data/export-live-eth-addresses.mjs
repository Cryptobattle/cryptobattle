import { createPublicClient, http, parseAbi, getAddress, hexToString, formatEther, zeroAddress } from 'viem';
import { base } from 'viem/chains';
import { mkdir, writeFile, readFile, access } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Public reads only. Never imports a wallet, reads private ENV files or submits transactions.
export const FACTORY = '0x70d6Dc49d57Ba9e6767F0B2De0B1Fcc86699E21A';
export const CORE = '0xB66aF429D8C011a6106211b600f2f31959A473Ea';
export const OPERATOR = '0x6F8835E1CA97552BCC18c3FFc43517714264a64c';
const durations = [[60, '1 minute'], [600, '10 minutes'], [3600, '1 hour'], [86400, '1 day'], [604800, '1 week'], [2592000, '30 days']];
const abi = parseAbi([
  'function core() view returns(address)', 'function factory() view returns(address)',
  'function token() view returns(address)', 'function operatorRegistry() view returns(address)',
  'function assetRegistry() view returns(address)', 'function assetCount() view returns(uint16)',
  'function asset(uint16) view returns(bytes32 symbol,bool enabled)',
  'function supportedAsset(uint16) view returns(bool)', 'function validDuration(uint32) view returns(bool)',
  'function entryWindow(uint32) view returns(uint32)', 'function minDeposit() view returns(uint256)',
  'function isOperatorActive(address) view returns(bool)',
  'function predict((uint16 assetA,uint16 assetB,uint32 duration,bool sideB,address beneficiary,address operator)) view returns(address)',
  'function isProxy(address) view returns(bool)',
  'function assetA() view returns(uint16)', 'function assetB() view returns(uint16)',
  'function duration() view returns(uint32)', 'function sideB() view returns(bool)', 'function operator() view returns(address)',
]);
export function combinations(assets, periods, operator) {
  const result = [];
  for (let i = 0; i < assets.length; i++) for (let j = i + 1; j < assets.length; j++) {
    const a = assets[i], b = assets[j];
    if (a.id >= b.id) throw new Error('Assets must be unique and sorted by numeric ID');
    for (const period of periods) for (const sideB of [false, true]) result.push({
      assetA: a, assetB: b, durationSeconds: period.seconds, durationLabel: period.label,
      entryWindowSeconds: period.entryWindowSeconds, selectedAsset: sideB ? b.symbol : a.symbol,
      key: { assetA: a.id, assetB: b.id, duration: period.seconds, sideB, beneficiary: zeroAddress, operator },
    });
  }
  return result;
}
export function markdown(catalog) {
  let result = `# Live operator — shared ETH addresses\n\nVerified on Base Mainnet (chain **8453**) at block **${catalog.verifiedAtBlock}**, ${catalog.verifiedAtUtc}.\n\n`;
  result += `Operator: \`${catalog.operator}\`\n\nShared ETH factory: \`${catalog.factory}\`\n\nETH Core: \`${catalog.core}\`\n\nMinimum at verification: **${catalog.minimumDepositEth} native ETH**. The live Core may change this minimum through Governance.\n\n`;
  result += `## How to enter\n\nSend at least the current minimum from a **personal wallet on Base**, only to a **deployed / ready** address below. No frontend or wallet signature on a website is required; sending ETH itself is a signed transaction and costs gas. Never send WETH, ERC-20 tokens, Ethereum Mainnet ETH or funds from an exchange/custodial wallet. The sending wallet receives payouts/refunds. Losing stakes can be lost.\n\n`;
  result += `Each address represents one side of a percentage-performance comparison, not an absolute price target. ETH is the settlement asset even when neither competing asset is ETH. Pairs are canonical: BTC vs ETH and ETH vs BTC refer to the same pool when duration and operator match. Addresses are permanent for this deployed factory.\n\n`;
  result += `Fixed round boundaries and the entry windows below apply. Entries outside an entry window join the next round. Opposing funds must be matched; unmatched funds can roll over. Settlement and payouts require the platform's oracle/reporters and keeper execution. A transfer does not guarantee settlement after exactly one interval. Matched draws are refunded under the live rules. The total fee on settled matched stakes is 5%; the fixed reserve is deducted within the fee allocation.\n\n`;
  result += `## Availability\n\n${catalog.summary.deployed} / ${catalog.summary.total} addresses are deployed and verified. **Predicted / not deployed addresses must not receive funds.** Sending to an address without deployed code does not place a bet. Estimate gas for a contract call; do not use a fixed 21,000 gas limit.\n\n`;
  result += `## Entry windows\n\n| Round length | Entry window after fixed round boundary |\n| --- | --- |\n`;
  for (const period of catalog.periods) result += `| ${period.label} | ${period.entryWindowSeconds} seconds |\n`;
  result += `\n## All combinations\n\n| Pair | Round length | Prediction | Native ETH address | Status |\n| --- | --- | --- | --- | --- |\n`;
  for (const row of catalog.addresses) result += `| ${row.assetA.symbol} / ${row.assetB.symbol} | ${row.durationLabel} | ${row.selectedAsset} outperforms | [\`${row.address}\`](https://basescan.org/address/${row.address}) | ${row.ready ? 'Deployed / ready' : 'Predicted / NOT deployed — do not send'} |\n`;
  result += `\n## Agents and automation\n\nUse [live-eth-addresses.json](live-eth-addresses.json). Filter for \`ready: true\`, confirm \`chainId: 8453\`, then recheck bytecode, factory membership, Core minimum, active operator and supported assets on-chain before sending real funds. The timestamped catalog is not a live availability or price feed. Never treat \`ready: false\` as a payment destination. Outcome descriptions are informational, not a recommendation to bet.\n`;
  return result;
}

export function readmeSection(catalog) {
  let text = `<!-- LIVE_ETH_CATALOG_START -->\n## Try the live operator — direct ETH entries\n\nSend **at least ${catalog.minimumDepositEth} native ETH on Base Mainnet (8453)** from your personal wallet to a deployed address below. The minimum was checked at block ${catalog.verifiedAtBlock}; recheck the live Core before sending. These addresses belong to the platform operator, not to a newly configured operator.\n\n`;
  text += `### Available 10-minute examples\n\n| Pair | First asset outperforms | Second asset outperforms |\n| --- | --- | --- |\n`;
  for (const a of catalog.assets) for (const b of catalog.assets.filter(b => b.id > a.id)) {
    const rows = catalog.addresses.filter(row => row.assetA.id === a.id && row.assetB.id === b.id && row.durationSeconds === 600 && row.ready);
    if (!rows.length) continue;
    const address = side => { const row = rows.find(row => row.key.sideB === side); return row ? `\`${row.address}\`` : 'Not deployed — do not send'; };
    text += `| ${a.symbol} / ${b.symbol} | ${address(false)} | ${address(true)} |\n`;
  }
  text += `\n**${catalog.summary.deployed}/${catalog.summary.total} addresses verified deployed**, covering ${catalog.summary.pairs} possible pairs and ${catalog.periods.length} periods. See [all periods, sides, entry windows and deployment status](LIVE_ETH_ADDRESSES.md). Predicted addresses marked **not deployed** must not receive funds.\n\n`;
  text += `**Real funds, not testnet ETH.** Use native ETH on Base, not Ethereum Mainnet or WETH. Do not send from an exchange/custodial account: the sender receives payouts/refunds. Sending to a contract requires estimated gas, not a fixed 21,000 gas limit. Stakes can be lost.\n\n`;
  text += `Percentage performance determines the winner. Ten-minute rounds accept entries in their first two minutes; later entries join the next round. Opposing stakes are required. Unmatched funds can roll forward, so a transfer does not guarantee a payout ten minutes later. Settlement requires the platform oracle/reporters and keepers. Matched draws are refunded under the live contract rules.\n\n`;
  text += `**For agents:** [machine-readable address catalog](live-eth-addresses.json) · [discovery and safety notes](llms.txt). Select only \`ready: true\`, verify chain and contract state before sending, and obtain the wallet owner's authorization for any payment.\n<!-- LIVE_ETH_CATALOG_END -->`;
  return text;
}
export async function writeReadme(catalog, output) {
  const path = resolve(output, 'README.md');
  let text;
  try { text = await readFile(path, 'utf8'); } catch (error) { if (error.code === 'ENOENT') return; throw error; }
  const replacement = readmeSection(catalog);
  if (text.includes('<!-- LIVE_ETH_CATALOG_START -->')) text = text.replace(/<!-- LIVE_ETH_CATALOG_START -->[\s\S]*?<!-- LIVE_ETH_CATALOG_END -->/, replacement);
  else if (text.includes('## Try a 10-minute BTC vs ETH battle')) text = text.replace(/## Try a 10-minute BTC vs ETH battle[\s\S]*?(?=\n## |$)/, replacement + '\n');
  else text += '\n' + replacement + '\n';
  await writeFile(path, text);
}

export async function exportCatalog({ rpc = process.env.BASE_RPC_URL || 'https://mainnet.base.org', output = resolve(dirname(fileURLToPath(import.meta.url)), '../operator') } = {}) {
  const client = createPublicClient({ chain: base, transport: http(rpc, { timeout: 30_000, retryCount: 2 }) });
  if (await client.getChainId() !== 8453) throw new Error('Refusing a non-Base-Mainnet RPC');
  const block = await client.getBlock();
  const read = (address, functionName, args = []) => client.readContract({ address, abi, functionName, args, blockNumber: block.number });
  const call = (address, functionName, args = []) => ({ address, abi, functionName, args });
  const many = contracts => client.multicall({ contracts, allowFailure: false, blockNumber: block.number, batchSize: 4096 });
  const core = getAddress(await read(FACTORY, 'core'));
  if (core !== getAddress(CORE) || getAddress(await read(core, 'factory')) !== getAddress(FACTORY) || await read(core, 'token') !== zeroAddress) throw new Error('Live factory/Core/native-asset binding mismatch');
  const registry = await read(core, 'assetRegistry');
  const policy = await read(FACTORY, 'operatorRegistry');
  if (!await read(policy, 'isOperatorActive', [OPERATOR])) throw new Error('Live operator inactive');
  const count = Number(await read(registry, 'assetCount'));
  const configurations = await many(Array.from({ length: count }, (_, id) => call(registry, 'asset', [id])));
  const supported = await many(Array.from({ length: count }, (_, id) => call(core, 'supportedAsset', [id])));
  const assets = configurations.flatMap(([symbol, enabled], id) => enabled && supported[id] ? [{ id, symbol: hexToString(symbol, { size: 32 }).replace(/\0/g, '') }] : []);
  const periods = [];
  for (const [seconds, label] of durations) if (await read(core, 'validDuration', [seconds])) periods.push({ seconds, label, entryWindowSeconds: Number(await read(core, 'entryWindow', [seconds])) });
  const combinationsList = combinations(assets, periods, OPERATOR);
  const predicted = await many(combinationsList.map(row => call(FACTORY, 'predict', [row.key])));
  const recognized = await many(predicted.map(address => call(FACTORY, 'isProxy', [address])));
  const addresses = [];
  for (let i = 0; i < predicted.length; i++) {
    const row = combinationsList[i], address = getAddress(predicted[i]);
    const deployed = recognized[i];
    if (deployed) {
      const code = await client.getCode({ address, blockNumber: block.number });
      if (!code || code === '0x') throw new Error(`Factory member without code: ${address}`);
      const [actualCore, a, b, duration, sideB, operator] = await many(['core', 'assetA', 'assetB', 'duration', 'sideB', 'operator'].map(name => call(address, name)));
      if (getAddress(actualCore) !== core || a !== row.assetA.id || b !== row.assetB.id || duration !== row.durationSeconds || sideB !== row.key.sideB || getAddress(operator) !== getAddress(OPERATOR)) throw new Error(`Proxy binding mismatch: ${address}`);
    }
    addresses.push({ ...row, address, deployed, ready: deployed, verifiedBindings: deployed, status: deployed ? 'deployed' : 'predicted-not-deployed', explorerUrl: `https://basescan.org/address/${address}` });
  }
  const minimum = await read(core, 'minDeposit');
  const catalog = { schemaVersion: 1, chainId: 8453, network: 'Base Mainnet', settlementAsset: 'ETH', operator: getAddress(OPERATOR), factory: getAddress(FACTORY), core, assetRegistry: getAddress(registry), operatorRegistry: getAddress(policy), verifiedAtBlock: block.number.toString(), verifiedAtUtc: new Date(Number(block.timestamp) * 1000).toISOString(), minimumDepositWei: minimum.toString(), minimumDepositEth: formatEther(minimum), assets, periods, summary: { pairs: assets.length * (assets.length - 1) / 2, total: addresses.length, deployed: addresses.filter(row => row.ready).length }, rules: { onlyNativeEthOnBase: true, personalWalletRequired: true, exchangeOrCustodialSenderUnsupported: true, beneficiary: 'transaction sender', doNotFundUndeployedAddresses: true, canonicalAssetOrder: 'ascending asset IDs', matchingRequired: true, totalBattleFeeBps: 500, recheckOnchainBeforeSending: true }, addresses };
  await mkdir(output, { recursive: true });
  await writeFile(resolve(output, 'live-eth-addresses.json'), JSON.stringify(catalog, null, 2) + '\n');
  await writeFile(resolve(output, 'LIVE_ETH_ADDRESSES.md'), markdown(catalog));
  await writeReadme(catalog, output);
  const publicDirectory = resolve(output, '../frontend/public');
  try { await access(publicDirectory); await writeFile(resolve(publicDirectory, 'live-eth-addresses.json'), JSON.stringify(catalog, null, 2) + '\n'); await writeFile(resolve(publicDirectory, 'LIVE_ETH_ADDRESSES.md'), markdown(catalog)); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  console.log(JSON.stringify({ ...catalog.summary, minimumDepositEth: catalog.minimumDepositEth, verifiedAtBlock: catalog.verifiedAtBlock, output }, null, 2));
  return catalog;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  exportCatalog({ output: process.argv[2] ? resolve(process.argv[2]) : undefined }).catch(error => { console.error(error.shortMessage || error.message); process.exitCode = 1; });
}
