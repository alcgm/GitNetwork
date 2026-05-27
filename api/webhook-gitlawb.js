import { createHmac, timingSafeEqual } from "node:crypto";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const WEBHOOK_SECRET = process.env.GITLAWB_WEBHOOK_SECRET;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  if (WEBHOOK_SECRET) {
    const signature = req.headers["x-gitlawb-signature"] || "";
    const body = JSON.stringify(req.body);
    const expected = createHmac("sha256", WEBHOOK_SECRET).update(body).digest("hex");
    try {
      const sigBuf = Buffer.from(signature.replace("sha256=", ""), "hex");
      const expBuf = Buffer.from(expected, "hex");
      if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
        return res.status(401).json({ error: "Invalid webhook signature" });
      }
    } catch {
      return res.status(401).json({ error: "Signature verification failed" });
    }
  }

  const { event, data } = req.body || {};
  if (event !== "pr.merged") return res.status(200).json({ skipped: true, event });

  const { repoDID, prId, contributorDID, contributorWallet, mergedAt } = data || {};
  if (!repoDID || !prId) return res.status(400).json({ error: "Missing required event data" });

  const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/pr_events`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      repo_did: repoDID,
      pr_id: String(prId),
      contributor_did: contributorDID,
      contributor_wallet: contributorWallet?.toLowerCase(),
      merged_at: mergedAt || new Date().toISOString(),
      processed: false,
    }),
  });

  if (!insertRes.ok) {
    console.error("Webhook insert error:", await insertRes.text());
    return res.status(500).json({ error: "Failed to record PR event" });
  }

  return res.status(200).json({ received: true });
}
