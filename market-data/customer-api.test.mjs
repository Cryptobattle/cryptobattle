import test from 'node:test';
import assert from 'node:assert/strict';
import { encodeAbiParameters,encodeEventTopics,parseAbiParameters,stringToHex } from 'viem';
import {customerMarkets,customerReceipt} from './customer-api.mjs';
const core='0x'+'1'.repeat(40),operator='0x'+'2'.repeat(40),other='0x'+'3'.repeat(40),registry='0x'+'4'.repeat(40),id='0x'+'a'.repeat(64),hash='0x'+'b'.repeat(64);
test('market discovery uses enabled registry assets and each core minimum',async()=>{
  const client={readContract:async({functionName,address})=>functionName==='assetRegistry'?registry:functionName==='minDeposit'?(address===core?50_000_000n:25_000_000_000_000_000n):[[stringToHex('BTC',{size:32}),stringToHex('ETH',{size:32}),stringToHex('SOL',{size:32})],[true,true,false]]};
  const result=await customerMarkets(client,new Map([['USDC',core],['ETH',other]]));
  assert.deepEqual(result.assets,[{id:0,symbol:'BTC'},{id:1,symbol:'ETH'}]);
  assert.equal(result.settlementAssets[0].minimumDeposit,'50000000');assert.equal(result.settlementAssets[1].decimals,18);
});
test('foreign core registries are rejected',async()=>{
  const client={readContract:async({functionName,address})=>functionName==='assetRegistry'?address:50n};
  await assert.rejects(customerMarkets(client,new Map([['USDC',core],['ETH',other]])),/different asset registries/);
});
test('receipt tracking rejects spoofed emitters and other operator events',async()=>{
  const event={type:'event',name:'DepositRecorded',inputs:[{name:'id',type:'bytes32',indexed:true},{name:'start',type:'uint64',indexed:true},{name:'beneficiary',type:'address',indexed:true},{name:'sideB',type:'bool'},{name:'index',type:'uint256'},{name:'operator',type:'address'},{name:'amount',type:'uint128'}]};
  const log=(address,op)=>({address,topics:encodeEventTopics({abi:[event],eventName:'DepositRecorded',args:{id,start:100n,beneficiary:other}}),data:encodeAbiParameters(parseAbiParameters('bool,uint256,address,uint128'),[false,0n,op,50_000_000n])});
  const client={getTransactionReceipt:async()=>({status:'success',logs:[log(core,operator),log(other,operator),log(core,other)]}),getChainId:async()=>8453,readContract:async({functionName})=>functionName==='roundInfo'?[100n,700n,false,0,0n,1n,0n]:[0,1,false,false,false,false,false,false]};
  const response=await customerReceipt(client,new Map([['USDC',core]]),operator,new URLSearchParams({settlementAsset:'USDC',hash}));
  assert.equal(response.body.bets.length,1);assert.equal(response.body.bets[0].duration,600);assert.equal(response.body.bets[0].amount,'50000000');
  assert.equal((await customerReceipt(client,new Map([['USDC',core]]),operator,new URLSearchParams({settlementAsset:'USDC',hash:'bad'}))).status,400);
  client.getTransactionReceipt=async()=>({status:'reverted'});
  assert.equal((await customerReceipt(client,new Map([['USDC',core]]),operator,new URLSearchParams({settlementAsset:'USDC',hash}))).status,400);
});
