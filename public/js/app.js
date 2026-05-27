// app.js — main launch page logic
import { connectWallet, signMessage, getWallet, renderWalletButton, setWalletChangeCallback } from "./wallet.js";
import { fetchRepoInfo, requestChallenge, confirmOwnership, recordLaunch, parseRepoDID } from "./gitlawb.js";
import { launchToken, didToBytes32 } from "./contracts.js";

const FACTORY_ADDRESS = window.GITNETWORK_FACTORY_ADDRESS;

let currentStep = 1;
let repoInfo = null;
let sessionToken = null;
let contributors = [];

const steps = {
  1: document.getElementById("step-wallet"),
  2: document.getElementById("step-repo"),
  3: document.getElementById("step-verify"),
  4: document.getElementById("step-tokenomics"),
  5: document.getElementById("step-launch"),
};

function goToStep(n) {
  currentStep = n;
  Object.entries(steps).forEach(([k, el]) => {
    if (!el) return;
    el.style.display = parseInt(k) === n ? "block" : "none";
  });
  document.querySelectorAll(".progress-step").forEach((el, i) => {
    el.classList.remove("active", "done");
    if (i + 1 < n) el.classList.add("done");
    if (i + 1 === n) el.classList.add("active");
  });
  window.scrollTo({ top: document.getElementById("launch-form")?.offsetTop - 80, behavior: "smooth" });
}

function showAlert(parentId, type, message) {
  const parent = document.getElementById(parentId);
  if (!parent) return;
  const existing = parent.querySelector(".alert");
  if (existing) existing.remove();
  const el = document.createElement("div");
  el.className = `alert alert-${type} fade-in`;
  el.innerHTML = `<span>${message}</span>`;
  parent.prepend(el);
}

function setLoading(btnId, loading, text) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.disabled = loading;
  btn.innerHTML = loading
    ? `<span class="spinner"></span>${text || "Loading…"}`
    : btn.dataset.origText || text;
  if (!loading && text) btn.dataset.origText = text;
}

// ── Step 1: Connect Wallet ──
const walletBtn = document.getElementById("wallet-btn");
if (walletBtn) {
  walletBtn.addEventListener("click", async () => {
    try {
      setLoading("wallet-btn", true, "Connecting…");
      const addr = await connectWallet();
      renderWalletButton(walletBtn);
      document.getElementById("wallet-address").textContent = addr;
      document.getElementById("connected-info").style.display = "flex";
      document.getElementById("btn-next-1").disabled = false;
      setLoading("wallet-btn", false, "");
    } catch (err) {
      setLoading("wallet-btn", false, "");
      showAlert("step-wallet", "error", err.message);
    }
  });
}

document.getElementById("btn-next-1")?.addEventListener("click", () => goToStep(2));

// ── Step 2: Fetch Repo ──
document.getElementById("btn-fetch-repo")?.addEventListener("click", async () => {
  const input = document.getElementById("repo-input").value.trim();
  if (!input) return showAlert("step-repo", "error", "Enter a GitLawb repo URL or DID");

  const did = parseRepoDID(input);
  setLoading("btn-fetch-repo", true, "Fetching…");

  try {
    repoInfo = await fetchRepoInfo(did);
    document.getElementById("repo-name").textContent = repoInfo.repoName || did;
    document.getElementById("repo-did-display").textContent = did;
    document.getElementById("repo-desc").textContent = repoInfo.description || "No description";

    if (repoInfo.alreadyLaunched) {
      showAlert("step-repo", "warn", `This repo already has a token: ${repoInfo.tokenInfo?.token_address}`);
      setLoading("btn-fetch-repo", false, "Fetch Repo");
      return;
    }

    document.getElementById("repo-card").style.display = "block";
    document.getElementById("btn-next-2").disabled = false;
    setLoading("btn-fetch-repo", false, "Fetch Repo");
  } catch (err) {
    setLoading("btn-fetch-repo", false, "Fetch Repo");
    showAlert("step-repo", "error", err.message);
  }
});

document.getElementById("btn-next-2")?.addEventListener("click", () => goToStep(3));

// ── Step 3: Verify Ownership ──
document.getElementById("btn-verify")?.addEventListener("click", async () => {
  const wallet = getWallet();
  if (!wallet || !repoInfo) return;

  setLoading("btn-verify", true, "Requesting challenge…");

  try {
    const challenge = await requestChallenge(repoInfo.repoDID, wallet);
    document.getElementById("challenge-display").textContent = challenge;
    document.getElementById("challenge-box").style.display = "block";

    setLoading("btn-verify", false, "Verify Ownership");
    setLoading("btn-sign", true, "Waiting for signature…");

    const signature = await signMessage(challenge);
    setLoading("btn-sign", true, "Verifying…");

    const result = await confirmOwnership(challenge, signature, wallet, repoInfo.repoDID);
    sessionToken = result.sessionToken;

    showAlert("step-verify", "success", "✓ Ownership verified! You can now configure your token.");
    document.getElementById("btn-next-3").disabled = false;
    setLoading("btn-sign", false, "");
  } catch (err) {
    setLoading("btn-verify", false, "Verify Ownership");
    setLoading("btn-sign", false, "");
    showAlert("step-verify", "error", err.message);
  }
});

document.getElementById("btn-next-3")?.addEventListener("click", () => goToStep(4));

// ── Step 4: Tokenomics ──
function addContributorRow(wallet = "", bps = "") {
  const container = document.getElementById("contributors-list");
  const row = document.createElement("div");
  row.className = "contrib-row";
  row.innerHTML = `
    <input class="form-input contrib-wallet" placeholder="0x… wallet address" value="${wallet}" />
    <input class="form-input contrib-bps" type="number" min="0" max="9000" placeholder="% share × 100" value="${bps}" />
    <button class="contrib-remove" title="Remove">×</button>
  `;
  row.querySelector(".contrib-remove").addEventListener("click", () => {
    row.remove();
    updateAllocation();
  });
  row.querySelectorAll("input").forEach((el) => el.addEventListener("input", updateAllocation));
  container.appendChild(row);
  updateAllocation();
}

if (repoInfo?.contributors) {
  repoInfo.contributors.forEach((c) => addContributorRow(c.wallet || "", ""));
}

document.getElementById("btn-add-contributor")?.addEventListener("click", () => addContributorRow());

function updateAllocation() {
  const bpsInputs = document.querySelectorAll(".contrib-bps");
  let totalContrib = 0;
  bpsInputs.forEach((el) => { totalContrib += parseInt(el.value) || 0; });

  const publicBps = parseInt(document.getElementById("public-sale-bps")?.value) || 0;
  const protocolBps = 1000;
  const totalBps = totalContrib + publicBps + protocolBps;
  const remaining = 10000 - totalBps;

  const segments = [
    { label: "Contributors", bps: totalContrib, color: "#3B82F6" },
    { label: "Public Sale", bps: publicBps, color: "#22C55E" },
    { label: "Protocol (10%)", bps: protocolBps, color: "#F59E0B" },
    { label: "Unallocated", bps: Math.max(0, remaining), color: "#374151" },
  ];

  const bar = document.getElementById("alloc-bar");
  const legend = document.getElementById("alloc-legend");
  if (!bar || !legend) return;

  bar.innerHTML = segments.map((s) =>
    `<div class="alloc-segment" style="width:${s.bps / 100}%;background:${s.color}" title="${s.label}: ${s.bps / 100}%"></div>`
  ).join("");

  legend.innerHTML = segments.map((s) =>
    `<div class="alloc-item"><div class="alloc-dot" style="background:${s.color}"></div><span>${s.label}: <b>${s.bps / 100}%</b></span></div>`
  ).join("");

  const warning = document.getElementById("alloc-warning");
  if (warning) {
    if (totalBps > 10000) {
      warning.textContent = `Over-allocated by ${(totalBps - 10000) / 100}%. Reduce shares.`;
      warning.style.display = "block";
    } else {
      warning.style.display = "none";
    }
  }
}

document.getElementById("public-sale-bps")?.addEventListener("input", updateAllocation);

document.getElementById("btn-next-4")?.addEventListener("click", () => {
  const name = document.getElementById("token-name").value.trim();
  const symbol = document.getElementById("token-symbol").value.trim();
  const supply = document.getElementById("token-supply").value.trim();

  if (!name || !symbol || !supply) {
    return showAlert("step-tokenomics", "error", "Fill in token name, symbol, and supply");
  }

  document.getElementById("review-name").textContent = `${name} (${symbol})`;
  document.getElementById("review-supply").textContent = Number(supply).toLocaleString();
  document.getElementById("review-fee").textContent = "0.005 ETH";

  const bpsInputs = document.querySelectorAll(".contrib-bps");
  let total = 0;
  bpsInputs.forEach((el) => { total += parseInt(el.value) || 0; });
  document.getElementById("review-contributors").textContent = `${bpsInputs.length} contributors (${total / 100}%)`;

  goToStep(5);
});

// ── Step 5: Launch ──
document.getElementById("btn-launch")?.addEventListener("click", async () => {
  if (!FACTORY_ADDRESS) {
    return showAlert("step-launch", "error", "Factory contract not deployed yet. Set GITNETWORK_FACTORY_ADDRESS.");
  }

  const wallet = getWallet();
  if (!wallet || !sessionToken || !repoInfo) return;

  const name = document.getElementById("token-name").value.trim();
  const symbol = document.getElementById("token-symbol").value.trim();
  const totalSupply = document.getElementById("token-supply").value.trim();
  const cliffMonths = parseInt(document.getElementById("vesting-cliff").value) || 0;
  const durationMonths = parseInt(document.getElementById("vesting-duration").value) || 12;
  const publicSaleBps = parseInt(document.getElementById("public-sale-bps").value) || 0;

  const contribWallets = [...document.querySelectorAll(".contrib-wallet")].map((el) => el.value.trim());
  const contribBps = [...document.querySelectorAll(".contrib-bps")].map((el) => parseInt(el.value) || 0);

  const repoDIDBytes32 = didToBytes32(repoInfo.repoDID);
  const supplyWei = BigInt(totalSupply) * BigInt(10 ** 18);
  const cliffSeconds = cliffMonths * 30 * 24 * 3600;
  const durationSeconds = durationMonths * 30 * 24 * 3600;

  setLoading("btn-launch", true, "Sending transaction…");

  try {
    const receipt = await launchToken(FACTORY_ADDRESS, {
      repoDID: repoDIDBytes32,
      repoUrl: repoInfo.repoUrl || "",
      name,
      symbol,
      totalSupply: supplyWei,
      contributors: contribWallets,
      sharesBps: contribBps,
      vestingCliff: cliffSeconds,
      vestingDuration: durationSeconds,
      publicSaleBps,
    });

    const launchedEvent = receipt.logs?.find((l) => l.topics?.[0]?.startsWith("0x"));
    const tokenAddress = launchedEvent ? "0x" + launchedEvent.topics?.[2]?.slice(-40) : "unknown";

    await recordLaunch(sessionToken, {
      repoDID: repoInfo.repoDID,
      repoUrl: repoInfo.repoUrl,
      repoName: repoInfo.repoName,
      tokenAddress,
      factoryAddress: FACTORY_ADDRESS,
      txHash: receipt.transactionHash,
      tokenName: name,
      tokenSymbol: symbol,
      totalSupply: totalSupply,
      chainId: 8453,
      contributors: contribWallets.map((w, i) => ({
        wallet: w,
        amount: (BigInt(totalSupply) * BigInt(10 ** 18) * BigInt(contribBps[i])) / BigInt(10000),
        cliffSeconds,
        durationSeconds,
      })),
    });

    document.getElementById("success-token-address").textContent = tokenAddress;
    document.getElementById("success-tx").href = `https://basescan.org/tx/${receipt.transactionHash}`;
    document.getElementById("success-tx").textContent = receipt.transactionHash.slice(0, 20) + "…";
    document.getElementById("success-box").style.display = "block";
    document.getElementById("btn-launch").style.display = "none";
    setLoading("btn-launch", false, "");
  } catch (err) {
    setLoading("btn-launch", false, "Launch Token →");
    showAlert("step-launch", "error", err.message);
  }
});

// Init
goToStep(1);
updateAllocation();
