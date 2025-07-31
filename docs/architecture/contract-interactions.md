# Contract Interactions

This document provides a high-level overview of how the smart contracts interact in the LumenLater BNPL Protocol.

## Contract Overview

| Contract | Purpose | Type |
|----------|---------|------|
| BNPL Core | Main protocol logic | Protocol Contract |
| LP Token | Liquidity provider shares | Protocol Contract |
| USDC Token | Payment currency | External Stellar Asset |

*For detailed contract specifications, see the [contracts documentation](../contracts/).*

## Interaction Patterns

### 1. Bill Creation and Payment

```mermaid
sequenceDiagram
    participant M as Merchant
    participant BC as BNPL Core
    participant U as User
    participant UC as USDC Contract
    participant LP as LP Token

    M->>BC: create_bill(user, amount, order_id)
    BC->>BC: validate merchant status
    BC->>BC: emit bill_created event
    
    Note over U: User decides to pay with BNPL
    U->>BC: pay_bill_bnpl(bill_id)
    BC->>BC: validate bill status
    BC->>BC: check user borrowing power
    BC->>LP: lock collateral (111%)
    BC->>UC: transfer to merchant (98.5%)
    BC->>BC: collect 1.5% fee
    BC->>BC: create BNPL record
    BC->>BC: emit bill_paid event
```

### 2. Liquidity Provision

```mermaid
sequenceDiagram
    participant LP as Liquidity Provider
    participant UC as USDC Contract
    participant BC as BNPL Core
    participant LT as LP Token

    LP->>UC: approve(bnpl_core, amount)
    LP->>BC: deposit(amount)
    BC->>UC: transfer_from(lp, pool, amount)
    BC->>LT: mint shares
    BC->>BC: emit deposit event
```

### 3. Loan Repayment

```mermaid
sequenceDiagram
    participant U as User
    participant UC as USDC Contract
    participant BC as BNPL Core
    participant LT as LP Token

    U->>UC: approve(bnpl_core, repay_amount)
    U->>BC: repay_bill(bill_id)
    BC->>BC: calculate repayment (0% if < 14 days)
    BC->>UC: transfer_from(user, pool, amount)
    BC->>LP: unlock collateral
    BC->>BC: update bill status
    BC->>BC: emit bill_repaid event
```

## Key Interaction Flows

### Complete BNPL Transaction Lifecycle

1. **Bill Creation**: Merchant creates a bill for user
2. **BNPL Payment**: User pays with BNPL (0% interest for 14 days)
   - 111% LP token collateral locked
   - 98.5% transferred to merchant
   - 1.5% fee collected for LPs
3. **Repayment**: User repays within 14 days
   - No interest charged
   - Collateral unlocked
   - Bill marked as repaid

### Liquidity Management

- **Deposit**: LPs provide USDC, receive LP tokens
- **Withdraw**: LPs burn LP tokens, receive USDC + yield
- **Yield Source**: 1.5% merchant fees from all BNPL transactions

### Liquidation Process

When a BNPL loan is overdue beyond the 14-day grace period:
- Health factor < 1.2 triggers liquidation eligibility
- Liquidator repays the debt and receives collateral + 10% bonus
- Protects the protocol from bad debt

## State Management

### Key State Elements

- **User State**: LP token balance, locked collateral, active BNPL loans
- **Protocol State**: Total liquidity, fees collected, active bills
- **Merchant State**: Enrollment status, bills created

### Atomic Operations

All contract interactions are atomic - either all succeed or all fail. This ensures consistency across the protocol.

## Performance Considerations

- **Stellar Network**: 3-5 second finality, ~$0.00001 transaction fees
- **Optimized Storage**: Efficient data structures minimize costs
- **Event System**: All important actions emit events for off-chain tracking

## Security Features

- **Access Control**: Role-based permissions (Admin, Merchant, User)
- **Input Validation**: All inputs validated before processing
- **Reentrancy Protection**: State updates before external calls
- **Over-collateralization**: 111% collateral requirement protects protocol

For detailed security implementation, see the [BNPL Core contract documentation](../contracts/bnpl-core.md).