# LumenLater BNPL Protocol

Decentralized Buy-Now-Pay-Later system built on Stellar's Soroban smart contract platform.

## Overview

LumenLater BNPL Protocol enables merchants to offer instant credit to users while leveraging decentralized finance (DeFi) liquidity. The protocol connects three key participants:

- **Users**: Purchase goods with instant credit
- **Merchants**: Offer BNPL services to increase sales
- **Liquidity Providers**: Earn yield by providing USDC liquidity

## Key Features

- ⚡ **Instant Credit**: Purchase goods immediately with deferred payment
- 🏪 **Merchant Integration**: Simple API for merchants to integrate BNPL services
- 💰 **Yield Generation**: Liquidity providers earn competitive returns
- 🔒 **Collateralized Lending**: Over-collateralized system ensures protocol security
- ⚖️ **Automated Liquidation**: Smart contract-based risk management
- 🌐 **Cross-Chain Ready**: Built on Stellar for fast, low-cost transactions

## 📁 Project Structure

```
lumenlater/
├── apps/web/                   # NextJS Frontend
├── contracts/                  # Soroban Smart Contracts
├── docs/                      # Documentation
└── scripts/                   # Deployment Scripts
```

## 🔧 Smart Contracts

| Contract | Purpose | Status |
|----------|---------|--------|
| **bnpl_core** | Main protocol logic | ✅ Active |
| **lp_token** | Liquidity provider shares | ✅ Active |
| **usdc_token** | Payment token | ✅ Active |

## 🚀 Quick Start

**Prerequisites**: Node.js 18+, Stellar CLI, pnpm

```bash
# Setup
git clone https://github.com/your-org/lumenlater
cd lumenlater
pnpm install
pnpm run setup:fresh:local

# Develop
pnpm run dev                    # http://localhost:3000
```

## 📚 Documentation

**Essential Docs**:
- **[System Architecture](docs/architecture/system-overview.md)** - Technical overview
- **[Whitepaper](docs/protocol/whitepaper.md)** - Protocol specification
- **[BNPL Core Contract](docs/contracts/bnpl-core.md)** - Main contract API

## 🛠️ Development

### Commands

```bash
# Environment
pnpm run env:local              # Switch to local network
pnpm run env:testnet            # Switch to testnet

# Contracts
pnpm run contracts:build        # Build contracts
pnpm run contracts:deploy       # Deploy contracts
pnpm run contracts:test         # Test contracts

# Development
pnpm run dev                    # Start dev server
pnpm run build                  # Build for production
```

## 🔗 Networks

| Network | Purpose | Status |
|---------|---------|--------|
| **Local** | Development | Active |
| **Testnet** | Testing | Active |
| **Mainnet** | Production | TBD |

### Testnet Contract Addresses
- BNPL Core: `CARXH5FIHDJSKPNJOZXLGXKCWHZWYWNAMFGUPTQ4IMYIQ7YXNT3LRXOF`
- USDC Token: `CDAIS5ZE6MA4TKFXFEXUQ2HA6Z2S4DI2PHOLIBXEMNVQ3CIQNMJWJBAY`
- LP Token: `CDY247U3DLKHU3TPRGM2G2MDQLSHZLZ2WHSUDBGHMKR534BGX334F2B2`

## 🚀 Roadmap

- ✅ **Phase 1**: Core contracts & web app
- 🔄 **Phase 2**: Mainnet launch & merchant onboarding  
- 📋 **Phase 3**: Cross-chain expansion

## 🔐 Security

Security is our top priority:
- Over-collateralized lending
- Automated liquidation mechanisms
- Comprehensive test coverage
- Regular security audits

**Report vulnerabilities**: sangwon0001@gmail.com

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

Built with ❤️ on [Stellar](https://stellar.org) using [Soroban](https://soroban.stellar.org)