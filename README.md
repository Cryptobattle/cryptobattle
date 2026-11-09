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

## Try a 10-minute BTC vs ETH battle

You can try the live platform by sending **0.025 ETH on Base Mainnet** from a personal wallet to **one** of these deployed shared addresses:

| Your prediction | ETH deposit address on Base |
| --- | --- |
| BTC outperforms ETH | `0xEa65144f0841DAc61c3EF3D2C20BE3821f1d4c9f` |
| ETH outperforms BTC | `0x4031F37E61c45eFb6AD3b2dAf40fa63740059f27` |

**Real funds, not testnet ETH.** Use native ETH on Base, not Ethereum Mainnet or WETH; keep extra ETH for gas. Do not send from an exchange: the sender receives payouts/refunds. These examples belong to the platform operator; yours gets different addresses.

Predictions compare percentage performance, not absolute prices. Ten-minute rounds follow fixed boundaries and accept entries during their first two minutes; later entries join the next round. Opposing stakes are required for matching. Unmatched funds roll forward under the contract rules, so a deposit does not guarantee a payout ten minutes later. Matched draws are refunded without a battle fee; winning payouts are sent automatically after settlement. Stakes can be lost.
