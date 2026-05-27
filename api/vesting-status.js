const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const { wallet } = req.query;
  if (!wallet) return res.status(400).json({ error: "Missing wallet parameter" });

  const res2 = await fetch(
    `${SUPABASE_URL}/rest/v1/vestings?contributor_wallet=eq.${wallet.toLowerCase()}&select=*,launches(repo_did,repo_name,repo_url,token_address,token_name,token_symbol)&order=start_timestamp.desc`,
    {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    }
  );

  if (!res2.ok) {
    const err = await res2.text();
    console.error("Vesting query error:", err);
    return res.status(500).json({ error: "Failed to fetch vesting data" });
  }

  const vestings = await res2.json();
  const now = Date.now();

  const enriched = (vestings || []).map(v => {
    const startMs = new Date(v.start_timestamp).getTime();
    const cliffMs = (v.cliff_seconds || 0) * 1000;
    const durationMs = (v.duration_seconds || 1) * 1000;
    const cliffEnd = startMs + cliffMs;
    const vestEnd = cliffEnd + durationMs;

    let vestedAmount = 0;
    if (now >= vestEnd) {
      vestedAmount = Number(v.total_amount);
    } else if (now >= cliffEnd) {
      vestedAmount = (Number(v.total_amount) * (now - cliffEnd)) / durationMs;
    }

    const claimable = Math.max(0, vestedAmount - Number(v.claimed_amount || 0));

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
