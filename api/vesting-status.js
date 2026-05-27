import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const { wallet } = req.query;
  if (!wallet) return res.status(400).json({ error: "Missing wallet parameter" });

  const { data: vestings, error } = await supabase
    .from("vestings")
    .select(`
      *,
      launches (
        repo_did, repo_name, repo_url,
        token_address, token_name, token_symbol
      )
    `)
    .eq("contributor_wallet", wallet.toLowerCase())
    .order("start_timestamp", { ascending: false });

  if (error) {
    console.error("Vesting query error:", error);
    return res.status(500).json({ error: "Failed to fetch vesting data" });
  }

  const now = Date.now();
  const enriched = (vestings || []).map((v) => {
    const startMs = new Date(v.start_timestamp).getTime();
    const cliffMs = v.cliff_seconds * 1000;
    const durationMs = v.duration_seconds * 1000;
    const cliffEnd = startMs + cliffMs;
    const vestEnd = cliffEnd + durationMs;

    let vestedAmount = 0;
    if (now >= vestEnd) {
      vestedAmount = Number(v.total_amount);
    } else if (now >= cliffEnd) {
      const elapsed = now - cliffEnd;
      vestedAmount = (Number(v.total_amount) * elapsed) / durationMs;
    }

    const claimable = Math.max(0, vestedAmount - Number(v.claimed_amount));

    return {
      ...v,
      cliffEnd: new Date(cliffEnd).toISOString(),
      vestEnd: new Date(vestEnd).toISOString(),
      vestedAmount,
      claimable,
      percentVested: v.total_amount > 0 ? (vestedAmount / Number(v.total_amount)) * 100 : 0,
    };
  });

  return res.status(200).json({ vestings: enriched });
}
