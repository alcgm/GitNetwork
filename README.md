# GitNetwork

> Permissionless token launchpad for GitLawb repositories on Base mainnet.

Every GitLawb repo can launch its own ERC-20 token, distribute tokens to contributors via vesting, seed liquidity on Aerodrome (Base DEX), and govern the repo via token-weighted voting.

**Live:** [gitnetwork.fun](https://gitnetwork.fun)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser (SPA)                        │
│  index.html · dashboard.html · claim.html · governance.html │
│                  Wallet: MetaMask / Coinbase                 │
└────────────┬──────────────────────────────┬─────────────────┘
             │ /api/*                        │ eth_sendTransaction
             ▼                              ▼
┌─────────────────────┐      ┌──────────────────────────────┐
│  Vercel Edge API    │      │       Base Mainnet            │
│  ├ repo-info.js     │      │  ┌── RepoFactory.sol          │
│  ├ verify-did.js    │      │  ├── RepoToken.sol (ERC-20)   │
│  ├ launch-token.js  │      │  ├── ContributorVesting.sol   │
│  ├ vesting-status.js│      │  ├── RepoTreasury.sol         │
│  └ webhook-gitlawb  │      │  └── RepoGovernance.sol       │
└────────┬────────────┘      └──────────────────────────────┘
         │
         ▼
┌─────────────────────┐      ┌──────────────────────────────┐
│  Supabase (Postgres)│      │  GitLawb Node API            │
│  ├ launches         │◄────►│  node.gitlawb.com            │
│  ├ vestings         │      │  DID resolution + repo info  │
│  ├ proposals        │      └──────────────────────────────┘
│  ├ did_sessions     │
│  └ pr_events        │
└─────────────────────┘
```

---

## Contract Addresses

| Contract | Base Mainnet | Base Sepolia |
|---|---|---|
| RepoFactory | `0x7DB0f874Ab95fd32e8755662B86f032429EFa4D6` | `[DEPLOY AND FILL]` |
| Aerodrome Router | `0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43` | — |
| WETH (Base) | `0x4200000000000000000000000000000000000006` | — |

---

## Setup

### Prerequisites
- [Foundry](https://book.getfoundry.sh/getting-started/installation)
- [Vercel CLI](https://vercel.com/docs/cli)
- [Node.js](https://nodejs.org/) 18+
- Supabase project
- Basescan API key

### 1. Clone & configure

```bash
git clone https://github.com/alcgm/GitNetwork
cd GitNetwork
cp .env.example .env
# Fill in all values in .env
```

### 2. Set up Supabase

Run the schema in your Supabase SQL editor:

```bash
# Copy contents of supabase/schema.sql into Supabase SQL editor and run
```

### 3. Install Foundry dependencies

```bash
cd contracts
forge install OpenZeppelin/openzeppelin-contracts
```

### 4. Compile contracts

```bash
cd contracts
forge build
```

### 5. Run tests

```bash
cd contracts
forge test -vvv
```

---

## Deployment

### Deploy to Base Sepolia (testnet)

```bash
cd contracts
forge script script/Deploy.s.sol \
  --rpc-url base_sepolia \
  --broadcast \
  --verify \
  -vvv
```

### Deploy to Base Mainnet

```bash
cd contracts
forge script script/Deploy.s.sol \
  --rpc-url base_mainnet \
  --broadcast \
  --verify \
  -vvv
```

After deploy:
1. Copy `RepoFactory` address from `deployed-addresses.json`
2. Set `NEXT_PUBLIC_FACTORY_ADDRESS` in `.env` and Vercel env vars
3. Update `window.GITNETWORK_FACTORY_ADDRESS` in `public/index.html`

### Deploy frontend + API to Vercel

```bash
vercel deploy --prod
```

Set all `.env` variables in Vercel dashboard under Project → Settings → Environment Variables.

---

## How It Works

1. **Connect Wallet** — User connects MetaMask/Coinbase Wallet on Base mainnet
2. **Fetch Repo** — Enter GitLawb repo URL or DID; backend fetches metadata from `node.gitlawb.com`
3. **Verify Ownership** — Backend generates challenge; user signs with wallet; backend verifies signature matches repo owner DID
4. **Configure Tokenomics** — Set name, symbol, supply, contributor allocations (in BPS), vesting cliff/duration, public sale %
5. **Launch** — Calls `RepoFactory.launchRepoToken()` which:
   - Deploys `RepoToken` (ERC-20 + EIP-2612 permit)
   - Deploys `ContributorVesting` with linear vesting schedules
   - Deploys `RepoTreasury` for LP seeding
   - Mints tokens to all parties
   - Charges 0.005 ETH launch fee
   - Sends 10% of supply to protocol owner
6. **Seed Liquidity** — Treasury owner calls `seedLiquidity()` to create token/ETH pool on Aerodrome
7. **Govern** — Token holders create proposals and vote; 10% quorum + 51% threshold

---

## Contract Tokenomics Split

| Allocation | Who | Max |
|---|---|---|
| Contributors | Vesting contract (linear) | Up to 90% combined |
| Public Sale | RepoTreasury → Aerodrome LP | Up to 90% combined |
| Protocol fee | GitNetwork owner | 10% fixed |

---

## Security Notes

- `DEPLOYER_PRIVATE_KEY` is only used once during Foundry deploy and never stored in code
- DID verification uses `personal_sign` + on-chain recovery
- JWT sessions expire in 24h
- Webhook signatures verified with HMAC-SHA256
- ReentrancyGuard on all state-changing contract functions
- No admin keys on deployed tokens — factory loses mint rights after deployment

---

## License

MIT
