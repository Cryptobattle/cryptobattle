# CryptoBattle Operator

Run your own CryptoBattle frontend and earn a share of battle fees. Players back the cryptocurrency they expect to outperform another over a chosen period. Smart contracts on **Base Mainnet (chain ID 8453)** match stakes and settle results. USDC and native ETH have separate pools.

![CryptoBattle frontend on Base](assets/cryptobattle.png?v=2)

The total battle fee is **5% of matched stakes**. The operator's base share is 2.5%, reduced by its share of the fixed settlement reserve; platform fees receive the remainder. Operator earnings can be claimed with the configured wallet in the frontend.

## Docker setup

Requires Git, Docker Engine and the Docker Compose plugin. No local Node.js installation is needed.

1. Clone this repository, enter its directory, then prepare your configuration:

   ```bash
   git clone https://github.com/Cryptobattle/cryptobattle.git
   cd cryptobattle/operator
   cp mainnet.env.example .env
   chmod 600 .env
   nano .env
   ```

2. Set `VITE_OPERATOR_ADDRESS` to **your public operator wallet address**. Mainnet factories, shared ETH mode and other required settings are already filled in. Never enter a wallet private key. Optional: `VITE_RPC_URLS` is browser-visible; `OPERATOR_API_RPC_URLS` is server-only.

3. Build and start:

   ```bash
   sudo docker compose up -d --build
   sudo docker compose ps
   ```

4. Open **http://localhost:8080**. If that port is occupied, change `FRONTEND_PORT` in `.env`. Connect the configured wallet through Rabby or another injected browser wallet, with ETH on **Base** for gas.

5. Click **Activate frontend** and confirm the on-chain activation payment. The one-time activation fee funds the platform's keepers and price reporters. It is currently **0.1 ETH**; the contract supplies the current amount. A direct transfer does not activate an operator. Governance and platform Treasury are exempt.

6. Select a pair, duration and side; choose **ETH** and activate its shared deposit address once. Repeat for the options you want to offer. Players can then send ETH directly to those addresses.

For public hosting, place the frontend behind an HTTPS reverse proxy. The default bind address is local-only; set `FRONTEND_BIND_ADDRESS=0.0.0.0` if external access is required. Docker includes the local API and Redis. Operators need no platform keys, Cloudflare setup, keepers or reporters. Swaps are disabled.

Updates and troubleshooting (from `operator/`):

```bash
sudo docker compose up -d --build
# For configuration changes only:
sudo docker compose up -d --force-recreate
# Troubleshooting:
sudo docker compose logs --tail=80 frontend operator-api
```

## Use shared ETH without a public frontend

A public website is optional: run the frontend locally to activate your operator and **deploy** shared ETH addresses for each pair, duration and side. Share these permanent, operator-specific addresses, then stop the frontend if desired. Platform keepers and reporters handle direct ETH entries and automatic payouts independently.

<!-- LIVE_ETH_CATALOG_START -->
## Try the live operator — direct ETH entries

Send **at least 0.025 native ETH on Base Mainnet (8453)** from your personal wallet to a deployed address below. The minimum was checked at block 62331253; recheck the live Core before sending. These addresses belong to the platform operator, not to a newly configured operator.

### Available 10-minute examples

| Pair | First asset outperforms | Second asset outperforms |
| --- | --- | --- |
| BTC / ETH | `0xEa65144f0841DAc61c3EF3D2C20BE3821f1d4c9f` | `0x4031F37E61c45eFb6AD3b2dAf40fa63740059f27` |
| BTC / SOL | `0x0C0462bA8723c75665C0C6B989d45820134aCB7E` | `0x292809371e9b0b59D9Af40bc8a132B0290A492e1` |
| BTC / XRP | `0xCA9d02f2De268f57Fa27cC836436b12f68C523Ad` | `0xEd5b31eC3E68bCFDF645D3da3F884196F7d85553` |
| BTC / BNB | `0x8A0068cA7A14A1Db277CD2DcE68D2c5b76b4a54d` | `0x302270Be33409Cbf184534E366c3CCA7005DE5c0` |
| BTC / DOGE | `0x3AF266fAe07626947C03B31f9E3638811402a555` | `0x02989B3bDD20Fb06Bd7d7a139064bd7016c72366` |
| ETH / SOL | `0xdfe0a8353a091e2a97dc2Fecf6974B551bC5c614` | `0xdb0D9EF4F47cDb18b84fE2bF7974332F936e0d3D` |
| ETH / XRP | `0xE9736D6acA76BF63A813D7d6399fABc9a2F9668D` | `0xBd543b07051b2BD25811bEc009bD92A692bE85fe` |
| ETH / BNB | `0x258DaDc1CE9796880fC12eEEf903CE047a8Ef91E` | `0xFdBc3F36E712641D4346B361979112D632fd4EC0` |
| ETH / DOGE | `0x9f661e14Cd8dE60A37f049A76BDf17600269Cf73` | `0x504814d97522238a15507b0D8eE6982E06460Fb3` |
| SOL / XRP | `0x6a5d35C5A4Cc75C38b3638d5Ed62F4331f33ef15` | `0x167B9847C6ab9811942ade36e1244A3f19B121D2` |
| SOL / BNB | `0xFE82746FccEdb506fA8Ee376dFCa35Ea36D54a00` | `0x3e415D12285C5543930086422B4851e2E8Dbedc4` |
| SOL / DOGE | `0x6dBfc7a5dB64d1157A3C2A1F6E4B59F7a96F051b` | `0xEAe960157cE9EBaBB27F7d4330ed0C835F4c03fd` |
| XRP / BNB | `0xC60D6cA90Afe586c6032Ae3FB82Cd4EB60E67469` | `0xaae0b1B1331165C7f4c66377b4ce46800a31B34e` |
| XRP / DOGE | `0x9c9bB50800101Cc881d34ab9098Ae3f50B92f0a8` | `0x1CDb12ec7048795C5C8685C39b83178C8466c274` |
| BNB / DOGE | `0x73734E4E9a4f26d28D6BFa4682b76D5446B5d108` | `0xB81eC0814D45EFc3F3F0Ad5287d32ACfAfb5Caf9` |

**180/180 addresses verified deployed**, covering 15 possible pairs and 6 periods. See [all periods, sides, entry windows and deployment status](LIVE_ETH_ADDRESSES.md). Predicted addresses marked **not deployed** must not receive funds.

**Real funds, not testnet ETH.** Use native ETH on Base, not Ethereum Mainnet or WETH. Do not send from an exchange/custodial account: the sender receives payouts/refunds. Sending to a contract requires estimated gas, not a fixed 21,000 gas limit. Stakes can be lost.

Percentage performance determines the winner. Ten-minute rounds accept entries in their first two minutes; later entries join the next round. Opposing stakes are required. Unmatched funds can roll forward, so a transfer does not guarantee a payout ten minutes later. Settlement requires the platform oracle/reporters and keepers. Matched draws are refunded under the live contract rules.

**For agents:** [machine-readable address catalog](live-eth-addresses.json) · [discovery and safety notes](llms.txt). Select only `ready: true`, verify chain and contract state before sending, and obtain the wallet owner's authorization for any payment.
<!-- LIVE_ETH_CATALOG_END -->
