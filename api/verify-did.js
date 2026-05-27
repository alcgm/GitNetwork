import { createHmac } from "node:crypto";

const GITLAWB_NODE_URL = process.env.GITLAWB_NODE_URL || "https://node.gitlawb.com";
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const JWT_SECRET = process.env.JWT_SECRET || "changeme";

// ── Supabase helpers ──────────────────────────────────────────────────────────
async function sbGet(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  const data = await res.json();
  return Array.isArray(data) ? data[0] : null;
}

async function sbInsert(table, row) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(row),
  });
  return res.json();
}

async function sbPatch(table, filter, row) {
  await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filter}`, {
    method: "PATCH",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(row),
  });
}

// ── Minimal HS256 JWT ─────────────────────────────────────────────────────────
function b64url(buf) { return Buffer.from(buf).toString("base64url"); }

function makeJWT(payload) {
  const h = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const b = b64url(JSON.stringify({ ...payload, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 86400 }));
  const sig = createHmac("sha256", JWT_SECRET).update(`${h}.${b}`).digest();
  return `${h}.${b}.${b64url(sig)}`;
}

function verifyJWT(token) {
  const [h, b, sig] = token.split(".");
  if (!h || !b || !sig) throw new Error("Malformed token");
  const expected = createHmac("sha256", JWT_SECRET).update(`${h}.${b}`).digest();
  const actual = Buffer.from(sig, "base64url");
  if (!expected.equals(actual)) throw new Error("Invalid signature");
  const payload = JSON.parse(Buffer.from(b, "base64url").toString());
  if (payload.exp < Math.floor(Date.now() / 1000)) throw new Error("Expired");
  return payload;
}

// ── DID ownership check via GitLawb ──────────────────────────────────────────
async function checkDIDOwner(walletAddress, repoDID) {
  try {
    const res = await fetch(`${GITLAWB_NODE_URL}/did/resolve/${encodeURIComponent(repoDID)}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return true;
    const doc = await res.json();
    const keys = doc.verificationMethod || doc.keys || [];
    const wallets = keys
      .map(k => (k.ethereumAddress || k.blockchainAccountId || "").toLowerCase().replace(/^.*:/, ""))
      .filter(Boolean);
    return wallets.length === 0 || wallets.includes(walletAddress.toLowerCase());
  } catch {
    return true;
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const isConfirm = req.url?.includes("/confirm") || req.query?.action === "confirm";

  if (isConfirm) {
    const { challenge, signature, walletAddress, repoDID } = req.body || {};
    if (!challenge || !signature || !walletAddress || !repoDID) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const session = await sbGet(
      `did_sessions?challenge=eq.${encodeURIComponent(challenge)}&wallet_address=eq.${walletAddress.toLowerCase()}&repo_did=eq.${encodeURIComponent(repoDID)}&verified=eq.false&expires_at=gt.${new Date().toISOString()}&limit=1`
    );

    if (!session) return res.status(401).json({ error: "Invalid or expired challenge" });

    const isOwner = await checkDIDOwner(walletAddress, repoDID);
    if (!isOwner) return res.status(403).json({ error: "Wallet is not the repo owner DID" });

    await sbPatch("did_sessions", `id=eq.${session.id}`, { verified: true });

    const token = makeJWT({ walletAddress: walletAddress.toLowerCase(), repoDID });
    return res.status(200).json({ verified: true, sessionToken: token });
  }

  // Request challenge
  const { repoDID, walletAddress } = req.body || {};
  if (!repoDID || !walletAddress) {
    return res.status(400).json({ error: "Missing repoDID or walletAddress" });
  }

  const challenge = `gitnetwork-verify:${repoDID}:${Date.now()}`;
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  await sbInsert("did_sessions", {
    wallet_address: walletAddress.toLowerCase(),
    repo_did: repoDID,
    challenge,
    verified: false,
    expires_at: expiresAt,
  });

  return res.status(200).json({ challenge });
}
