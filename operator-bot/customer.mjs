import {mkdir,readFile,rename,writeFile} from 'node:fs/promises';
import {dirname} from 'node:path';
import {getAddress,isAddress} from 'viem';
import {createCustomerBot} from './customer-core.mjs';

const mode=process.argv[2]||'start';
if(!['start','setup','health'].includes(mode))throw new Error('Use start, setup or health');
const token=process.env.TELEGRAM_BOT_TOKEN||'';
const apiBase=(process.env.MARKET_API_URL||'http://operator-api:3001').replace(/\/$/,'');
const frontend=process.env.CUSTOMER_FRONTEND_URL||'';
const operator=process.env.OPERATOR_ADDRESS||'';
const expectedName=(process.env.EXPECTED_BOT_USERNAME||'').replace(/^@/,'');
const groupName=(process.env.GROUP_BOT_USERNAME||'').replace(/^@/,'');
const chain={base:8453,baseSepolia:84532}[process.env.EXPECTED_NETWORK||'base'];
const stateFile=process.env.BOT_STATE_FILE||'/data/customer-bot-state.json';
const maxUsers=Number(process.env.CUSTOMER_MAX_USERS||1000);
const maxWatches=Number(process.env.CUSTOMER_MAX_CHECKS_PER_POLL||20);
const pollMs=Number(process.env.POLL_INTERVAL_MS||60000);
let url;
try { url=new URL(frontend); } catch { throw new Error('Set CUSTOMER_FRONTEND_URL to the operator HTTPS frontend URL (or localhost HTTP for testing)'); }
if(!/^\d+:[A-Za-z0-9_-]+$/.test(token)||!isAddress(operator)||/^0x0{40}$/i.test(operator)||!chain||!/^\w{5,32}$/.test(expectedName)||expectedName.toLowerCase()===groupName.toLowerCase())throw new Error('Configure a dedicated customer bot, matching username, operator and network');
if(url.username||url.password||url.search||url.hash||!(url.protocol==='https:'||url.protocol==='http:'&&['localhost','127.0.0.1'].includes(url.hostname)))throw new Error('CUSTOMER_FRONTEND_URL must be HTTPS (localhost HTTP is allowed for local testing), without credentials, query or fragment');
if(!Number.isSafeInteger(maxUsers)||maxUsers<1||maxUsers>100000||!Number.isSafeInteger(maxWatches)||maxWatches<1||maxWatches>100||!Number.isSafeInteger(pollMs)||pollMs<30000)throw new Error('Invalid customer limits or polling interval');
let state,stopping=false;
process.on('SIGINT',()=>{stopping=true});process.on('SIGTERM',()=>{stopping=true});
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function telegram(method,body,timeout=15000){
  const response=await fetch(`https://api.telegram.org/bot${token}/${method}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(timeout)});
  const value=await response.json();
  if(!response.ok||!value.ok)throw Object.assign(new Error(value.description||`Telegram ${method} failed`),{telegramCode:value.error_code||response.status,retryAfter:value.parameters?.retry_after});
  return value.result;
}
async function api(path){
  const response=await fetch(apiBase+path,{signal:AbortSignal.timeout(15000)});
  const result=await response.json();
  if(!response.ok)throw new Error(result.error||`Operator API returned ${response.status}`);
  return result;
}
async function save(){
  const text=JSON.stringify(state);
  if(text.length>32*1024*1024)throw new Error('Customer bot state exceeds configured storage limit');
  await mkdir(dirname(stateFile),{recursive:true});
  await writeFile(stateFile+'.tmp',text+'\n',{mode:0o600});await rename(stateFile+'.tmp',stateFile);
}
function safe(error){return String(error.shortMessage||error.message||error).split(token).join('[redacted]').replace(/https?:\/\/[^\s]+/g,'[URL redacted]').slice(0,400)}
try{
  const config=await api('/api/operator-config');
  if(config.chainId!==chain||getAddress(config.operator)!==getAddress(operator))throw new Error('Customer bot and local API operator/network mismatch');
  const me=await telegram('getMe',{});
  if(me.username.toLowerCase()!==expectedName.toLowerCase())throw new Error('Customer bot token belongs to another username');
  const webhook=await telegram('getWebhookInfo',{});
  const initialMarkets=await api('/api/v1/bets/markets');
  if(initialMarkets.chainId!==chain||getAddress(initialMarkets.operator)!==getAddress(operator))throw new Error('Bet API and customer bot use different networks/operators');
  if(mode==='setup'){
    await telegram('deleteWebhook',{drop_pending_updates:false});
    await telegram('setChatMenuButton',{menu_button:{type:'commands'}});
    await telegram('setMyCommands',{commands:[{command:'start',description:'Open the customer menu'},{command:'new',description:'Prepare a battle'},{command:'bets',description:'Show tracked entries'},{command:'track',description:'Track a processed entry'},{command:'forget',description:'Delete your bot data'}]});
    console.log(`Customer bot @${me.username} configured as a regular chat bot; no Mini App.`);
  }else{
    if(webhook.url)throw new Error('Webhook active; run customer-setup explicitly first');
    const context=[chain,getAddress(operator),me.id,JSON.stringify(config.cores)].join(':');
    try{state=JSON.parse(await readFile(stateFile,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;state={context,offset:0,users:{},watchCursor:0};}
    if(state.context!==context||!state.users||typeof state.users!=='object'||Array.isArray(state.users)||!Number.isSafeInteger(state.offset)||state.offset<0)throw new Error('Customer state belongs to another operator/network/bot/contracts or is invalid');
    const bot=createCustomerBot({state,api,save,frontendUrl:frontend,operator,chainId:chain,maxUsers,onError:error=>console.error('customer notification',safe(error)),
      send:(id,text,rows)=>telegram('sendMessage',{chat_id:id,text,disable_web_page_preview:true,...(rows?{reply_markup:{inline_keyboard:rows}}:{})}),
      answer:id=>telegram('answerCallbackQuery',{callback_query_id:id}),
    });
    await bot.markets();
    if(mode==='health')console.log(`OK customer bot @${me.username}; chain ${chain}; operator API matches; no webhook`);
    else{
      console.log(`Customer bot @${me.username} polling; chain ${chain}; regular chat buttons; no signer keys`);
      let nextChecks=0;
      const rates=new Map();
      while(!stopping){
        try{
          const now=Date.now();
          for(const [id,u] of Object.entries(state.users))if(now-u.lastSeen>90*86400000)delete state.users[id];
          if(now>=nextChecks){nextChecks=Date.now()+pollMs;await bot.notifications(maxWatches);}
          const offset=now-(state.lastUpdateAt||0)>7*86400000?0:state.offset;
          const updates=await telegram('getUpdates',{offset,timeout:25,limit:25,allowed_updates:['message','callback_query']},35000);
          for(const update of updates){
            if(!Number.isSafeInteger(update.update_id)||update.update_id<0)continue;
            if(update.update_id<state.offset&&Date.now()-(state.lastUpdateAt||0)<7*86400000)continue;
            const id=String(update.message?.from?.id||update.callback_query?.from?.id||'');
            const slot=rates.get(id);const current=slot&&slot.until>Date.now()?slot:{until:Date.now()+60000,count:0};
            current.count++;rates.set(id,current);
            try{if(current.count<=20)await bot.handle(update);}
            catch(error){
              if(error.telegramCode===429||error.telegramCode===409)throw error;
              if(![400,403].includes(error.telegramCode))await telegram('sendMessage',{chat_id:id,text:'This request could not be completed. Please retry. Never send wallet private keys. '+safe(error)});
            }
            state.offset=update.update_id+1;state.lastUpdateAt=Date.now();await save();
          }
          for(const [id,r] of rates)if(r.until<Date.now())rates.delete(id);
          await save();
        }catch(error){
          console.error(new Date().toISOString(),'customer bot',safe(error));
          if(error.telegramCode===409)throw new Error('Polling conflict: run exactly one instance per customer bot token');
          await pause(Math.min(300000,Math.max(5000,Number(error.retryAfter||0)*1000)));
        }
      }
    }
  }
}catch(error){console.error('Customer bot failed:',safe(error));process.exitCode=1;}
