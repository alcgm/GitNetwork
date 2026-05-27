import { createClient } from "@supabase/supabase-js";
import { jwtVerify } from "jose";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing session token" });
  }

  let payload;
  try {
    const { payload: p } = await jwtVerify(authHeader.slice(7), JWT_SECRET);
    payload = p;
  } catch {
    return res.status(401).json({ error: "Invalid session token" });
  }

  const {
    repoDID,
    repoUrl,
    repoName,
    tokenAddress,
    factoryAddress,
    txHash,
    tokenName,
    tokenSymbol,
    totalSupply,
    chainId,
    contributors,
  } = req.body;

  if (!repoDID || !tokenAddress || !factoryAddress) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  if (payload.repoDID !== repoDID) {
    return res.status(403).json({ error: "Session repoDID mismatch" });
  }

  const { data: existing } = await supabase
    .from("launches")
    .select("id")
    .eq("repo_did", repoDID)
    .single();

  if (existing) {
    return res.status(409).json({ error: "Token already launched for this repo" });
  }

  const { data: launch, error: launchErr } = await supabase
    .from("launches")
    .insert({
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
    })
    .select()
    .single();

  if (launchErr) {
    console.error("Launch insert error:", launchErr);
    return res.status(500).json({ error: "Failed to record launch" });
  }

  if (contributors && Array.isArray(contributors) && contributors.length > 0) {
    const vestingRows = contributors.map((c) => ({
      launch_id: launch.id,
      contributor_wallet: c.wallet.toLowerCase(),
      vesting_contract: c.vestingContract?.toLowerCase() || "",
      total_amount: c.amount,
      cliff_seconds: c.cliffSeconds,
      duration_seconds: c.durationSeconds,
      start_timestamp: new Date().toISOString(),
    }));

    await supabase.from("vestings").insert(vestingRows);
  }

  return res.status(200).json({ success: true, launchId: launch.id });
}
