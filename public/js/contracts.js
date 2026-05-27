// contracts.js — ABI definitions and contract interaction helpers

export const REPO_FACTORY_ABI = [
  {
    "inputs": [{"internalType":"address","name":"_owner","type":"address"}],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "name": "launchRepoToken",
    "type": "function",
    "stateMutability": "payable",
    "inputs": [
      {"internalType":"bytes32","name":"repoDID","type":"bytes32"},
      {"internalType":"string","name":"repoUrl","type":"string"},
      {"internalType":"string","name":"name","type":"string"},
      {"internalType":"string","name":"symbol","type":"string"},
      {"internalType":"uint256","name":"totalSupply","type":"uint256"},
      {"internalType":"address[]","name":"contributors","type":"address[]"},
      {"internalType":"uint256[]","name":"sharesBps","type":"uint256[]"},
      {"internalType":"uint256","name":"vestingCliff","type":"uint256"},
      {"internalType":"uint256","name":"vestingDuration","type":"uint256"},
      {"internalType":"uint256","name":"publicSaleBps","type":"uint256"}
    ],
    "outputs": [{"internalType":"address","name":"tokenAddress","type":"address"}]
  },
  {
    "name": "getToken",
    "type": "function",
    "stateMutability": "view",
    "inputs": [{"internalType":"bytes32","name":"repoDID","type":"bytes32"}],
    "outputs": [{"internalType":"address","name":"","type":"address"}]
  },
  {
    "name": "repoTokens",
    "type": "function",
    "stateMutability": "view",
    "inputs": [{"internalType":"bytes32","name":"","type":"bytes32"}],
    "outputs": [{"internalType":"address","name":"","type":"address"}]
  },
  {
    "name": "LAUNCH_FEE",
    "type": "function",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [{"internalType":"uint256","name":"","type":"uint256"}]
  },
  {
    "name": "TokenLaunched",
    "type": "event",
    "inputs": [
      {"indexed":true,"internalType":"bytes32","name":"repoDID","type":"bytes32"},
      {"indexed":true,"internalType":"address","name":"tokenAddress","type":"address"},
      {"indexed":true,"internalType":"address","name":"deployer","type":"address"},
      {"indexed":false,"internalType":"address","name":"vestingContract","type":"address"},
      {"indexed":false,"internalType":"address","name":"treasuryContract","type":"address"}
    ]
  }
];

export const CONTRIBUTOR_VESTING_ABI = [
  {
    "name": "claim",
    "type": "function",
    "stateMutability": "nonpayable",
    "inputs": [],
    "outputs": []
  },
  {
    "name": "vestedAmount",
    "type": "function",
    "stateMutability": "view",
    "inputs": [{"internalType":"address","name":"contributor","type":"address"}],
    "outputs": [{"internalType":"uint256","name":"","type":"uint256"}]
  },
  {
    "name": "schedules",
    "type": "function",
    "stateMutability": "view",
    "inputs": [{"internalType":"address","name":"","type":"address"}],
    "outputs": [
      {"internalType":"uint256","name":"total","type":"uint256"},
      {"internalType":"uint256","name":"released","type":"uint256"},
      {"internalType":"uint256","name":"start","type":"uint256"},
      {"internalType":"uint256","name":"cliff","type":"uint256"},
      {"internalType":"uint256","name":"duration","type":"uint256"}
    ]
  },
  {
    "name": "token",
    "type": "function",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [{"internalType":"address","name":"","type":"address"}]
  },
  {
    "name": "Claimed",
    "type": "event",
    "inputs": [
      {"indexed":true,"internalType":"address","name":"contributor","type":"address"},
      {"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"},
      {"indexed":false,"internalType":"uint256","name":"timestamp","type":"uint256"}
    ]
  }
];

export const REPO_GOVERNANCE_ABI = [
  {
    "name": "createProposal",
    "type": "function",
    "stateMutability": "nonpayable",
    "inputs": [
      {"internalType":"string","name":"description","type":"string"},
      {"internalType":"uint256","name":"votingPeriod","type":"uint256"}
    ],
    "outputs": [{"internalType":"uint256","name":"proposalId","type":"uint256"}]
  },
  {
    "name": "vote",
    "type": "function",
    "stateMutability": "nonpayable",
    "inputs": [
      {"internalType":"uint256","name":"proposalId","type":"uint256"},
      {"internalType":"bool","name":"support","type":"bool"}
    ],
    "outputs": []
  },
  {
    "name": "executeProposal",
    "type": "function",
    "stateMutability": "nonpayable",
    "inputs": [{"internalType":"uint256","name":"proposalId","type":"uint256"}],
    "outputs": []
  },
  {
    "name": "getProposal",
    "type": "function",
    "stateMutability": "view",
    "inputs": [{"internalType":"uint256","name":"proposalId","type":"uint256"}],
    "outputs": [
      {"internalType":"string","name":"description","type":"string"},
      {"internalType":"uint256","name":"votesFor","type":"uint256"},
      {"internalType":"uint256","name":"votesAgainst","type":"uint256"},
      {"internalType":"uint256","name":"endsAt","type":"uint256"},
      {"internalType":"uint8","name":"state","type":"uint8"},
      {"internalType":"address","name":"proposer","type":"address"}
    ]
  },
  {
    "name": "hasVoted",
    "type": "function",
    "stateMutability": "view",
    "inputs": [
      {"internalType":"uint256","name":"proposalId","type":"uint256"},
      {"internalType":"address","name":"voter","type":"address"}
    ],
    "outputs": [{"internalType":"bool","name":"","type":"bool"}]
  },
  {
    "name": "proposalCount",
    "type": "function",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [{"internalType":"uint256","name":"","type":"uint256"}]
  },
  {
    "name": "governanceToken",
    "type": "function",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [{"internalType":"address","name":"","type":"address"}]
  }
];

export const ERC20_ABI = [
  {
    "name": "balanceOf",
    "type": "function",
    "stateMutability": "view",
    "inputs": [{"internalType":"address","name":"account","type":"address"}],
    "outputs": [{"internalType":"uint256","name":"","type":"uint256"}]
  },
  {
    "name": "totalSupply",
    "type": "function",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [{"internalType":"uint256","name":"","type":"uint256"}]
  },
  {
    "name": "name",
    "type": "function",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [{"internalType":"string","name":"","type":"string"}]
  },
  {
    "name": "symbol",
    "type": "function",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [{"internalType":"string","name":"","type":"string"}]
  },
  {
    "name": "decimals",
    "type": "function",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [{"internalType":"uint8","name":"","type":"uint8"}]
  }
];

// ── Helpers ──

const LAUNCH_FEE = "5000000000000000"; // 0.005 ETH in wei

export async function callContract(address, abi, method, args = [], value = "0") {
  const iface = encodeFunction(abi, method, args);
  const tx = {
    to: address,
    data: iface,
    value: "0x" + BigInt(value).toString(16),
  };
  const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
  tx.from = accounts[0];
  return await window.ethereum.request({ method: "eth_sendTransaction", params: [tx] });
}

export async function readContract(address, abi, method, args = []) {
  const data = encodeFunction(abi, method, args);
  const result = await window.ethereum.request({
    method: "eth_call",
    params: [{ to: address, data }, "latest"],
  });
  return result;
}

function encodeFunction(abi, method, args) {
  const fn = abi.find((x) => x.name === method && x.type === "function");
  if (!fn) throw new Error(`ABI: function ${method} not found`);

  const selector = keccak256Selector(`${method}(${fn.inputs.map((i) => i.internalType || i.type).join(",")})`);
  const encoded = encodeParams(fn.inputs, args);
  return selector + encoded;
}

function keccak256Selector(sig) {
  // Use a minimal keccak — browsers have SubtleCrypto but not keccak256.
  // We rely on viem/ethers being injected or a fallback.
  // For now, precomputed selectors are used in production via viem.
  // This is a stub for non-viem usage — prefer using window.viem if available.
  if (window._viemKeccak) return window._viemKeccak(sig).slice(0, 10);
  throw new Error("keccak256 not available. Include viem CDN.");
}

function encodeParams(inputs, args) {
  // Encoding handled by viem in production; this function delegates
  if (window._viemEncode) return window._viemEncode(inputs, args);
  throw new Error("viem encode not available");
}

export async function launchToken(factoryAddress, params) {
  const { publicClient, walletClient } = window._viemClients;

  const tx = await walletClient.writeContract({
    address: factoryAddress,
    abi: REPO_FACTORY_ABI,
    functionName: "launchRepoToken",
    args: [
      params.repoDID,
      params.repoUrl,
      params.name,
      params.symbol,
      BigInt(params.totalSupply),
      params.contributors,
      params.sharesBps.map(BigInt),
      BigInt(params.vestingCliff),
      BigInt(params.vestingDuration),
      BigInt(params.publicSaleBps),
    ],
    value: BigInt(LAUNCH_FEE),
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
  return receipt;
}

export async function claimVesting(vestingAddress) {
  const { walletClient } = window._viemClients;
  const tx = await walletClient.writeContract({
    address: vestingAddress,
    abi: CONTRIBUTOR_VESTING_ABI,
    functionName: "claim",
    args: [],
  });
  return tx;
}

export async function castVote(governanceAddress, proposalId, support) {
  const { walletClient } = window._viemClients;
  const tx = await walletClient.writeContract({
    address: governanceAddress,
    abi: REPO_GOVERNANCE_ABI,
    functionName: "vote",
    args: [BigInt(proposalId), support],
  });
  return tx;
}

export async function createProposal(governanceAddress, description, votingDays) {
  const { walletClient } = window._viemClients;
  const votingPeriod = BigInt(votingDays * 24 * 60 * 60);
  const tx = await walletClient.writeContract({
    address: governanceAddress,
    abi: REPO_GOVERNANCE_ABI,
    functionName: "createProposal",
    args: [description, votingPeriod],
  });
  return tx;
}

export function formatTokenAmount(rawBigInt, decimals = 18) {
  const divisor = BigInt(10 ** decimals);
  const whole = rawBigInt / divisor;
  return whole.toLocaleString();
}

export function didToBytes32(did) {
  // Convert a DID string to bytes32 using keccak256
  if (window._viemKeccak32) return window._viemKeccak32(did);
  const enc = new TextEncoder().encode(did);
  // Pad to 32 bytes — note: for production use keccak256(did)
  const hex = Array.from(enc).map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 64).padEnd(64, "0");
  return "0x" + hex;
}
