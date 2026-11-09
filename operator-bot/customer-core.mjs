import { formatUnits, getAddress, isAddress, parseUnits } from 'viem';

export function decodeReceiptStart(value) {
  if(!/^tx_[A-Za-z0-9_-]{50}$/.test(value))throw new Error('Invalid tracking link');
  const bytes=Buffer.from(value.slice(3),'base64url');
  if(bytes.length!==37||bytes.toString('base64url')!==value.slice(3))throw new Error('Invalid tracking link');
  const asset=['USDC','EURC','WETH','ETH'][bytes[0]-1],chainId=bytes.readUInt32BE(1);
  if(!asset||![8453,84532].includes(chainId))throw new Error('Invalid tracking network');
  return {settlementAsset:asset,chainId,hash:'0x'+bytes.subarray(5).toString('hex')};
}
export function frontendBetLink(base,draft) {
  const url=new URL(base);
  url.search='';url.hash='';
  url.searchParams.set('source','telegram');
  for(const key of ['settlementAsset','assetA','assetB','duration','side','amount'])url.searchParams.set(key,String(draft[key]));
  return url.href;
}
const button=(text,data)=>({text,callback_data:data});
const durationLabel=value=>({60:'1 min',600:'10 min',3600:'1 hour',86400:'1 day',604800:'1 week',2592000:'30 days'}[value]||String(value));

export function createCustomerBot({state,api,send,answer=async()=>{},save,frontendUrl,operator,chainId,maxUsers=1000,now=Date.now,onError=()=>{}}) {
  let metadata;let expires=0;
  async function markets() {
    if(!metadata||now()>=expires){
      const next=await api('/api/v1/bets/markets');
      if(next.chainId!==chainId||!isAddress(next.operator)||getAddress(next.operator)!==getAddress(operator)||!Array.isArray(next.assets)||!next.settlementAssets.length)throw new Error('Operator API configuration mismatch');
      metadata=next;expires=now()+30_000;
    }
    return metadata;
  }
  function user(id) {
    if(!state.users[id]){
      if(Object.keys(state.users).length>=maxUsers)throw new Error('Customer bot capacity reached; contact the operator');
      state.users[id]={watches:[],lastSeen:now()};
    }
    state.users[id].lastSeen=now();return state.users[id];
  }
  const assetName=(m,id)=>m.assets.find(a=>a.id===id)?.symbol||`Asset ${id}`;
  async function draftFor(u) {
    const m=await markets();
    if(m.assets.length<2)throw new Error('No active battle pair is available');
    u.draft ||= {settlementAsset:m.settlementAssets[0].symbol,assetA:m.assets[0].id,assetB:m.assets[1].id,duration:3600,side:'A',amount:formatUnits(BigInt(m.settlementAssets[0].minimumDeposit),m.settlementAssets[0].decimals)};
    const d=u.draft;
    if(!m.assets.some(a=>a.id===d.assetA)||!m.assets.some(a=>a.id===d.assetB)||!m.settlementAssets.some(a=>a.symbol===d.settlementAsset)){
      delete u.draft;return draftFor(u);
    }
    return {m,d,currency:m.settlementAssets.find(a=>a.symbol===d.settlementAsset)};
  }
  async function show(id) {
    const u=user(id),{m,d,currency}=await draftFor(u);
    await save();
    const selected=d.side==='A'?d.assetA:d.assetB;
    await send(id,`${assetName(m,d.assetA)} vs ${assetName(m,d.assetB)} · ${durationLabel(d.duration)}\nPick: ${assetName(m,selected)}\nStake: ${d.amount} ${d.settlementAsset}\nMinimum: ${formatUnits(BigInt(currency.minimumDeposit),currency.decimals)} ${d.settlementAsset}\n\nReview the selection and sign with your own wallet on the operator frontend. The processing time determines the round. Never send private keys or a recovery phrase to this bot.`,[
      m.settlementAssets.map(c=>button(c.symbol,`currency:${c.symbol}`)),
      [button(`Asset A: ${assetName(m,d.assetA)}`,'assets:a:0'),button(`Asset B: ${assetName(m,d.assetB)}`,'assets:b:0')],
      ...[m.durations.slice(0,3),m.durations.slice(3)].map(values=>values.map(value=>button(durationLabel(value),`duration:${value}`))),
      [button(`${d.side==='A'?'✓ ':''}${assetName(m,d.assetA)} wins`,'side:A'),button(`${d.side==='B'?'✓ ':''}${assetName(m,d.assetB)} wins`,'side:B')],
      [button('Change stake','amount'),button('Pool totals','pool')],
      [{text:'Review & sign on frontend',url:frontendBetLink(frontendUrl,d)}],
      [button('Tracked bets','bets')],
    ]);
  }
  async function track(id,reference) {
    if(reference.chainId!==chainId)throw new Error('Tracking link belongs to a different network');
    const response=await api(`/api/v1/bets/receipt?${new URLSearchParams({settlementAsset:reference.settlementAsset,hash:reference.hash})}`);
    if(response.chainId!==chainId||!Array.isArray(response.bets))throw new Error('Receipt network mismatch');
    if(!response.bets.length){await send(id,'No processed entry for this operator was found. For ERC-20 deposits use the processing transaction hash, not just the token-transfer hash. You can retry once processing is confirmed.');return;}
    const u=user(id);const m=await markets();let added=0;
    for(const bet of response.bets){
      if(u.watches.length>=20)break;
      if(u.watches.some(w=>w.id===bet.id&&w.start===bet.start&&w.side===bet.side&&w.index===bet.index&&w.settlementAsset===bet.settlementAsset))continue;
      u.watches.push({...bet,pair:`${assetName(m,bet.assetA)} vs ${assetName(m,bet.assetB)}`,addedAt:now(),notified:false});added++;
    }
    await save();
    await send(id,`Tracking ${added} new entry/entries. Results will be checked automatically. Up to 20 entries are kept; use /forget to remove stored data. Tracking public chain data does not authorize payments or prove wallet ownership.`);
  }
  async function handle(update) {
    const callback=update.callback_query;
    const msg=callback?.message||update.message;
    const from=callback?.from||update.message?.from;
    if(!msg||!from||msg.chat.type!=='private'||String(msg.chat.id)!==String(from.id))return;
    const id=String(from.id);
    if(callback)await answer(callback.id);
    const text=(update.message?.text||'').trim();
    const [command,...args]=text.split(/\s+/);
    if(command==='/forget') {delete state.users[id];await save();await send(id,'Your customer-bot data has been deleted. On-chain positions are unchanged.');return;}
    const u=user(id);
    if(command==='/start'&&args[0]?.startsWith('tx_')){await track(id,decodeReceiptStart(args[0]));return;}
    if(command==='/track'){
      if(args.length!==2||!['USDC','EURC','WETH','ETH'].includes(args[0].toUpperCase())||!/^0x[0-9a-fA-F]{64}$/.test(args[1])){await send(id,'Use /track USDC 0xPROCESSING_TRANSACTION_HASH, or the Track in Telegram link shown after entry. Never send a private key.');return;}
      await track(id,{settlementAsset:args[0].toUpperCase(),hash:args[1],chainId});return;
    }
    if(command==='/bets'||callback?.data==='bets'){
      await send(id,u.watches.length?u.watches.map(w=>`${w.pair} · ${durationLabel(w.duration)} · ${formatUnits(BigInt(w.amount),['USDC','EURC'].includes(w.settlementAsset)?6:18)} ${w.settlementAsset}\n${new Date(Number(w.start)*1000).toISOString()} · side ${w.side} · ${w.result||'pending'}`).join('\n\n'):'No tracked bets yet. Use Track in Telegram after entering through the frontend.');return;
    }
    if(command==='/new'||callback?.data==='new'){delete u.draft;u.awaitingAmount=false;await show(id);return;}
    if(callback){
      const data=String(callback.data||'');const {m,d,currency}=await draftFor(u);
      if(data==='amount'){u.awaitingAmount=true;await save();await send(id,`Enter the stake in ${d.settlementAsset}, using a decimal point. Minimum: ${formatUnits(BigInt(currency.minimumDeposit),currency.decimals)}.`);return;}
      if(data==='pool'){
        const pool=await api(`/api/round-pool?${new URLSearchParams({settlementAsset:d.settlementAsset,assetA:String(d.assetA),assetB:String(d.assetB),duration:String(d.duration)})}`);
        await send(id,`${assetName(m,d.assetA)}: ${formatUnits(BigInt(pool.totalA),currency.decimals)} ${d.settlementAsset}\n${assetName(m,d.assetB)}: ${formatUnits(BigInt(pool.totalB),currency.decimals)} ${d.settlementAsset}\nMatched pool: ${formatUnits(BigInt(pool.matchedPerSide)*2n,currency.decimals)} ${d.settlementAsset}\nRound start: ${new Date(pool.start*1000).toISOString()}\nCached totals are indicative and do not guarantee matching.`);return;
      }
      const p=data.split(':');
      if(p[0]==='assets'&&['a','b'].includes(p[1])&&/^\d{1,5}$/.test(p[2]||'')){
        const page=Number(p[2]),other=p[1]==='a'?d.assetB:d.assetA,choices=m.assets.filter(a=>a.id!==other),subset=choices.slice(page*12,page*12+12);
        if(!subset.length)return;
        const rows=subset.map(a=>[button(a.symbol,`asset:${p[1]}:${a.id}`)]);
        const navigation=[];if(page>0)navigation.push(button('Previous',`assets:${p[1]}:${page-1}`));if((page+1)*12<choices.length)navigation.push(button('Next',`assets:${p[1]}:${page+1}`));if(navigation.length)rows.push(navigation);
        await send(id,'Choose a battle asset:',rows);return;
      }
      if(p[0]==='asset'&&['a','b'].includes(p[1])&&m.assets.some(a=>a.id===Number(p[2]))){
        const value=Number(p[2]),other=p[1]==='a'?d.assetB:d.assetA;if(value===other)return;
        d.assetA=Math.min(value,other);d.assetB=Math.max(value,other);d.side='A';
      } else if(p[0]==='currency'&&m.settlementAssets.some(c=>c.symbol===p[1])){const c=m.settlementAssets.find(c=>c.symbol===p[1]);d.settlementAsset=c.symbol;d.amount=formatUnits(BigInt(c.minimumDeposit),c.decimals);}
      else if(p[0]==='duration'&&m.durations.includes(Number(p[1])))d.duration=Number(p[1]);
      else if(p[0]==='side'&&['A','B'].includes(p[1]))d.side=p[1];
      else return;
      u.awaitingAmount=false;await show(id);return;
    }
    if(u.awaitingAmount&&!text.startsWith('/')){
      const {d,currency}=await draftFor(u);
      if(!/^\d{1,20}(\.\d{1,18})?$/.test(text)|| (text.split('.')[1]?.length||0)>currency.decimals ||parseUnits(text,currency.decimals)<BigInt(currency.minimumDeposit)){
        await send(id,`Enter a valid amount of at least ${formatUnits(BigInt(currency.minimumDeposit),currency.decimals)} ${d.settlementAsset}.`);return;
      }
      d.amount=text;u.awaitingAmount=false;await show(id);return;
    }
    await send(id,'CryptoBattle customer bot\nChoose a market, view pools and review the bet on your operator frontend. You sign with your own wallet; this bot holds no funds or wallet keys.\n\n/new · prepare a bet\n/bets · tracked entries\n/track ASSET HASH · track a processed entry\n/forget · delete stored bot data',[[button('Prepare a bet','new'),button('Tracked bets','bets')],[{text:'Open operator frontend',url:frontendUrl}]]);
    await save();
  }
  async function notifications(limit=20) {
    const entries=Object.entries(state.users).flatMap(([id,u])=>u.watches.filter(w=>!w.notified).map(w=>({id,w})));
    if(!entries.length){state.watchCursor=0;return;}
    const start=Number(state.watchCursor||0)%entries.length;const cache=new Map();const began=now();
    for(let i=0;i<Math.min(limit,entries.length);i++){
      if(i>0&&now()-began>10000)break;
      const {id,w}=entries[(start+i)%entries.length];
      try {
      const path='/api/v1/bets/status?'+new URLSearchParams({settlementAsset:w.settlementAsset,id:w.id,start:w.start,side:w.side,index:w.index});
      if(!cache.has(path))cache.set(path,await api(path));
      const status=cache.get(path);w.result=status.result!=='pending'&&!status.paid?`${status.result} (payout pending)`:status.result;
      if(status.result!=='pending'&&status.paid){
        await send(id,`Battle result: ${status.result==='draw'?'DRAW / REFUND':String(status.result).toUpperCase()} (${w.settlementAsset})\n${w.pair} · ${durationLabel(w.duration)}\nRound start: ${new Date(Number(w.start)*1000).toISOString()}\nEntry: ${w.index}, side ${w.side}\nMatched stake: ${formatUnits(BigInt(status.matched),['USDC','EURC'].includes(w.settlementAsset)?6:18)} ${w.settlementAsset}\n${status.result==='unmatched'?'Unmatched funds follow the contract rollover/refund rules.':'The payout step is processed. A failed transfer remains claimable in the frontend.'}\nThis update refers to this round; rollover positions are separate.`);
        w.notified=true;
      }
      } catch(error) {
        if([400,403].includes(error.telegramCode))w.notified=true;
        else onError(error);
      }
      state.watchCursor=(start+i+1)%entries.length;await save();
    }
  }
  return {handle,notifications,markets};
}
