import { getAddress, hexToString, parseEventLogs } from 'viem';

const coreAbi = [
  {type:'function',name:'assetRegistry',stateMutability:'view',inputs:[],outputs:[{type:'address'}]},
  {type:'function',name:'minDeposit',stateMutability:'view',inputs:[],outputs:[{type:'uint256'}]},
  {type:'function',name:'roundInfo',stateMutability:'view',inputs:[{type:'bytes32'},{type:'uint64'}],outputs:[{type:'uint64'},{type:'uint64'},{type:'bool'},{type:'uint8'},{type:'uint128'},{type:'uint256'},{type:'uint256'}]},
  {type:'function',name:'automationStatus',stateMutability:'view',inputs:[{type:'bytes32'},{type:'uint64'}],outputs:[{type:'uint16'},{type:'uint16'},{type:'bool'},{type:'bool'},{type:'bool'},{type:'bool'},{type:'bool'},{type:'bool'}]},
];
const registryAbi = [{type:'function',name:'allAssets',stateMutability:'view',inputs:[],outputs:[{type:'bytes32[]'},{type:'bool[]'}]}];
const depositAbi = [{type:'event',name:'DepositRecorded',inputs:[
  {name:'id',type:'bytes32',indexed:true},{name:'start',type:'uint64',indexed:true},{name:'beneficiary',type:'address',indexed:true},
  {name:'sideB',type:'bool',indexed:false},{name:'index',type:'uint256',indexed:false},{name:'operator',type:'address',indexed:false},{name:'amount',type:'uint128',indexed:false},
]}];

export async function customerMarkets(client, cores) {
  const settlementAssets=[]; let assetRegistry;
  for(const [symbol,core] of cores){
    const [registry,minimum]=await Promise.all([
      client.readContract({address:core,abi:coreAbi,functionName:'assetRegistry'}),
      client.readContract({address:core,abi:coreAbi,functionName:'minDeposit'}),
    ]);
    if(assetRegistry && getAddress(registry)!==assetRegistry)throw new Error('Settlement cores use different asset registries');
    assetRegistry=getAddress(registry);
    settlementAssets.push({symbol,minimumDeposit:minimum.toString(),decimals:['USDC','EURC'].includes(symbol)?6:18});
  }
  if(!assetRegistry)throw new Error('No settlement assets configured');
  const [symbols,enabled]=await client.readContract({address:assetRegistry,abi:registryAbi,functionName:'allAssets'});
  const assets=symbols.map((value,id)=>({id,symbol:hexToString(value,{size:32}).replace(/\0+$/,'')})).filter((_,id)=>enabled[id]);
  return {assets,settlementAssets,durations:[60,600,3600,86400,604800,2592000]};
}

export async function customerReceipt(client, cores, operator, search) {
  const settlementAsset=(search.get('settlementAsset')||'').toUpperCase();
  const core=cores.get(settlementAsset); const hash=search.get('hash')||'';
  if(!core || !/^0x[0-9a-fA-F]{64}$/.test(hash))return {status:400,body:{error:'Invalid settlement asset or transaction hash'}};
  const receipt=await client.getTransactionReceipt({hash});
  if(receipt.status!=='success')return {status:400,body:{error:'Transaction reverted'}};
  const events=parseEventLogs({abi:depositAbi,logs:receipt.logs.filter(log=>getAddress(log.address)===getAddress(core)),strict:true});
  const bets=await Promise.all(events.filter(event=>getAddress(event.args.operator)===getAddress(operator)).slice(0,20).map(async event=>{
    const args=[event.args.id,event.args.start];
    const [round,market]=await Promise.all([
      client.readContract({address:core,abi:coreAbi,functionName:'roundInfo',args}),
      client.readContract({address:core,abi:coreAbi,functionName:'automationStatus',args}),
    ]);
    return {
    settlementAsset,id:event.args.id,start:event.args.start.toString(),side:event.args.sideB?'B':'A',index:event.args.index.toString(),
    beneficiary:event.args.beneficiary,amount:event.args.amount.toString(),assetA:Number(market[0]),assetB:Number(market[1]),duration:Number(round[1]-round[0]),
  };}));
  return {status:200,body:{hash,chainId:await client.getChainId(),bets}};
}
