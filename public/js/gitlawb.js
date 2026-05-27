// gitlawb.js — GitLawb API integration

const BASE_URL = "/api";

export async function fetchRepoInfo(did) {
  const res = await fetch(`${BASE_URL}/repo-info?did=${encodeURIComponent(did)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to fetch repo: ${res.status}`);
  }
  return res.json();
}

export async function requestChallenge(repoDID, walletAddress) {
  const res = await fetch(`${BASE_URL}/verify-did`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ repoDID, walletAddress }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to request challenge");
  }
  const data = await res.json();
  return data.challenge;
}

export async function confirmOwnership(challenge, signature, walletAddress, repoDID) {
  const res = await fetch(`${BASE_URL}/verify-did/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ challenge, signature, walletAddress, repoDID }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Ownership verification failed");
  }
  return res.json();
}

export async function recordLaunch(sessionToken, launchData) {
  const res = await fetch(`${BASE_URL}/launch-token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${sessionToken}`,
    },
    body: JSON.stringify(launchData),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to record launch");
  }
  return res.json();
}

export async function fetchVestingStatus(walletAddress) {
  const res = await fetch(`${BASE_URL}/vesting-status?wallet=${encodeURIComponent(walletAddress)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to fetch vesting status");
  }
  return res.json();
}

export function parseRepoDID(input) {
  if (input.startsWith("did:")) return input;
  // Try to extract DID from URL
  const match = input.match(/gitlawb\.com\/([^/?#]+)/);
  if (match) return `did:gitlawb:${match[1]}`;
  // Treat as DID path fragment
  if (/^[a-zA-Z0-9_-]+$/.test(input)) return `did:gitlawb:${input}`;
  return input;
}

export function formatTimeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

export function formatDuration(seconds) {
  const days = Math.floor(seconds / 86400);
  if (days < 30) return `${days} days`;
  if (days < 365) return `${Math.round(days / 30)} months`;
  return `${(days / 365).toFixed(1)} years`;
}
