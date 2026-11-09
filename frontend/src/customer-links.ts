export type CustomerDraft = { settlementAsset: string; assetA: number; assetB: number; duration: number; sideB: boolean; amount?: string };
const durations=[60,600,3600,86400,604800,2592000];
export function customerDraft(search: string): CustomerDraft | undefined {
  const p=new URLSearchParams(search);
  if(p.get('source')!=='telegram')return;
  if(!p.has('assetA')||!p.has('assetB')||!p.has('duration'))return;
  const settlementAsset=p.get('settlementAsset')||'';
  const assetA=Number(p.get('assetA')),assetB=Number(p.get('assetB')),duration=Number(p.get('duration'));
  const side=p.get('side');const amount=p.get('amount')||undefined;
  if(!['USDC','EURC','WETH','ETH'].includes(settlementAsset)||!Number.isInteger(assetA)||!Number.isInteger(assetB)||assetA<0||assetB>65534||assetA>=assetB||!durations.includes(duration)||!['A','B'].includes(side||'')||amount && !/^\d{1,20}(\.\d{1,18})?$/.test(amount))return;
  return {settlementAsset,assetA,assetB,duration,sideB:side==='B',amount};
}
export function receiptStart(chainId:number,asset:string,hash:string) {
  const symbols=['USDC','EURC','WETH','ETH'];
  if(![8453,84532].includes(chainId)||!symbols.includes(asset)||!/^0x[0-9a-fA-F]{64}$/.test(hash))throw new Error('Invalid receipt reference');
  const bytes=new Uint8Array(37);bytes[0]=symbols.indexOf(asset)+1;
  new DataView(bytes.buffer).setUint32(1,chainId);
  bytes.set(Uint8Array.from(hash.slice(2).match(/../g)!.map(x=>parseInt(x,16))),5);
  return 'tx_'+btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
}
