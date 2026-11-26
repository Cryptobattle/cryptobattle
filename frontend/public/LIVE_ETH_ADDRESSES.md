# Live operator — shared ETH addresses

Verified on Base Mainnet (chain **8453**) at block **62331253**, 2026-11-26T01:30:26.000Z.

Operator: `0x6F8835E1CA97552BCC18c3FFc43517714264a64c`

Shared ETH factory: `0x70d6Dc49d57Ba9e6767F0B2De0B1Fcc86699E21A`

ETH Core: `0xB66aF429D8C011a6106211b600f2f31959A473Ea`

Minimum at verification: **0.025 native ETH**. The live Core may change this minimum through Governance.

## How to enter

Send at least the current minimum from a **personal wallet on Base**, only to a **deployed / ready** address below. No frontend or wallet signature on a website is required; sending ETH itself is a signed transaction and costs gas. Never send WETH, ERC-20 tokens, Ethereum Mainnet ETH or funds from an exchange/custodial wallet. The sending wallet receives payouts/refunds. Losing stakes can be lost.

Each address represents one side of a percentage-performance comparison, not an absolute price target. ETH is the settlement asset even when neither competing asset is ETH. Pairs are canonical: BTC vs ETH and ETH vs BTC refer to the same pool when duration and operator match. Addresses are permanent for this deployed factory.

Fixed round boundaries and the entry windows below apply. Entries outside an entry window join the next round. Opposing funds must be matched; unmatched funds can roll over. Settlement and payouts require the platform's oracle/reporters and keeper execution. A transfer does not guarantee settlement after exactly one interval. Matched draws are refunded under the live rules. The total fee on settled matched stakes is 5%; the fixed reserve is deducted within the fee allocation.

## Availability

180 / 180 addresses are deployed and verified. **Predicted / not deployed addresses must not receive funds.** Sending to an address without deployed code does not place a bet. Estimate gas for a contract call; do not use a fixed 21,000 gas limit.

## Entry windows

| Round length | Entry window after fixed round boundary |
| --- | --- |
| 1 minute | 30 seconds |
| 10 minutes | 120 seconds |
| 1 hour | 600 seconds |
| 1 day | 7200 seconds |
| 1 week | 86400 seconds |
| 30 days | 259200 seconds |

## All combinations

| Pair | Round length | Prediction | Native ETH address | Status |
| --- | --- | --- | --- | --- |
| BTC / ETH | 1 minute | BTC outperforms | [`0xb0fd2B32f9F5F138CdE15fdDbaa1FD04F1FdD376`](https://basescan.org/address/0xb0fd2B32f9F5F138CdE15fdDbaa1FD04F1FdD376) | Deployed / ready |
| BTC / ETH | 1 minute | ETH outperforms | [`0xD6a00fD12516fC255A89e1d7988aDED9715369F8`](https://basescan.org/address/0xD6a00fD12516fC255A89e1d7988aDED9715369F8) | Deployed / ready |
| BTC / ETH | 10 minutes | BTC outperforms | [`0xEa65144f0841DAc61c3EF3D2C20BE3821f1d4c9f`](https://basescan.org/address/0xEa65144f0841DAc61c3EF3D2C20BE3821f1d4c9f) | Deployed / ready |
| BTC / ETH | 10 minutes | ETH outperforms | [`0x4031F37E61c45eFb6AD3b2dAf40fa63740059f27`](https://basescan.org/address/0x4031F37E61c45eFb6AD3b2dAf40fa63740059f27) | Deployed / ready |
| BTC / ETH | 1 hour | BTC outperforms | [`0x11a6bd22A06F49B77CB4b41f010F1ADF44B9B8a6`](https://basescan.org/address/0x11a6bd22A06F49B77CB4b41f010F1ADF44B9B8a6) | Deployed / ready |
| BTC / ETH | 1 hour | ETH outperforms | [`0x0a883495fa6f2b7E385d6A180c686b8B4A3F51A6`](https://basescan.org/address/0x0a883495fa6f2b7E385d6A180c686b8B4A3F51A6) | Deployed / ready |
| BTC / ETH | 1 day | BTC outperforms | [`0x2C8E91D1C527DF22c20331254208739AA84943d9`](https://basescan.org/address/0x2C8E91D1C527DF22c20331254208739AA84943d9) | Deployed / ready |
| BTC / ETH | 1 day | ETH outperforms | [`0x97Ff2CCDf345eC132413836250d0e1D37C87094E`](https://basescan.org/address/0x97Ff2CCDf345eC132413836250d0e1D37C87094E) | Deployed / ready |
| BTC / ETH | 1 week | BTC outperforms | [`0x2ab42e179F6cDBeC3859Ab6C0346996Cb1E758C7`](https://basescan.org/address/0x2ab42e179F6cDBeC3859Ab6C0346996Cb1E758C7) | Deployed / ready |
| BTC / ETH | 1 week | ETH outperforms | [`0x8cB2f4c9e3BAE1160a617c6A0875D4dC873E7f85`](https://basescan.org/address/0x8cB2f4c9e3BAE1160a617c6A0875D4dC873E7f85) | Deployed / ready |
| BTC / ETH | 30 days | BTC outperforms | [`0x979D2145AfD58D4EffcFA8d9786fFA61e2e352cB`](https://basescan.org/address/0x979D2145AfD58D4EffcFA8d9786fFA61e2e352cB) | Deployed / ready |
| BTC / ETH | 30 days | ETH outperforms | [`0x2cc153dBd960C52594aaEe60b9A3C23810279136`](https://basescan.org/address/0x2cc153dBd960C52594aaEe60b9A3C23810279136) | Deployed / ready |
| BTC / SOL | 1 minute | BTC outperforms | [`0x0909963cC7E77AA0De536dcf8aba03Baa9529ac3`](https://basescan.org/address/0x0909963cC7E77AA0De536dcf8aba03Baa9529ac3) | Deployed / ready |
| BTC / SOL | 1 minute | SOL outperforms | [`0xAa623012878c9987bd650e19D872C357BD62c47D`](https://basescan.org/address/0xAa623012878c9987bd650e19D872C357BD62c47D) | Deployed / ready |
| BTC / SOL | 10 minutes | BTC outperforms | [`0x0C0462bA8723c75665C0C6B989d45820134aCB7E`](https://basescan.org/address/0x0C0462bA8723c75665C0C6B989d45820134aCB7E) | Deployed / ready |
| BTC / SOL | 10 minutes | SOL outperforms | [`0x292809371e9b0b59D9Af40bc8a132B0290A492e1`](https://basescan.org/address/0x292809371e9b0b59D9Af40bc8a132B0290A492e1) | Deployed / ready |
| BTC / SOL | 1 hour | BTC outperforms | [`0xcdb2a37Ade355986dAA24ea0eE6Dc3152a9cf8b7`](https://basescan.org/address/0xcdb2a37Ade355986dAA24ea0eE6Dc3152a9cf8b7) | Deployed / ready |
| BTC / SOL | 1 hour | SOL outperforms | [`0x375Ac4251937DF58FF3f3699e5dee23Ce46FB9E2`](https://basescan.org/address/0x375Ac4251937DF58FF3f3699e5dee23Ce46FB9E2) | Deployed / ready |
| BTC / SOL | 1 day | BTC outperforms | [`0x234A385238d29783A7f7cFDD6D557E16Dc83c8a2`](https://basescan.org/address/0x234A385238d29783A7f7cFDD6D557E16Dc83c8a2) | Deployed / ready |
| BTC / SOL | 1 day | SOL outperforms | [`0x407824D14A3DC0049136FD9a7Ac009d741dcC234`](https://basescan.org/address/0x407824D14A3DC0049136FD9a7Ac009d741dcC234) | Deployed / ready |
| BTC / SOL | 1 week | BTC outperforms | [`0xE01de1293932616316E865ae58fF892ef51ac964`](https://basescan.org/address/0xE01de1293932616316E865ae58fF892ef51ac964) | Deployed / ready |
| BTC / SOL | 1 week | SOL outperforms | [`0x00DAA5dc916627bc11bd25c9757acc6e001B698C`](https://basescan.org/address/0x00DAA5dc916627bc11bd25c9757acc6e001B698C) | Deployed / ready |
| BTC / SOL | 30 days | BTC outperforms | [`0x5476DBBf6a1efF4b8e54fD0a42dE2AB29c41a1De`](https://basescan.org/address/0x5476DBBf6a1efF4b8e54fD0a42dE2AB29c41a1De) | Deployed / ready |
| BTC / SOL | 30 days | SOL outperforms | [`0x40de0718a57c4cdE2AbC0719A50c4bFF4fdfF837`](https://basescan.org/address/0x40de0718a57c4cdE2AbC0719A50c4bFF4fdfF837) | Deployed / ready |
| BTC / XRP | 1 minute | BTC outperforms | [`0x46C21f0d9DC7243f0559AFf7e0234318E84D4F5c`](https://basescan.org/address/0x46C21f0d9DC7243f0559AFf7e0234318E84D4F5c) | Deployed / ready |
| BTC / XRP | 1 minute | XRP outperforms | [`0xadCeB802C06a744d72EAe4C1c5E491aFFfFDd81F`](https://basescan.org/address/0xadCeB802C06a744d72EAe4C1c5E491aFFfFDd81F) | Deployed / ready |
| BTC / XRP | 10 minutes | BTC outperforms | [`0xCA9d02f2De268f57Fa27cC836436b12f68C523Ad`](https://basescan.org/address/0xCA9d02f2De268f57Fa27cC836436b12f68C523Ad) | Deployed / ready |
| BTC / XRP | 10 minutes | XRP outperforms | [`0xEd5b31eC3E68bCFDF645D3da3F884196F7d85553`](https://basescan.org/address/0xEd5b31eC3E68bCFDF645D3da3F884196F7d85553) | Deployed / ready |
| BTC / XRP | 1 hour | BTC outperforms | [`0x788AD173918D9a479edC7beF2e21f3194cd170aB`](https://basescan.org/address/0x788AD173918D9a479edC7beF2e21f3194cd170aB) | Deployed / ready |
| BTC / XRP | 1 hour | XRP outperforms | [`0x73694f18Bac6B798bcf36b19f2dcd1C683Fc578c`](https://basescan.org/address/0x73694f18Bac6B798bcf36b19f2dcd1C683Fc578c) | Deployed / ready |
| BTC / XRP | 1 day | BTC outperforms | [`0xa2D1f9c0d6B0d6190221515e5F3708bC9aEa7761`](https://basescan.org/address/0xa2D1f9c0d6B0d6190221515e5F3708bC9aEa7761) | Deployed / ready |
| BTC / XRP | 1 day | XRP outperforms | [`0xd2Df1cc7d0De6F1CA422Afc5A067a6e28827097E`](https://basescan.org/address/0xd2Df1cc7d0De6F1CA422Afc5A067a6e28827097E) | Deployed / ready |
| BTC / XRP | 1 week | BTC outperforms | [`0x913e5786EC9a92c4adA36e4334682d508B16d169`](https://basescan.org/address/0x913e5786EC9a92c4adA36e4334682d508B16d169) | Deployed / ready |
| BTC / XRP | 1 week | XRP outperforms | [`0x63b8459D2f543a2FB4498265A75CE7f1477B8dAB`](https://basescan.org/address/0x63b8459D2f543a2FB4498265A75CE7f1477B8dAB) | Deployed / ready |
| BTC / XRP | 30 days | BTC outperforms | [`0x974567b7455c250DF81016c00016549D7C1DcF52`](https://basescan.org/address/0x974567b7455c250DF81016c00016549D7C1DcF52) | Deployed / ready |
| BTC / XRP | 30 days | XRP outperforms | [`0x9a146572ed6600AeC823aC64881304BE68759226`](https://basescan.org/address/0x9a146572ed6600AeC823aC64881304BE68759226) | Deployed / ready |
| BTC / BNB | 1 minute | BTC outperforms | [`0xec9084935388be9eDA2870e8cc868A886fF8B71a`](https://basescan.org/address/0xec9084935388be9eDA2870e8cc868A886fF8B71a) | Deployed / ready |
| BTC / BNB | 1 minute | BNB outperforms | [`0x4b6B5d8b05FAd1a0673DB83FB8A784E9f8784f70`](https://basescan.org/address/0x4b6B5d8b05FAd1a0673DB83FB8A784E9f8784f70) | Deployed / ready |
| BTC / BNB | 10 minutes | BTC outperforms | [`0x8A0068cA7A14A1Db277CD2DcE68D2c5b76b4a54d`](https://basescan.org/address/0x8A0068cA7A14A1Db277CD2DcE68D2c5b76b4a54d) | Deployed / ready |
| BTC / BNB | 10 minutes | BNB outperforms | [`0x302270Be33409Cbf184534E366c3CCA7005DE5c0`](https://basescan.org/address/0x302270Be33409Cbf184534E366c3CCA7005DE5c0) | Deployed / ready |
| BTC / BNB | 1 hour | BTC outperforms | [`0x2115EB38e3e3FbC350efd6D82c766DE044d8BCb6`](https://basescan.org/address/0x2115EB38e3e3FbC350efd6D82c766DE044d8BCb6) | Deployed / ready |
| BTC / BNB | 1 hour | BNB outperforms | [`0x4f24422beedbbC58af601B2ebc44ddE40C452A31`](https://basescan.org/address/0x4f24422beedbbC58af601B2ebc44ddE40C452A31) | Deployed / ready |
| BTC / BNB | 1 day | BTC outperforms | [`0xAe468D519d64dd84C7e2b9F72f8b8f4f2198dA14`](https://basescan.org/address/0xAe468D519d64dd84C7e2b9F72f8b8f4f2198dA14) | Deployed / ready |
| BTC / BNB | 1 day | BNB outperforms | [`0x620622C8e68f0Aa093bF8102dffAb3896a59Ea1B`](https://basescan.org/address/0x620622C8e68f0Aa093bF8102dffAb3896a59Ea1B) | Deployed / ready |
| BTC / BNB | 1 week | BTC outperforms | [`0x33de7382C5638f1006a432d9776a60328E103bdd`](https://basescan.org/address/0x33de7382C5638f1006a432d9776a60328E103bdd) | Deployed / ready |
| BTC / BNB | 1 week | BNB outperforms | [`0x4122A1fAb0568B79f8Ae291cE629af2a08Dcb9E0`](https://basescan.org/address/0x4122A1fAb0568B79f8Ae291cE629af2a08Dcb9E0) | Deployed / ready |
| BTC / BNB | 30 days | BTC outperforms | [`0x4a4aF2A03Fb19e3dc8Cc2dbC0e544dE156c969C7`](https://basescan.org/address/0x4a4aF2A03Fb19e3dc8Cc2dbC0e544dE156c969C7) | Deployed / ready |
| BTC / BNB | 30 days | BNB outperforms | [`0x9791ccc81541e81a626B3745744aF22B840685Ff`](https://basescan.org/address/0x9791ccc81541e81a626B3745744aF22B840685Ff) | Deployed / ready |
| BTC / DOGE | 1 minute | BTC outperforms | [`0x5de87C9b56e17AA957fA4038f29168904628AE69`](https://basescan.org/address/0x5de87C9b56e17AA957fA4038f29168904628AE69) | Deployed / ready |
| BTC / DOGE | 1 minute | DOGE outperforms | [`0x4A36bea809525b66de96f65D720ae9AE790b0633`](https://basescan.org/address/0x4A36bea809525b66de96f65D720ae9AE790b0633) | Deployed / ready |
| BTC / DOGE | 10 minutes | BTC outperforms | [`0x3AF266fAe07626947C03B31f9E3638811402a555`](https://basescan.org/address/0x3AF266fAe07626947C03B31f9E3638811402a555) | Deployed / ready |
| BTC / DOGE | 10 minutes | DOGE outperforms | [`0x02989B3bDD20Fb06Bd7d7a139064bd7016c72366`](https://basescan.org/address/0x02989B3bDD20Fb06Bd7d7a139064bd7016c72366) | Deployed / ready |
| BTC / DOGE | 1 hour | BTC outperforms | [`0x9B134f90b79a7dFf5880BE513f79d38e87c2BdC0`](https://basescan.org/address/0x9B134f90b79a7dFf5880BE513f79d38e87c2BdC0) | Deployed / ready |
| BTC / DOGE | 1 hour | DOGE outperforms | [`0xB3E96BD68dCBcd6DF89C8542CC8622ACdf302c67`](https://basescan.org/address/0xB3E96BD68dCBcd6DF89C8542CC8622ACdf302c67) | Deployed / ready |
| BTC / DOGE | 1 day | BTC outperforms | [`0x1f50bd545df227Bb41937cFF11c54519B63a7c0c`](https://basescan.org/address/0x1f50bd545df227Bb41937cFF11c54519B63a7c0c) | Deployed / ready |
| BTC / DOGE | 1 day | DOGE outperforms | [`0x7212F589AB4e36f4687b65EF1cf8ABF2E88E47ff`](https://basescan.org/address/0x7212F589AB4e36f4687b65EF1cf8ABF2E88E47ff) | Deployed / ready |
| BTC / DOGE | 1 week | BTC outperforms | [`0x981Cc8f1bd42BfD009Df8F378f8c258c0b3B64d2`](https://basescan.org/address/0x981Cc8f1bd42BfD009Df8F378f8c258c0b3B64d2) | Deployed / ready |
| BTC / DOGE | 1 week | DOGE outperforms | [`0x57bBa838aFFfe007387c8d2f34b33D038333c8Eb`](https://basescan.org/address/0x57bBa838aFFfe007387c8d2f34b33D038333c8Eb) | Deployed / ready |
| BTC / DOGE | 30 days | BTC outperforms | [`0x2B049De743847bbfCaE4ca6354dc28969563C138`](https://basescan.org/address/0x2B049De743847bbfCaE4ca6354dc28969563C138) | Deployed / ready |
| BTC / DOGE | 30 days | DOGE outperforms | [`0x7aF026C4FEDD519a1405bB797A284f56cd0E2BC0`](https://basescan.org/address/0x7aF026C4FEDD519a1405bB797A284f56cd0E2BC0) | Deployed / ready |
| ETH / SOL | 1 minute | ETH outperforms | [`0x8Ca072F7306d513564e9163Ab169633F6cF762d2`](https://basescan.org/address/0x8Ca072F7306d513564e9163Ab169633F6cF762d2) | Deployed / ready |
| ETH / SOL | 1 minute | SOL outperforms | [`0xeD26b427A99c11494011B4D0D4F35894257fb5D7`](https://basescan.org/address/0xeD26b427A99c11494011B4D0D4F35894257fb5D7) | Deployed / ready |
| ETH / SOL | 10 minutes | ETH outperforms | [`0xdfe0a8353a091e2a97dc2Fecf6974B551bC5c614`](https://basescan.org/address/0xdfe0a8353a091e2a97dc2Fecf6974B551bC5c614) | Deployed / ready |
| ETH / SOL | 10 minutes | SOL outperforms | [`0xdb0D9EF4F47cDb18b84fE2bF7974332F936e0d3D`](https://basescan.org/address/0xdb0D9EF4F47cDb18b84fE2bF7974332F936e0d3D) | Deployed / ready |
| ETH / SOL | 1 hour | ETH outperforms | [`0xc318002FB072a3Bebfd6A5c793e6E52e88b1d6ab`](https://basescan.org/address/0xc318002FB072a3Bebfd6A5c793e6E52e88b1d6ab) | Deployed / ready |
| ETH / SOL | 1 hour | SOL outperforms | [`0xf229b5EeC2DcEc5Bb167Ee2EbE082C934AA25Ed8`](https://basescan.org/address/0xf229b5EeC2DcEc5Bb167Ee2EbE082C934AA25Ed8) | Deployed / ready |
| ETH / SOL | 1 day | ETH outperforms | [`0xa3CB8595e331764f9c1931ca9eE31DBFB0f7760f`](https://basescan.org/address/0xa3CB8595e331764f9c1931ca9eE31DBFB0f7760f) | Deployed / ready |
| ETH / SOL | 1 day | SOL outperforms | [`0x29E0dB72Fe6D865af9ce030D1FD493851A34710E`](https://basescan.org/address/0x29E0dB72Fe6D865af9ce030D1FD493851A34710E) | Deployed / ready |
| ETH / SOL | 1 week | ETH outperforms | [`0x506241c13fCa3815f43F387bD3CA31fF8eF384CA`](https://basescan.org/address/0x506241c13fCa3815f43F387bD3CA31fF8eF384CA) | Deployed / ready |
| ETH / SOL | 1 week | SOL outperforms | [`0xcC29da3270f5FC017Ab35c7C3000F5f02fDcda40`](https://basescan.org/address/0xcC29da3270f5FC017Ab35c7C3000F5f02fDcda40) | Deployed / ready |
| ETH / SOL | 30 days | ETH outperforms | [`0xA02b22161d88d1c817F32E4Cc6f2B2AA4Ce153Cc`](https://basescan.org/address/0xA02b22161d88d1c817F32E4Cc6f2B2AA4Ce153Cc) | Deployed / ready |
| ETH / SOL | 30 days | SOL outperforms | [`0x385BfB3F86602504c46b32BE60cC0Ff90b5522c4`](https://basescan.org/address/0x385BfB3F86602504c46b32BE60cC0Ff90b5522c4) | Deployed / ready |
| ETH / XRP | 1 minute | ETH outperforms | [`0x13C7b9617123DD111eCbb0f717423Ba12413E530`](https://basescan.org/address/0x13C7b9617123DD111eCbb0f717423Ba12413E530) | Deployed / ready |
| ETH / XRP | 1 minute | XRP outperforms | [`0x3f9A7544530Fd21a391Be675C65f39803C8E6827`](https://basescan.org/address/0x3f9A7544530Fd21a391Be675C65f39803C8E6827) | Deployed / ready |
| ETH / XRP | 10 minutes | ETH outperforms | [`0xE9736D6acA76BF63A813D7d6399fABc9a2F9668D`](https://basescan.org/address/0xE9736D6acA76BF63A813D7d6399fABc9a2F9668D) | Deployed / ready |
| ETH / XRP | 10 minutes | XRP outperforms | [`0xBd543b07051b2BD25811bEc009bD92A692bE85fe`](https://basescan.org/address/0xBd543b07051b2BD25811bEc009bD92A692bE85fe) | Deployed / ready |
| ETH / XRP | 1 hour | ETH outperforms | [`0x0f3C3214F2427edeA1531ea171bf96FCff6C5d8f`](https://basescan.org/address/0x0f3C3214F2427edeA1531ea171bf96FCff6C5d8f) | Deployed / ready |
| ETH / XRP | 1 hour | XRP outperforms | [`0x8bCB3d5b4F010eCBef60F6D3ddb4ea408A4FB9bc`](https://basescan.org/address/0x8bCB3d5b4F010eCBef60F6D3ddb4ea408A4FB9bc) | Deployed / ready |
| ETH / XRP | 1 day | ETH outperforms | [`0xdeE3cFe93C361f69f5D60991F8aB72C21D5BC0f9`](https://basescan.org/address/0xdeE3cFe93C361f69f5D60991F8aB72C21D5BC0f9) | Deployed / ready |
| ETH / XRP | 1 day | XRP outperforms | [`0x6B933eA464fb46f99751C33409070E0808951d18`](https://basescan.org/address/0x6B933eA464fb46f99751C33409070E0808951d18) | Deployed / ready |
| ETH / XRP | 1 week | ETH outperforms | [`0xa35B9AC7b4F38C150ab4a3612ec49950B9c48E18`](https://basescan.org/address/0xa35B9AC7b4F38C150ab4a3612ec49950B9c48E18) | Deployed / ready |
| ETH / XRP | 1 week | XRP outperforms | [`0xA1fba3A63Bf944c3AC0968952855435C98fE650C`](https://basescan.org/address/0xA1fba3A63Bf944c3AC0968952855435C98fE650C) | Deployed / ready |
| ETH / XRP | 30 days | ETH outperforms | [`0xC883224044E43ec7555fAb74e686B3064b022A3C`](https://basescan.org/address/0xC883224044E43ec7555fAb74e686B3064b022A3C) | Deployed / ready |
| ETH / XRP | 30 days | XRP outperforms | [`0xbC8A8C021C6C76493204e735623B94115F75c0F8`](https://basescan.org/address/0xbC8A8C021C6C76493204e735623B94115F75c0F8) | Deployed / ready |
| ETH / BNB | 1 minute | ETH outperforms | [`0xC5aA5CC9DdA9C9b657b2956B2c77102581D8eABb`](https://basescan.org/address/0xC5aA5CC9DdA9C9b657b2956B2c77102581D8eABb) | Deployed / ready |
| ETH / BNB | 1 minute | BNB outperforms | [`0x948fe687D1954DbdbC12505F5EFd88f93aB1c048`](https://basescan.org/address/0x948fe687D1954DbdbC12505F5EFd88f93aB1c048) | Deployed / ready |
| ETH / BNB | 10 minutes | ETH outperforms | [`0x258DaDc1CE9796880fC12eEEf903CE047a8Ef91E`](https://basescan.org/address/0x258DaDc1CE9796880fC12eEEf903CE047a8Ef91E) | Deployed / ready |
| ETH / BNB | 10 minutes | BNB outperforms | [`0xFdBc3F36E712641D4346B361979112D632fd4EC0`](https://basescan.org/address/0xFdBc3F36E712641D4346B361979112D632fd4EC0) | Deployed / ready |
| ETH / BNB | 1 hour | ETH outperforms | [`0xCdf26AAEC42D020Eae6480eBCB9F49F07Ad184AC`](https://basescan.org/address/0xCdf26AAEC42D020Eae6480eBCB9F49F07Ad184AC) | Deployed / ready |
| ETH / BNB | 1 hour | BNB outperforms | [`0xc02aDd71b1a813dfaEb118b024A70B15314eA9EF`](https://basescan.org/address/0xc02aDd71b1a813dfaEb118b024A70B15314eA9EF) | Deployed / ready |
| ETH / BNB | 1 day | ETH outperforms | [`0x14ee1b708555a673a6Da7487598924425539eCA3`](https://basescan.org/address/0x14ee1b708555a673a6Da7487598924425539eCA3) | Deployed / ready |
| ETH / BNB | 1 day | BNB outperforms | [`0xD4CC152451dD421Cb3dFf95B5Dc539DA60bD538c`](https://basescan.org/address/0xD4CC152451dD421Cb3dFf95B5Dc539DA60bD538c) | Deployed / ready |
| ETH / BNB | 1 week | ETH outperforms | [`0xC949784fdd9067f9197D18e09004675eE6053410`](https://basescan.org/address/0xC949784fdd9067f9197D18e09004675eE6053410) | Deployed / ready |
| ETH / BNB | 1 week | BNB outperforms | [`0x73bc1Fe46d90EBe281F263362dD7F7f0b2CDB94D`](https://basescan.org/address/0x73bc1Fe46d90EBe281F263362dD7F7f0b2CDB94D) | Deployed / ready |
| ETH / BNB | 30 days | ETH outperforms | [`0xeE52D340A575520689859A190eFa52E9ae3935a1`](https://basescan.org/address/0xeE52D340A575520689859A190eFa52E9ae3935a1) | Deployed / ready |
| ETH / BNB | 30 days | BNB outperforms | [`0x7e6b30efAbC843BD1Cba6245Bf80625E2F0ff3f4`](https://basescan.org/address/0x7e6b30efAbC843BD1Cba6245Bf80625E2F0ff3f4) | Deployed / ready |
| ETH / DOGE | 1 minute | ETH outperforms | [`0x99282186e8ADa46345434371B8e12B092F1b1812`](https://basescan.org/address/0x99282186e8ADa46345434371B8e12B092F1b1812) | Deployed / ready |
| ETH / DOGE | 1 minute | DOGE outperforms | [`0xb3AD647f7552eDaF3fb4aA5Ec7a73B36C431ee4C`](https://basescan.org/address/0xb3AD647f7552eDaF3fb4aA5Ec7a73B36C431ee4C) | Deployed / ready |
| ETH / DOGE | 10 minutes | ETH outperforms | [`0x9f661e14Cd8dE60A37f049A76BDf17600269Cf73`](https://basescan.org/address/0x9f661e14Cd8dE60A37f049A76BDf17600269Cf73) | Deployed / ready |
| ETH / DOGE | 10 minutes | DOGE outperforms | [`0x504814d97522238a15507b0D8eE6982E06460Fb3`](https://basescan.org/address/0x504814d97522238a15507b0D8eE6982E06460Fb3) | Deployed / ready |
| ETH / DOGE | 1 hour | ETH outperforms | [`0xef5b4550e0ca22a6245177D63363A47cD875aC1b`](https://basescan.org/address/0xef5b4550e0ca22a6245177D63363A47cD875aC1b) | Deployed / ready |
| ETH / DOGE | 1 hour | DOGE outperforms | [`0x38269C774789aA8C9E18072396822590202CC66c`](https://basescan.org/address/0x38269C774789aA8C9E18072396822590202CC66c) | Deployed / ready |
| ETH / DOGE | 1 day | ETH outperforms | [`0xC412Cb56A3dca0eb84950e078f021a2839b2F4e8`](https://basescan.org/address/0xC412Cb56A3dca0eb84950e078f021a2839b2F4e8) | Deployed / ready |
| ETH / DOGE | 1 day | DOGE outperforms | [`0xD7FE01ee4C1A624ffF9FDecA0f82cde479Bb3340`](https://basescan.org/address/0xD7FE01ee4C1A624ffF9FDecA0f82cde479Bb3340) | Deployed / ready |
| ETH / DOGE | 1 week | ETH outperforms | [`0x8BBaCec591EaBA7416f8a0C28a009699BBC208Ab`](https://basescan.org/address/0x8BBaCec591EaBA7416f8a0C28a009699BBC208Ab) | Deployed / ready |
| ETH / DOGE | 1 week | DOGE outperforms | [`0x3a8D051f18E044508A86aeC81ca9a0865Ff752bB`](https://basescan.org/address/0x3a8D051f18E044508A86aeC81ca9a0865Ff752bB) | Deployed / ready |
| ETH / DOGE | 30 days | ETH outperforms | [`0xa04C6311fad730Ca468Fa458521A9f68AAb454f7`](https://basescan.org/address/0xa04C6311fad730Ca468Fa458521A9f68AAb454f7) | Deployed / ready |
| ETH / DOGE | 30 days | DOGE outperforms | [`0x5351AFFa8d903A1D940937c912372a738B393C17`](https://basescan.org/address/0x5351AFFa8d903A1D940937c912372a738B393C17) | Deployed / ready |
| SOL / XRP | 1 minute | SOL outperforms | [`0xF300923FE0FB2EFF0084cf0EE82fF4648d7E8854`](https://basescan.org/address/0xF300923FE0FB2EFF0084cf0EE82fF4648d7E8854) | Deployed / ready |
| SOL / XRP | 1 minute | XRP outperforms | [`0xbb028E88770e4fF2D1ec7eEab29C90817e2cd71A`](https://basescan.org/address/0xbb028E88770e4fF2D1ec7eEab29C90817e2cd71A) | Deployed / ready |
| SOL / XRP | 10 minutes | SOL outperforms | [`0x6a5d35C5A4Cc75C38b3638d5Ed62F4331f33ef15`](https://basescan.org/address/0x6a5d35C5A4Cc75C38b3638d5Ed62F4331f33ef15) | Deployed / ready |
| SOL / XRP | 10 minutes | XRP outperforms | [`0x167B9847C6ab9811942ade36e1244A3f19B121D2`](https://basescan.org/address/0x167B9847C6ab9811942ade36e1244A3f19B121D2) | Deployed / ready |
| SOL / XRP | 1 hour | SOL outperforms | [`0xD42C5EB769F74d5e3573274a62e85be6973f8d23`](https://basescan.org/address/0xD42C5EB769F74d5e3573274a62e85be6973f8d23) | Deployed / ready |
| SOL / XRP | 1 hour | XRP outperforms | [`0xDAaaE5695d6c2275E851425ceaAA16aD7628E336`](https://basescan.org/address/0xDAaaE5695d6c2275E851425ceaAA16aD7628E336) | Deployed / ready |
| SOL / XRP | 1 day | SOL outperforms | [`0xDc6b3F29298ceDB34f23eF506b3F074DbAD67d4B`](https://basescan.org/address/0xDc6b3F29298ceDB34f23eF506b3F074DbAD67d4B) | Deployed / ready |
| SOL / XRP | 1 day | XRP outperforms | [`0x3Fa065114daA0cF66b0326cE725B6Fd2DB7D3a98`](https://basescan.org/address/0x3Fa065114daA0cF66b0326cE725B6Fd2DB7D3a98) | Deployed / ready |
| SOL / XRP | 1 week | SOL outperforms | [`0x7BdfF24d265cBe893CD5243836D772099B58A910`](https://basescan.org/address/0x7BdfF24d265cBe893CD5243836D772099B58A910) | Deployed / ready |
| SOL / XRP | 1 week | XRP outperforms | [`0x9296B0a56D0C96D1Fe63C8966421e82617f6D7FB`](https://basescan.org/address/0x9296B0a56D0C96D1Fe63C8966421e82617f6D7FB) | Deployed / ready |
| SOL / XRP | 30 days | SOL outperforms | [`0x7E479D36481178585e1116a38f44FE5F49362c35`](https://basescan.org/address/0x7E479D36481178585e1116a38f44FE5F49362c35) | Deployed / ready |
| SOL / XRP | 30 days | XRP outperforms | [`0xcc97748ddfb1E32c7C5585C06f88FDcf1BAD4D82`](https://basescan.org/address/0xcc97748ddfb1E32c7C5585C06f88FDcf1BAD4D82) | Deployed / ready |
| SOL / BNB | 1 minute | SOL outperforms | [`0x69EaAE3D37dda20E81FdBF3a20d51ccd698F2f7d`](https://basescan.org/address/0x69EaAE3D37dda20E81FdBF3a20d51ccd698F2f7d) | Deployed / ready |
| SOL / BNB | 1 minute | BNB outperforms | [`0x05a06f9784031B64F8DC4cAed25C584b1578b1AF`](https://basescan.org/address/0x05a06f9784031B64F8DC4cAed25C584b1578b1AF) | Deployed / ready |
| SOL / BNB | 10 minutes | SOL outperforms | [`0xFE82746FccEdb506fA8Ee376dFCa35Ea36D54a00`](https://basescan.org/address/0xFE82746FccEdb506fA8Ee376dFCa35Ea36D54a00) | Deployed / ready |
| SOL / BNB | 10 minutes | BNB outperforms | [`0x3e415D12285C5543930086422B4851e2E8Dbedc4`](https://basescan.org/address/0x3e415D12285C5543930086422B4851e2E8Dbedc4) | Deployed / ready |
| SOL / BNB | 1 hour | SOL outperforms | [`0x65fA258065A53b359AE58fc0d65B735dCd2bE0CD`](https://basescan.org/address/0x65fA258065A53b359AE58fc0d65B735dCd2bE0CD) | Deployed / ready |
| SOL / BNB | 1 hour | BNB outperforms | [`0xf7Ef7d24D0Fb2E5AAE15092F7FE819C692B2f665`](https://basescan.org/address/0xf7Ef7d24D0Fb2E5AAE15092F7FE819C692B2f665) | Deployed / ready |
| SOL / BNB | 1 day | SOL outperforms | [`0x341279ef9958ef74e96A4B13a9197497680097F9`](https://basescan.org/address/0x341279ef9958ef74e96A4B13a9197497680097F9) | Deployed / ready |
| SOL / BNB | 1 day | BNB outperforms | [`0x547bA41614c2D520FDAdA4D90d484068809D2ab0`](https://basescan.org/address/0x547bA41614c2D520FDAdA4D90d484068809D2ab0) | Deployed / ready |
| SOL / BNB | 1 week | SOL outperforms | [`0xaA33EDb02b77F3B4BE96aC67D92BdA20d85C7B98`](https://basescan.org/address/0xaA33EDb02b77F3B4BE96aC67D92BdA20d85C7B98) | Deployed / ready |
| SOL / BNB | 1 week | BNB outperforms | [`0xee1800e0E1A84fDA65e5eD120B41763aF53453C2`](https://basescan.org/address/0xee1800e0E1A84fDA65e5eD120B41763aF53453C2) | Deployed / ready |
| SOL / BNB | 30 days | SOL outperforms | [`0xC887D874FD322DC7117cF9bb4DDeB506b0DC716a`](https://basescan.org/address/0xC887D874FD322DC7117cF9bb4DDeB506b0DC716a) | Deployed / ready |
| SOL / BNB | 30 days | BNB outperforms | [`0x1693D858055CC5252229642B8708e0aE745654E6`](https://basescan.org/address/0x1693D858055CC5252229642B8708e0aE745654E6) | Deployed / ready |
| SOL / DOGE | 1 minute | SOL outperforms | [`0x4b51c9e40277edef27EEd5fb10bCf541a9450172`](https://basescan.org/address/0x4b51c9e40277edef27EEd5fb10bCf541a9450172) | Deployed / ready |
| SOL / DOGE | 1 minute | DOGE outperforms | [`0xCc0B3fb07F577C936982585a7bc71D6B382e9a80`](https://basescan.org/address/0xCc0B3fb07F577C936982585a7bc71D6B382e9a80) | Deployed / ready |
| SOL / DOGE | 10 minutes | SOL outperforms | [`0x6dBfc7a5dB64d1157A3C2A1F6E4B59F7a96F051b`](https://basescan.org/address/0x6dBfc7a5dB64d1157A3C2A1F6E4B59F7a96F051b) | Deployed / ready |
| SOL / DOGE | 10 minutes | DOGE outperforms | [`0xEAe960157cE9EBaBB27F7d4330ed0C835F4c03fd`](https://basescan.org/address/0xEAe960157cE9EBaBB27F7d4330ed0C835F4c03fd) | Deployed / ready |
| SOL / DOGE | 1 hour | SOL outperforms | [`0x67E14808cd06e5fb6518CE155414A944D9B8258b`](https://basescan.org/address/0x67E14808cd06e5fb6518CE155414A944D9B8258b) | Deployed / ready |
| SOL / DOGE | 1 hour | DOGE outperforms | [`0x6a1765127376DE970b67B6B1Ce1d42E9B931eb4d`](https://basescan.org/address/0x6a1765127376DE970b67B6B1Ce1d42E9B931eb4d) | Deployed / ready |
| SOL / DOGE | 1 day | SOL outperforms | [`0x066942319712360A3590D5Abae381412E76bC7bd`](https://basescan.org/address/0x066942319712360A3590D5Abae381412E76bC7bd) | Deployed / ready |
| SOL / DOGE | 1 day | DOGE outperforms | [`0xc4F17b8c0f1baCE98966857FEf3437F4Ea05e874`](https://basescan.org/address/0xc4F17b8c0f1baCE98966857FEf3437F4Ea05e874) | Deployed / ready |
| SOL / DOGE | 1 week | SOL outperforms | [`0x793eaABf945eF18734fdB2F92BE997681e434003`](https://basescan.org/address/0x793eaABf945eF18734fdB2F92BE997681e434003) | Deployed / ready |
| SOL / DOGE | 1 week | DOGE outperforms | [`0xefE80cc74a00D7a5c447173230F32C1a3ECAC7D7`](https://basescan.org/address/0xefE80cc74a00D7a5c447173230F32C1a3ECAC7D7) | Deployed / ready |
| SOL / DOGE | 30 days | SOL outperforms | [`0x2044Bf9E3Cc7EF940c01F8c562B1902E5CDc8e0c`](https://basescan.org/address/0x2044Bf9E3Cc7EF940c01F8c562B1902E5CDc8e0c) | Deployed / ready |
| SOL / DOGE | 30 days | DOGE outperforms | [`0x0ab4F9b9afe839209fc6CFa3F05c93fb23B7C832`](https://basescan.org/address/0x0ab4F9b9afe839209fc6CFa3F05c93fb23B7C832) | Deployed / ready |
| XRP / BNB | 1 minute | XRP outperforms | [`0x968bFee23BbB0A3572A4c235C4F5996A72D4Ef90`](https://basescan.org/address/0x968bFee23BbB0A3572A4c235C4F5996A72D4Ef90) | Deployed / ready |
| XRP / BNB | 1 minute | BNB outperforms | [`0x80E560e5a2B40be302323FAf5eDE647D1aB445fa`](https://basescan.org/address/0x80E560e5a2B40be302323FAf5eDE647D1aB445fa) | Deployed / ready |
| XRP / BNB | 10 minutes | XRP outperforms | [`0xC60D6cA90Afe586c6032Ae3FB82Cd4EB60E67469`](https://basescan.org/address/0xC60D6cA90Afe586c6032Ae3FB82Cd4EB60E67469) | Deployed / ready |
| XRP / BNB | 10 minutes | BNB outperforms | [`0xaae0b1B1331165C7f4c66377b4ce46800a31B34e`](https://basescan.org/address/0xaae0b1B1331165C7f4c66377b4ce46800a31B34e) | Deployed / ready |
| XRP / BNB | 1 hour | XRP outperforms | [`0x6D5BDa39772018A2496D5db6D8bCb0764F7220cD`](https://basescan.org/address/0x6D5BDa39772018A2496D5db6D8bCb0764F7220cD) | Deployed / ready |
| XRP / BNB | 1 hour | BNB outperforms | [`0xBA444617bdAE182AA64c9afa8Bd388C9ca18bf05`](https://basescan.org/address/0xBA444617bdAE182AA64c9afa8Bd388C9ca18bf05) | Deployed / ready |
| XRP / BNB | 1 day | XRP outperforms | [`0x5478244057648D48750590Ba5A402052bC65120f`](https://basescan.org/address/0x5478244057648D48750590Ba5A402052bC65120f) | Deployed / ready |
| XRP / BNB | 1 day | BNB outperforms | [`0x469624301cA068d2838079C72625fc3c86B0c532`](https://basescan.org/address/0x469624301cA068d2838079C72625fc3c86B0c532) | Deployed / ready |
| XRP / BNB | 1 week | XRP outperforms | [`0xD5bA27fb428c2e04141657F5a3fE28795166B3e3`](https://basescan.org/address/0xD5bA27fb428c2e04141657F5a3fE28795166B3e3) | Deployed / ready |
| XRP / BNB | 1 week | BNB outperforms | [`0x697BD0822890A9Eac525b26c6566172F114FE007`](https://basescan.org/address/0x697BD0822890A9Eac525b26c6566172F114FE007) | Deployed / ready |
| XRP / BNB | 30 days | XRP outperforms | [`0x6e9952614DDE344C82490257c248C9A296d5f68d`](https://basescan.org/address/0x6e9952614DDE344C82490257c248C9A296d5f68d) | Deployed / ready |
| XRP / BNB | 30 days | BNB outperforms | [`0xdF52a090fD40e45C5Dc5AF8d5F339643bFC83338`](https://basescan.org/address/0xdF52a090fD40e45C5Dc5AF8d5F339643bFC83338) | Deployed / ready |
| XRP / DOGE | 1 minute | XRP outperforms | [`0x8a38E3d74478E5b93F510c90570910817E9eb0C4`](https://basescan.org/address/0x8a38E3d74478E5b93F510c90570910817E9eb0C4) | Deployed / ready |
| XRP / DOGE | 1 minute | DOGE outperforms | [`0x52BF9092c200F60DC71a090d90F5b86eEdf75aDF`](https://basescan.org/address/0x52BF9092c200F60DC71a090d90F5b86eEdf75aDF) | Deployed / ready |
| XRP / DOGE | 10 minutes | XRP outperforms | [`0x9c9bB50800101Cc881d34ab9098Ae3f50B92f0a8`](https://basescan.org/address/0x9c9bB50800101Cc881d34ab9098Ae3f50B92f0a8) | Deployed / ready |
| XRP / DOGE | 10 minutes | DOGE outperforms | [`0x1CDb12ec7048795C5C8685C39b83178C8466c274`](https://basescan.org/address/0x1CDb12ec7048795C5C8685C39b83178C8466c274) | Deployed / ready |
| XRP / DOGE | 1 hour | XRP outperforms | [`0xDe3a034A96ADacBfB482732AE2eFee5c15c7d635`](https://basescan.org/address/0xDe3a034A96ADacBfB482732AE2eFee5c15c7d635) | Deployed / ready |
| XRP / DOGE | 1 hour | DOGE outperforms | [`0x64a2afC6f983eaAe253A6Ed3eb8D1009e73E604b`](https://basescan.org/address/0x64a2afC6f983eaAe253A6Ed3eb8D1009e73E604b) | Deployed / ready |
| XRP / DOGE | 1 day | XRP outperforms | [`0xCF66F80f824b6BD933f9EcDb18FefC75E8C0eE87`](https://basescan.org/address/0xCF66F80f824b6BD933f9EcDb18FefC75E8C0eE87) | Deployed / ready |
| XRP / DOGE | 1 day | DOGE outperforms | [`0x81000683f80F50843e6425fca56CE0470a1330d6`](https://basescan.org/address/0x81000683f80F50843e6425fca56CE0470a1330d6) | Deployed / ready |
| XRP / DOGE | 1 week | XRP outperforms | [`0x73b6929c5B655d35471b875E5c42A1f60b1052dE`](https://basescan.org/address/0x73b6929c5B655d35471b875E5c42A1f60b1052dE) | Deployed / ready |
| XRP / DOGE | 1 week | DOGE outperforms | [`0x04734a03A8639fb4dF20D8A001654FE2B8f980b3`](https://basescan.org/address/0x04734a03A8639fb4dF20D8A001654FE2B8f980b3) | Deployed / ready |
| XRP / DOGE | 30 days | XRP outperforms | [`0x215070f1FE9B00119F2254512931Bda314FD033e`](https://basescan.org/address/0x215070f1FE9B00119F2254512931Bda314FD033e) | Deployed / ready |
| XRP / DOGE | 30 days | DOGE outperforms | [`0x1D6bfA6c552D7Aa323C11A8DDA7C10F249D0ef97`](https://basescan.org/address/0x1D6bfA6c552D7Aa323C11A8DDA7C10F249D0ef97) | Deployed / ready |
| BNB / DOGE | 1 minute | BNB outperforms | [`0xd20d1156B4b58c4eF673456Fb088f616C80ea183`](https://basescan.org/address/0xd20d1156B4b58c4eF673456Fb088f616C80ea183) | Deployed / ready |
| BNB / DOGE | 1 minute | DOGE outperforms | [`0x05Aa11C9d86E6462C1f40cde092314477E3c806A`](https://basescan.org/address/0x05Aa11C9d86E6462C1f40cde092314477E3c806A) | Deployed / ready |
| BNB / DOGE | 10 minutes | BNB outperforms | [`0x73734E4E9a4f26d28D6BFa4682b76D5446B5d108`](https://basescan.org/address/0x73734E4E9a4f26d28D6BFa4682b76D5446B5d108) | Deployed / ready |
| BNB / DOGE | 10 minutes | DOGE outperforms | [`0xB81eC0814D45EFc3F3F0Ad5287d32ACfAfb5Caf9`](https://basescan.org/address/0xB81eC0814D45EFc3F3F0Ad5287d32ACfAfb5Caf9) | Deployed / ready |
| BNB / DOGE | 1 hour | BNB outperforms | [`0x97b5b4E41C95607e8CB9A27d6523151C3e1FC4F7`](https://basescan.org/address/0x97b5b4E41C95607e8CB9A27d6523151C3e1FC4F7) | Deployed / ready |
| BNB / DOGE | 1 hour | DOGE outperforms | [`0x93830C31Bf83dBDC942373d70eE33ce8912b3841`](https://basescan.org/address/0x93830C31Bf83dBDC942373d70eE33ce8912b3841) | Deployed / ready |
| BNB / DOGE | 1 day | BNB outperforms | [`0x15D7253683d06dcAc50720920036a2203e65Ab0F`](https://basescan.org/address/0x15D7253683d06dcAc50720920036a2203e65Ab0F) | Deployed / ready |
| BNB / DOGE | 1 day | DOGE outperforms | [`0x0642258577F4bE48024e9BcABE21a5ba2F732A1A`](https://basescan.org/address/0x0642258577F4bE48024e9BcABE21a5ba2F732A1A) | Deployed / ready |
| BNB / DOGE | 1 week | BNB outperforms | [`0x91663693D30797eCD090EC9625A8E91be083576A`](https://basescan.org/address/0x91663693D30797eCD090EC9625A8E91be083576A) | Deployed / ready |
| BNB / DOGE | 1 week | DOGE outperforms | [`0xCc7c00506db27B2d96EB75Dcc0c793e52685C24A`](https://basescan.org/address/0xCc7c00506db27B2d96EB75Dcc0c793e52685C24A) | Deployed / ready |
| BNB / DOGE | 30 days | BNB outperforms | [`0x7feb43b2Bf66c868Cfe5A32554a2A4c6FdaB6460`](https://basescan.org/address/0x7feb43b2Bf66c868Cfe5A32554a2A4c6FdaB6460) | Deployed / ready |
| BNB / DOGE | 30 days | DOGE outperforms | [`0xF4D7661C0b67a62353be3fBbB16a718747cb700f`](https://basescan.org/address/0xF4D7661C0b67a62353be3fBbB16a718747cb700f) | Deployed / ready |

## Agents and automation

Use [live-eth-addresses.json](live-eth-addresses.json). Filter for `ready: true`, confirm `chainId: 8453`, then recheck bytecode, factory membership, Core minimum, active operator and supported assets on-chain before sending real funds. The timestamped catalog is not a live availability or price feed. Never treat `ready: false` as a payment destination. Outcome descriptions are informational, not a recommendation to bet.
