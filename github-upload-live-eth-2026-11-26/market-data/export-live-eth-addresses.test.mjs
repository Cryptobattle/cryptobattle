import assert from 'node:assert/strict';
import { test } from 'node:test';
import { combinations, markdown, OPERATOR } from './export-live-eth-addresses.mjs';
const assets = [{id: 0, symbol: 'BTC'}, {id: 1, symbol: 'ETH'}, {id: 2, symbol: 'SOL'}, {id: 3, symbol: 'XRP'}, {id: 4, symbol: 'BNB'}, {id: 5, symbol: 'DOGE'}];
const periods = [60,600,3600,86400,604800,2592000].map(seconds => ({seconds,label:String(seconds),entryWindowSeconds:30}));
test('six assets give 180 unique canonical sides without reversed duplicate pools', () => {
 const rows = combinations(assets, periods, OPERATOR);
 assert.equal(rows.length, 180);
 assert.equal(new Set(rows.map(row => `${row.key.assetA}:${row.key.assetB}:${row.key.duration}:${row.key.sideB}`)).size, 180);
 for (const row of rows) {
  assert.ok(row.key.assetA < row.key.assetB);
  assert.equal(row.selectedAsset, row.key.sideB ? row.assetB.symbol : row.assetA.symbol);
  assert.equal(row.key.operator, OPERATOR);
  assert.equal(BigInt(row.key.beneficiary), 0n);
 }
 assert.throws(() => combinations([assets[1],assets[0]], periods, OPERATOR), /sorted/);
});
test('published guide marks predicted destinations unusable and supplies chain and verification context', () => {
 const rows = combinations(assets.slice(0,2),periods.slice(0,1), OPERATOR).map((row,i) => ({...row, address:`0x${String(i+1).repeat(40)}`, ready:i===0}));
 const text = markdown({operator:OPERATOR,factory:'factory',core:'core',minimumDepositEth:'0.025',verifiedAtBlock:'123',verifiedAtUtc:'2026-11-26T00:00:00.000Z',summary:{deployed:1,total:2},periods:periods.slice(0,1),addresses:rows});
 assert.match(text,/8453/);
 assert.match(text,/123/);
 assert.match(text,/Predicted \/ NOT deployed — do not send/);
 assert.match(text,/ready: true/);
 assert.match(text,/personal wallet/);
 assert.match(text,/not a live availability/);
});
