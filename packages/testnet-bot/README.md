# Lumen Later Testnet Bot

Automated transaction generator for testing the Lumen Later BNPL protocol on Stellar testnet.

## Overview

The testnet bot simulates real-world usage patterns by automatically generating transactions across the BNPL protocol. It creates merchants, users, LP deposits/withdrawals, and BNPL bill cycles to stress-test the protocol and provide realistic testnet activity.

### Key Features

- **Automated BNPL Cycles**: Creates bills, processes payments, and handles repayments
- **Liquidity Pool Operations**: Simulates LP deposits and withdrawals
- **Account Management**: Manages pools of merchant and user accounts
- **Goal Tracking**: Tracks progress toward TVL, merchant count, user count, and daily transaction targets
- **Volume Tracking**: Monitors daily and cumulative transaction volume in USDC
- **Remote Control**: Responds to pause/resume commands from the admin UI
- **State Persistence**: Saves state to MongoDB for recovery across restarts

## Architecture

```
packages/testnet-bot/
├── src/
│   ├── accounts/       # Account pool management
│   ├── api/            # API client for web app
│   ├── config/         # Configuration loading
│   ├── contracts/      # Soroban contract interactions
│   │   ├── bnpl-actions.ts   # BNPL contract calls
│   │   ├── lp-actions.ts     # LP token operations
│   │   └── usdc-actions.ts   # USDC token operations
│   ├── core/
│   │   ├── engine.ts         # Main bot engine
│   │   ├── goal-tracker.ts   # Goal progress tracking
│   │   ├── scheduler.ts      # Random interval scheduling
│   │   └── state-manager.ts  # MongoDB state persistence
│   ├── scenarios/
│   │   ├── base.ts           # Base scenario class
│   │   ├── bootstrap.ts      # Initial setup scenarios
│   │   ├── bnpl-cycle.ts     # BNPL bill lifecycle
│   │   └── lp-flow.ts        # LP deposit/withdraw
│   └── utils/
│       ├── delay.ts          # Rate limiting utilities
│       └── logger.ts         # Colored console logging
├── bin/
│   ├── run.js          # Main bot runner
│   ├── bootstrap.js    # Bootstrap script
│   └── status.js       # Status checker
└── ecosystem.config.cjs # PM2 configuration
```

## Installation

```bash
# From monorepo root
pnpm install

# Build the bot
cd packages/testnet-bot
pnpm build
```

## Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

### Required Environment Variables

| Variable | Description |
|----------|-------------|
| `USDC_TOKEN_ID` | USDC token contract ID |
| `LP_TOKEN_ID` | LP token contract ID |
| `BNPL_CORE_ID` | BNPL core contract ID |
| `MONGODB_URI` | MongoDB connection string |

### Optional Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `STELLAR_NETWORK` | `testnet` | Network name |
| `STELLAR_RPC_URL` | `https://soroban-testnet.stellar.org:443` | Soroban RPC endpoint |
| `STELLAR_ACCOUNT` | `deployer` | Admin account name in stellar keys |
| `API_BASE_URL` | `http://localhost:3000/api` | Web app API URL |
| `MONGODB_DB_NAME` | `soroban-bnpl` | MongoDB database name |
| `TARGET_TVL` | `100000` | TVL goal in USDC |
| `TARGET_MERCHANTS` | `10` | Number of merchants to create |
| `TARGET_USERS` | `20` | Number of users to create |
| `TARGET_DAILY_TX` | `50` | Daily transaction target |
| `MIN_INTERVAL` | `30000` | Minimum interval between transactions (ms) |
| `MAX_INTERVAL` | `300000` | Maximum interval between transactions (ms) |

## Usage

### Bootstrap (Initial Setup)

Run bootstrap to create merchants, users, and initial LP deposits:

```bash
# Run full bootstrap
pnpm bootstrap

# Or run individual steps
node dist/bin/bootstrap-step.js 1  # Step 1: Fund deployer
node dist/bin/bootstrap-step.js 2  # Step 2: Create merchants
node dist/bin/bootstrap-step.js 3  # Step 3: Create users
# ... steps 4-8 for LP deposits and registrations
```

### Running the Bot

```bash
# Direct execution
pnpm start

# Run once (single transaction)
pnpm run:once

# Using PM2 (recommended for production)
pm2 start ecosystem.config.cjs --only testnet-bot
pm2 logs testnet-bot
pm2 stop testnet-bot
```

### Check Status

```bash
pnpm status
```

## Admin UI Integration

The bot integrates with the web app's admin dashboard at `/admin/testbot`:

### Features

- **Real-time Status**: View running state, uptime, and recent activity
- **Goal Progress**: Track TVL, merchants, users, and daily transactions
- **Volume Metrics**: Monitor daily and total transaction volume in USDC
- **Remote Control**: Pause/resume the bot from the dashboard

### Remote Control

The bot polls MongoDB every 30 seconds for control commands:

```typescript
// Admin UI updates MongoDB
await prisma.botState.update({
  where: { id: 'current' },
  data: { isRunning: false } // Pause
});

// Bot detects change and pauses
// [14:17:02] Remote control: pausing from admin command
// [14:17:02] Scheduler paused
```

## Scenarios

### BNPL Cycle (`bnpl-cycle`)

1. Creates a bill with random merchant and user
2. User pays the bill via BNPL
3. Optionally repays the bill immediately (simulating instant repayment)

### LP Deposit (`lp-deposit`)

Deposits USDC into the liquidity pool from a user account.

### LP Withdraw (`lp-withdraw`)

Withdraws USDC from the liquidity pool to a user account.

### Bootstrap Scenarios

- `bootstrap-fund-deployer`: Fund deployer account from friendbot
- `bootstrap-merchants`: Create and register merchant accounts
- `bootstrap-users`: Create user accounts with initial USDC
- `bootstrap-lp-deposits`: Initial LP deposits from users

## State Management

### MongoDB Collections

The bot uses the same MongoDB database as the web app:

- `bot_state`: Current bot state (running status, daily stats, goals)
- `bot_activities`: Activity log for each transaction

### State Fields

```typescript
interface BotState {
  isRunning: boolean;
  startedAt?: Date;
  dailyStatsDate: string;
  dailyTxCount: number;
  dailySuccessCount: number;
  dailyFailureCount: number;
  dailyVolume: number;      // Daily USDC volume
  dailyScenarios: Record<string, number>;
  totalVolume: number;      // Cumulative USDC volume
  accountPool: AccountPool;
  goalProgress: GoalProgress;
}
```

## Development

### Build

```bash
pnpm build
```

### Watch Mode

```bash
pnpm dev
```

### Project Structure

The bot is part of the Lumen Later monorepo and depends on:

- `@lumenlater/shared`: Common utilities
- `@lumenlater/bnpl-core-client`: BNPL contract bindings
- `@lumenlater/lp-token-client`: LP token contract bindings
- `@lumenlater/usdc-token-client`: USDC token contract bindings

## Troubleshooting

### Bot Not Responding to Admin Commands

Check that:
1. MongoDB connection is working
2. Bot is running (check PM2 logs)
3. Wait up to 30 seconds for the poll interval

### Transactions Failing

Check:
1. Account balances (USDC, XLM for fees)
2. Contract IDs are correct
3. RPC endpoint is accessible

### State Not Persisting

Verify:
1. MongoDB URI is correct
2. Database permissions allow writes
3. Check bot logs for MongoDB errors

## License

MIT
