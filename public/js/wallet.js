// wallet.js — wallet connection via window.ethereum (MetaMask / Coinbase Wallet / injected)

const BASE_CHAIN_ID = 8453;
const BASE_SEPOLIA_CHAIN_ID = 84532;
const TARGET_CHAIN_ID = parseInt(window.GITNETWORK_CHAIN_ID || BASE_CHAIN_ID);

let walletAddress = null;
let onWalletChange = null;

export function setWalletChangeCallback(fn) {
  onWalletChange = fn;
}

export function getWallet() {
  return walletAddress;
}

export async function connectWallet() {
  if (!window.ethereum) {
    throw new Error("No wallet detected. Please install MetaMask or Coinbase Wallet.");
  }

  const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
  if (!accounts || accounts.length === 0) throw new Error("No accounts returned");

  walletAddress = accounts[0].toLowerCase();

  await switchToBase();

  window.ethereum.on("accountsChanged", (accs) => {
    walletAddress = accs[0]?.toLowerCase() || null;
    onWalletChange?.(walletAddress);
  });

  window.ethereum.on("chainChanged", () => window.location.reload());

  return walletAddress;
}

export async function switchToBase() {
  const chainHex = "0x" + TARGET_CHAIN_ID.toString(16);
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: chainHex }],
    });
  } catch (err) {
    if (err.code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: chainHex,
          chainName: TARGET_CHAIN_ID === BASE_CHAIN_ID ? "Base" : "Base Sepolia",
          rpcUrls: [TARGET_CHAIN_ID === BASE_CHAIN_ID ? "https://mainnet.base.org" : "https://sepolia.base.org"],
          nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
          blockExplorerUrls: [TARGET_CHAIN_ID === BASE_CHAIN_ID ? "https://basescan.org" : "https://sepolia.basescan.org"],
        }],
      });
    } else {
      throw err;
    }
  }
}

export async function signMessage(message) {
  if (!walletAddress) throw new Error("Wallet not connected");
  const signature = await window.ethereum.request({
    method: "personal_sign",
    params: [message, walletAddress],
  });
  return signature;
}

export async function getChainId() {
  const hex = await window.ethereum.request({ method: "eth_chainId" });
  return parseInt(hex, 16);
}

export function shortenAddress(addr) {
  if (!addr) return "";
  return addr.slice(0, 6) + "…" + addr.slice(-4);
}

export function renderWalletButton(btnEl) {
  if (!btnEl) return;
  if (walletAddress) {
    btnEl.classList.add("connected");
    btnEl.innerHTML = `<span class="wallet-dot"></span>${shortenAddress(walletAddress)}`;
  } else {
    btnEl.classList.remove("connected");
    btnEl.innerHTML = `<span class="wallet-dot"></span>Connect Wallet`;
  }
}
