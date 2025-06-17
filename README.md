# JC4P Dev Hours Frame

A Farcaster Frame V2 application for purchasing and redeeming JC4P development hours using USDC on Base.

## Overview

This is a decentralized marketplace for development services where users can:
- Purchase development hours from @jc4p using USDC
- Redeem purchased hours for consulting, training, MVP development, and more
- Track purchase and redemption history
- View global activity feed for social proof

## Features

- **Farcaster Frame V2 Integration**: Seamless authentication and wallet interaction through Farcaster
- **USDC Payments**: Gasless transactions using EIP-2612 permit signatures
- **Discount System**: Automatic discounts for OG Auction Bidders and mutual followers
- **Terminal UI**: Retro terminal aesthetic with JetBrains Mono and Plus Jakarta Sans fonts
- **Mobile-First Design**: Optimized for mobile Frame usage
- **Real-Time Updates**: Live contract data and transaction history

## Tech Stack

- **Frontend**: React, Vite, Tailwind CSS v4
- **Blockchain**: Base (Ethereum L2)
- **Smart Contract**: ERC-1155 token with USDC payments
- **Authentication**: Farcaster Quick Auth
- **API**: Hosted at https://jc4p-token-api.kasra.codes

## Getting Started

### Prerequisites

- Node.js 18+
- Bun package manager
- A Farcaster account

### Installation

1. Clone the repository:
```bash
git clone https://github.com/jc4p/jc4p-dev-token-frame.git
cd jc4p-dev-token-frame
```

2. Install dependencies:
```bash
bun install
```

3. Start the development server:
```bash
bun run dev
```

4. Open the app in a Farcaster Frame-compatible client

## Project Structure

```
├── src/
│   ├── components/     # React components
│   ├── contexts/       # React contexts
│   ├── lib/           # Core libraries (frame, contract, api)
│   ├── pages/         # Page components
│   └── utils/         # Constants and utilities
├── docs/              # Documentation and contracts
├── public/            # Static assets
└── index.html         # Entry point
```

## Smart Contract

The JC4PDevHours contract is deployed on Base at: `0xf20b196c483385badf308a5ce1be2492c95ab166`

Key features:
- ERC-1155 token representing dev hours
- USDC payment with permit signatures (no approval needed)
- Voucher-based discount system
- Weekly redemption caps
- 10% refund buffer

## API Endpoints

The API provides authenticated access to:
- Voucher generation with discount calculation
- Purchase and redemption history
- Contract information and user balances
- Redemption request management

See `docs/FRONTEND_INTEGRATION.md` for detailed API documentation.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

Copyright (c) 2024 Kasra Rahjerdi

