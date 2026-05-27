import { createClient } from "@supabase/supabase-js";
import { createHmac, timingSafeEqual } from "crypto";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
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

  const { event, data } = req.body;

  if (event !== "pr.merged") {
    return res.status(200).json({ skipped: true });
  }

  const { repoDID, prId, contributorDID, contributorWallet, mergedAt } = data || {};

  if (!repoDID || !prId) {
    return res.status(400).json({ error: "Missing required event data" });
  }

  const { error } = await supabase.from("pr_events").insert({
    repo_did: repoDID,
    pr_id: String(prId),
    contributor_did: contributorDID,
    contributor_wallet: contributorWallet?.toLowerCase(),
    merged_at: mergedAt || new Date().toISOString(),
    processed: false,
  });

  if (error) {
    console.error("Webhook insert error:", error);
    return res.status(500).json({ error: "Failed to record PR event" });
  }

  return res.status(200).json({ received: true });
}
