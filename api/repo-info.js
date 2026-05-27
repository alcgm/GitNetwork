const GITLAWB_NODE_URL = process.env.GITLAWB_NODE_URL || "https://node.gitlawb.com";
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

async function sbFetch(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  return res.json();
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const { did } = req.query;
  if (!did) return res.status(400).json({ error: "Missing did parameter" });

  try {
    const gitlawbRes = await fetch(`${GITLAWB_NODE_URL}/repos/${encodeURIComponent(did)}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });

    if (!gitlawbRes.ok) {
      return res.status(404).json({ error: "Repo not found on GitLawb" });
    }

    const repoData = await gitlawbRes.json();

    const launches = await sbFetch(
      `launches?repo_did=eq.${encodeURIComponent(did)}&select=token_address,token_name,token_symbol,created_at&limit=1`
    );
    const launch = Array.isArray(launches) ? launches[0] : null;

    return res.status(200).json({
      repoDID: did,
      repoName: repoData.name || repoData.title,
      ownerDID: repoData.owner || repoData.ownerDid,
      description: repoData.description,
      contributors: repoData.contributors || [],
      repoUrl: repoData.url,
      alreadyLaunched: !!launch,
      tokenInfo: launch || null,
    });
  } catch (err) {
    console.error("repo-info error:", err.message);
    return res.status(500).json({ error: "Failed to fetch repo info" });
  }
}
