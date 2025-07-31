# USDC Token Integration

## Overview

The LumenLater BNPL Protocol uses USDC (USD Coin) as its primary payment token. USDC is an external Stellar asset, not developed or managed by the protocol.

## Token Details

| Property | Value |
|----------|-------|
| **Type** | External Stellar Asset |
| **Symbol** | USDC |
| **Decimals** | 7 (Stellar standard) |
| **Issuer** | Circle (or other authorized issuer) |

## Integration Points

### 1. Payment Processing
- Users pay bills using USDC
- Merchants receive USDC payments (minus 1.5% fee)
- All transactions are denominated in USDC

### 2. Liquidity Pool
- Liquidity providers deposit USDC
- USDC is borrowed from the pool for BNPL transactions
- Repayments return USDC to the pool

### 3. Yield Distribution
- Merchant fees collected in USDC
- Late fees collected in USDC
- All yields distributed to LP holders in USDC

## Required Approvals

Users must approve the BNPL Core contract to spend their USDC:

```rust
// User approves BNPL Core to spend USDC
usdc_token.approve(user, bnpl_core, amount, expiration);
```

## Test Token

For development and testing purposes, a mock USDC token contract is provided in `contracts/usdc_token/`. This test token includes:

- Standard token interface compliance
- Minting capabilities for testing
- Daily mint limits for controlled testing

**Note**: In production, the protocol will integrate with the official USDC token on Stellar, not the test implementation.

## Security Considerations

- Always verify the USDC token address before integration
- Ensure proper approval amounts to prevent overspending
- Monitor USDC balance changes for accurate accounting