import { createHmac } from "node:crypto";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const JWT_SECRET = process.env.JWT_SECRET || "changeme";

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

async function sbFetch(path, opts = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: opts.method === "POST" ? "return=representation" : "",
      ...opts.headers,
    },
  });
  return res.json();
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return res.status(401).json({ error: "Missing session token" });

  let payload;
  try {
    payload = verifyJWT(auth.slice(7));
  } catch (e) {
    return res.status(401).json({ error: "Invalid session token" });
  }

  const { repoDID, repoUrl, repoName, tokenAddress, factoryAddress, txHash, tokenName, tokenSymbol, totalSupply, chainId, contributors } = req.body || {};

  if (!repoDID || !tokenAddress || !factoryAddress) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  if (payload.repoDID !== repoDID) return res.status(403).json({ error: "Session repoDID mismatch" });

  const existing = await sbFetch(`launches?repo_did=eq.${encodeURIComponent(repoDID)}&select=id&limit=1`);
  if (Array.isArray(existing) && existing[0]) return res.status(409).json({ error: "Token already launched for this repo" });

  const launches = await sbFetch("launches", {
    method: "POST",
    body: JSON.stringify({
      repo_did: repoDID,
      repo_url: repoUrl,
      repo_name: repoName,
      token_address: tokenAddress.toLowerCase(),
      factory_address: factoryAddress.toLowerCase(),
      deployer_wallet: payload.walletAddress,
      token_name: tokenName,
      token_symbol: tokenSymbol,
      total_supply: totalSupply,
      chain_id: chainId || 8453,
      tx_hash: txHash,
    }),
  });

  const launch = Array.isArray(launches) ? launches[0] : launches;
  if (!launch?.id) {
    console.error("Launch insert error:", launches);
    return res.status(500).json({ error: "Failed to record launch" });
  }

  if (Array.isArray(contributors) && contributors.length > 0) {
    await sbFetch("vestings", {
      method: "POST",
      body: JSON.stringify(contributors.map(c => ({
        launch_id: launch.id,
        contributor_wallet: c.wallet?.toLowerCase(),
        vesting_contract: c.vestingContract?.toLowerCase() || "",
        total_amount: c.amount,
        cliff_seconds: c.cliffSeconds,
        duration_seconds: c.durationSeconds,
        start_timestamp: new Date().toISOString(),
      }))),
    });
  }

  return res.status(200).json({ success: true, launchId: launch.id });
}
