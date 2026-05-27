import { createClient } from "@supabase/supabase-js";
import { verifyMessage } from "viem";
import { SignJWT } from "jose";

const GITLAWB_NODE_URL = process.env.GITLAWB_NODE_URL || "https://node.gitlawb.com";
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

export default async function handler(req, res) {
  if (req.method === "POST" && req.url?.includes("/confirm")) {
    return handleConfirm(req, res);
  }
  if (req.method === "POST") {
    return handleChallenge(req, res);
  }
  return res.status(405).json({ error: "Method not allowed" });
}

async function handleChallenge(req, res) {
  const { repoDID, walletAddress } = req.body;
  if (!repoDID || !walletAddress) {
    return res.status(400).json({ error: "Missing repoDID or walletAddress" });
  }

  const challenge = `gitnetwork-verify:${repoDID}:${Date.now()}`;
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  const { error } = await supabase.from("did_sessions").insert({
    wallet_address: walletAddress.toLowerCase(),
    repo_did: repoDID,
    challenge,
    verified: false,
    expires_at: expiresAt,
  });

  if (error) {
    console.error("Supabase insert error:", error);
    return res.status(500).json({ error: "Failed to create challenge" });
  }

  return res.status(200).json({ challenge });
}

async function handleConfirm(req, res) {
  const { challenge, signature, walletAddress, repoDID } = req.body;
  if (!challenge || !signature || !walletAddress || !repoDID) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const { data: session } = await supabase
    .from("did_sessions")
    .select("*")
    .eq("challenge", challenge)
    .eq("wallet_address", walletAddress.toLowerCase())
    .eq("repo_did", repoDID)
    .gt("expires_at", new Date().toISOString())
    .single();

  if (!session) {
    return res.status(401).json({ error: "Invalid or expired challenge" });
  }

  try {
    const valid = await verifyMessage({
      address: walletAddress,
      message: challenge,
      signature,
    });

    if (!valid) {
      return res.status(401).json({ error: "Invalid signature" });
    }
  } catch {
    return res.status(401).json({ error: "Signature verification failed" });
  }

  try {
    const didRes = await fetch(`${GITLAWB_NODE_URL}/did/resolve/${encodeURIComponent(repoDID)}`, {
      headers: { Accept: "application/json" },
    });

    if (didRes.ok) {
      const didDoc = await didRes.json();
      const keys = didDoc.verificationMethod || didDoc.keys || [];
      const ownerWallets = keys
        .map((k) => (k.ethereumAddress || k.blockchainAccountId || "").toLowerCase().replace(/^.*:/, ""))
        .filter(Boolean);

      if (ownerWallets.length > 0 && !ownerWallets.includes(walletAddress.toLowerCase())) {
        return res.status(403).json({ error: "Wallet is not the repo owner DID" });
      }
    }
  } catch {
  }

  await supabase
    .from("did_sessions")
    .update({ verified: true })
    .eq("id", session.id);

  const token = await new SignJWT({ walletAddress: walletAddress.toLowerCase(), repoDID })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("24h")
    .sign(JWT_SECRET);

  return res.status(200).json({ verified: true, sessionToken: token });
}
