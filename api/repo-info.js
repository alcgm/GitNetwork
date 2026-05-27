import { createClient } from "@supabase/supabase-js";

const GITLAWB_NODE_URL = process.env.GITLAWB_NODE_URL || "https://node.gitlawb.com";
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const { did } = req.query;
  if (!did) return res.status(400).json({ error: "Missing did parameter" });

  try {
    const gitlawbRes = await fetch(`${GITLAWB_NODE_URL}/repos/${encodeURIComponent(did)}`, {
      headers: { Accept: "application/json" },
    });

    if (!gitlawbRes.ok) {
      return res.status(404).json({ error: "Repo not found on GitLawb" });
    }

    const repoData = await gitlawbRes.json();

    const { data: launch } = await supabase
      .from("launches")
      .select("token_address, token_name, token_symbol, created_at")
      .eq("repo_did", did)
      .single();

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
    console.error("repo-info error:", err);
    return res.status(500).json({ error: "Failed to fetch repo info" });
  }
}
