import test from 'node:test';
import assert from 'node:assert/strict';
import {createCustomerBot,decodeReceiptStart,frontendBetLink} from './customer-core.mjs';
import {receiptStart,customerDraft} from '../frontend/src/customer-links.ts';
const operator='0x'+'1'.repeat(40),hash='0x'+'b'.repeat(64),id='0x'+'a'.repeat(64);
const metadata={chainId:8453,operator,assets:[{id:0,symbol:'BTC'},{id:1,symbol:'ETH'},{id:2,symbol:'SOL'}],settlementAssets:[{symbol:'USDC',decimals:6,minimumDeposit:'50000000'},{symbol:'ETH',decimals:18,minimumDeposit:'25000000000000000'}],durations:[60,600,3600,86400,604800,2592000]};
function fixture(){
  const sent=[],requests=[],state={users:{}};
  let outcome={result:'pending',paid:false,matched:'50000000'};
  const api=async path=>{requests.push(path);if(path.includes('/markets'))return metadata;if(path.includes('/receipt'))return {chainId:8453,bets:[{settlementAsset:'USDC',id,start:'100',side:'A',index:'0',amount:'50000000',assetA:0,assetB:1,duration:600}]};if(path.includes('/status'))return outcome;return {totalA:'50000000',totalB:'50010000',matchedPerSide:'50000000',start:100};};
  const bot=createCustomerBot({state,api,save:async()=>{},send:async(...args)=>sent.push(args),frontendUrl:'https://operator.example/',operator,chainId:8453});
  const message=text=>bot.handle({message:{chat:{id:123,type:'private'},from:{id:123},text}});
  const click=data=>bot.handle({callback_query:{id:'callback',from:{id:123},message:{chat:{id:123,type:'private'}},data}});
  return {bot,state,sent,requests,message,click,setOutcome:value=>{outcome=value}};
}
test('frontend receipt payload round-trips within Telegram start limit and checks network',()=>{
  const token=receiptStart(8453,'USDC',hash);assert.ok(token.length<=64);
  assert.deepEqual(decodeReceiptStart(token),{chainId:8453,settlementAsset:'USDC',hash});
  assert.throws(()=>decodeReceiptStart('tx_invalid'));
  assert.throws(()=>receiptStart(1,'USDC',hash));
});
test('buttons build a canonical selection and prefill never overrides wallet or operator',async()=>{
  const f=fixture();await f.message('/new');await f.click('duration:600');await f.click('side:B');await f.click('amount');await f.message('50.01');
  const button=f.sent.at(-1)[2].flat().find(b=>b.url);
  const u=new URL(button.url);const draft=customerDraft(u.search);
  assert.deepEqual(draft,{settlementAsset:'USDC',assetA:0,assetB:1,duration:600,sideB:true,amount:'50.01'});
  assert.equal(u.searchParams.has('operator'),false);assert.equal(u.searchParams.has('beneficiary'),false);
  assert.equal(customerDraft('?source=telegram&assetA=1&assetB=0&duration=600'),undefined);
  assert.equal(customerDraft('?source=telegram&assetA=0&assetB=1&duration=600&side=A&settlementAsset=USDC&amount=-1'),undefined);
  const original=f.state.users['123'].draft.amount;await f.click('amount');await f.message('49.99');assert.equal(f.state.users['123'].draft.amount,original);
  await f.message('50.0000001');assert.equal(f.state.users['123'].draft.amount,original);
});
test('callbacks cannot access another Telegram account and group chats create no session',async()=>{
  const f=fixture();await f.bot.handle({callback_query:{id:'x',from:{id:999},message:{chat:{id:123,type:'private'}},data:'new'}});
  await f.bot.handle({message:{chat:{id:-123,type:'group'},from:{id:123},text:'/new'}});
  assert.deepEqual(f.state.users,{});assert.equal(f.sent.length,0);
});
test('tracking is deduplicated, paid result is notified once, and forget removes session',async()=>{
  const f=fixture();await f.message('/start '+receiptStart(8453,'USDC',hash));await f.message('/start '+receiptStart(8453,'USDC',hash));
  assert.equal(f.state.users['123'].watches.length,1);
  await f.bot.notifications();assert.equal(f.sent.filter(x=>x[1].includes('Battle result:')).length,0);
  f.setOutcome({result:'won',paid:false,matched:'50000000'});await f.bot.notifications();assert.equal(f.sent.filter(x=>x[1].includes('Battle result:')).length,0);
  f.setOutcome({result:'won',paid:true,matched:'50000000'});await f.bot.notifications();await f.bot.notifications();
  assert.equal(f.sent.filter(x=>x[1].includes('Battle result: WON')).length,1);
  assert.ok(f.sent.some(x=>x[1].includes('Matched stake: 50 USDC')));
  await f.message('/forget');assert.equal(f.state.users['123'],undefined);
});
test('wrong network tracking links are rejected before looking up a receipt',async()=>{
  const f=fixture();await assert.rejects(f.message('/start '+receiptStart(84532,'USDC',hash)),/different network/);
  assert.equal(f.requests.filter(p=>p.includes('/receipt')).length,0);
});

test('a blocked recipient does not block another customer notification',async()=>{
  const watches=()=>[{settlementAsset:'USDC',id,start:'100',side:'A',index:'0',amount:'50000000',duration:600,pair:'BTC vs ETH',notified:false}];
  const state={users:{'123':{watches:watches()},'456':{watches:watches()}}};const sent=[];
  const bot=createCustomerBot({state,operator,chainId:8453,frontendUrl:'https://operator.example',save:async()=>{},
    api:async()=>({result:'won',paid:true,matched:'50000000'}),send:async(id,text)=>{if(id==='123')throw Object.assign(new Error('blocked'),{telegramCode:403});sent.push(text)}});
  await bot.notifications();assert.equal(state.users['123'].watches[0].notified,true);assert.equal(state.users['456'].watches[0].notified,true);assert.equal(sent.length,1);
});
