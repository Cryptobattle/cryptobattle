export interface CommunityChallenge {
  version: 1;
  purpose: "cryptobattle-operator-community";
  botUsername: string;
  chainId: number;
  telegramId: string;
  wallet: string;
  nonce: string;
  expiresAt: number;
  frontendOrigin: string;
}

export function frontendOrigin(value: string) {
  const url = new URL(value);
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (url.username || url.password || (url.protocol !== "https:" && !(url.protocol === "http:" && local))) {
    throw new Error("Use your HTTPS frontend URL, or localhost for testing.");
  }
  return url.origin;
}

export function validateCommunityChallenge(value: unknown, now = Date.now()): CommunityChallenge {
  const item = value as Partial<CommunityChallenge> | null;
  if (!item || item.version !== 1 || item.purpose !== "cryptobattle-operator-community"
    || !/^[A-Za-z0-9_]{5,32}$/.test(item.botUsername || "")
    || !Number.isSafeInteger(item.chainId) || ![8453, 84532].includes(item.chainId!)
    || !/^\d{1,20}$/.test(item.telegramId || "")
    || !/^0x[0-9a-fA-F]{40}$/.test(item.wallet || "") || /^0x0{40}$/i.test(item.wallet!)
    || !/^[a-f0-9]{32}$/.test(item.nonce || "")
    || !Number.isSafeInteger(item.expiresAt) || item.expiresAt! <= now
    || item.expiresAt! > now + 10 * 60_000 + 5_000
    || typeof item.frontendOrigin !== "string") throw new Error("Invalid or expired Telegram challenge.");
  return {
    version: 1, purpose: "cryptobattle-operator-community", botUsername: item.botUsername!,
    chainId: item.chainId!, telegramId: item.telegramId!, wallet: item.wallet!.toLowerCase(),
    nonce: item.nonce!, expiresAt: item.expiresAt!, frontendOrigin: frontendOrigin(item.frontendOrigin),
  };
}

export function communityMessage(challenge: CommunityChallenge) {
  return [
    "CryptoBattle operator community verification",
    `Telegram bot: @${challenge.botUsername}`,
    `Frontend: ${challenge.frontendOrigin}`,
    `Chain ID: ${challenge.chainId}`,
    `Telegram user ID: ${challenge.telegramId}`,
    `Operator wallet: ${challenge.wallet}`,
    `Nonce: ${challenge.nonce}`,
    `Expires: ${new Date(challenge.expiresAt).toISOString()}`,
    "This signature only links this wallet to this Telegram account for group admission.",
    "It does not authorize a transaction, payment, token approval or transfer of funds.",
  ].join("\n");
}

export function encodeCommunityChallenge(challenge: CommunityChallenge) {
  const bytes = new TextEncoder().encode(JSON.stringify(challenge));
  return btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

export function decodeCommunityChallenge(payload: string, now = Date.now()) {
  if (!/^[A-Za-z0-9_-]{1,2000}$/.test(payload)) throw new Error("Paste the verification code from your Telegram bot.");
  const text = atob(payload.replaceAll("-", "+").replaceAll("_", "/"));
  return validateCommunityChallenge(JSON.parse(new TextDecoder().decode(Uint8Array.from(text, x => x.charCodeAt(0)))), now);
}

export function communityFrontendLink(challenge: CommunityChallenge) {
  return `${challenge.frontendOrigin}/#community=${encodeCommunityChallenge(challenge)}`;
}
