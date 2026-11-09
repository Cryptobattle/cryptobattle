import { useEffect, useState } from "react";
import { Check, ChevronDown, Copy, ExternalLink, LoaderCircle, ShieldCheck, Wallet } from "lucide-react";
import { getAddress, type Address } from "viem";
import { communityMessage, decodeCommunityChallenge } from "./community-challenge";

export function OperatorCommunity({ account, operator, chainId, botUsername, signMessage }: {
  account: Address;
  operator: Address;
  chainId: number;
  botUsername: string;
  signMessage: (message: string) => Promise<`0x${string}`>;
}) {
  const [payload, setPayload] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const bot = botUsername.replace(/^@/, "");
  const botConfigured = /^[A-Za-z0-9_]{5,32}$/.test(bot);
  const request = `/verify ${operator} ${window.location.origin}`;

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const challenge = params.get("community");
    if (!challenge) return;
    setPayload(challenge); setOpen(true);
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
  }, []);

  async function copy(text: string) {
    try { await navigator.clipboard.writeText(text); setMessage("Copied. Paste it into your private Telegram bot chat."); }
    catch { setMessage("Clipboard unavailable. Select and copy the text below."); }
  }

  async function sign() {
    setBusy(true); setConfirmation(""); setMessage("");
    try {
      const challenge = decodeCommunityChallenge(payload.trim());
      if (getAddress(account) !== getAddress(operator) || getAddress(challenge.wallet) !== getAddress(operator)) throw new Error("Connect the operator wallet named in this challenge.");
      if (challenge.chainId !== chainId) throw new Error("This challenge belongs to another network.");
      if (challenge.frontendOrigin !== window.location.origin) throw new Error("Open the exact frontend URL used in your Telegram request.");
      if (!botConfigured || challenge.botUsername.toLowerCase() !== bot.toLowerCase()) throw new Error("The challenge does not belong to the configured operator-group bot.");
      const signature = await signMessage(communityMessage(challenge));
      setConfirmation(`/confirm ${challenge.nonce} ${signature}`);
      setMessage("Signed. Copy the confirmation and send it to the Telegram bot to receive your group invitation.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Verification failed."); }
    finally { setBusy(false); }
  }

  return <details className="community-admin" open={open} onToggle={event => setOpen(event.currentTarget.open)}>
    <summary><span><ShieldCheck size={17}/>Operator group</span><ChevronDown size={17}/></summary>
    <div className="community-body">
      {!botConfigured ? <div className="notice">The operator-group Telegram bot is not configured.</div> : <>
        <a className="secondary large link-button" href={`https://t.me/${bot}`} target="_blank" rel="noopener noreferrer"><ExternalLink size={16}/>Open operator-group bot</a>
        <div className="community-command"><code>{request}</code><button title="Copy Telegram verification request" onClick={() => void copy(request)}><Copy size={17}/></button></div>
        <label htmlFor="community-challenge">TELEGRAM VERIFICATION CODE</label>
        <textarea id="community-challenge" value={payload} onChange={event => { setPayload(event.target.value.trim()); setConfirmation(""); }} placeholder="Paste the code received from the bot" rows={3}/>
        <button className="secondary large" disabled={busy || !payload} onClick={() => void sign()}>{busy ? <LoaderCircle className="spin" size={17}/> : <Wallet size={17}/>}Sign group verification</button>
        {confirmation && <><div className="community-command"><code>{confirmation}</code><button title="Copy signed Telegram confirmation" onClick={() => void copy(confirmation)}><Copy size={17}/></button></div><span className="community-caption"><Check size={14}/>Send this confirmation to the same bot.</span></>}
      </>}
      {message && <div className="notice" role="status">{message}</div>}
    </div>
  </details>;
}
