# BNPL Core Contract

The BNPL Core contract is the main protocol contract managing bills, BNPL loans, merchants, and liquidity pools.

## Contract Overview

| Property | Value |
|----------|--------|
| **Name** | BNPL Core |
| **Language** | Rust (Soroban) |
| **Key Features** | Interest-free BNPL, 14-day grace period, 1.5% merchant fee |

## Core Data Structures

### Bill

Represents a purchase request from a merchant to a user.

```rust
#[derive(Clone)]
#[contracttype]
pub struct Bill {
    pub id: u64,
    pub merchant: Address,
    pub user: Address,
    pub amount: i128,
    pub order_id: String,
    pub status: BillStatus,
    pub created_at: u64,
    pub grace_period_end: u64,
}

#[derive(Clone, PartialEq)]
#[contracttype]
pub enum BillStatus {
    Created,
    Paid,
    Repaid,
    Expired,
    Liquidated,
}
```

### Bill States

- **Created**: Bill created by merchant, awaiting payment
- **Paid**: User paid with BNPL, merchant received funds
- **Repaid**: User repaid the BNPL loan
- **Liquidated**: Overdue loan was liquidated

### Merchant Data

Stores merchant information and status.

```rust
#[derive(Clone)]
#[contracttype]
pub struct MerchantData {
    pub merchant_info_id: String,
    pub status: MerchantStatus,
}

#[derive(Clone, PartialEq)]
#[contracttype]
pub enum MerchantStatus {
    None,
    Pending,
    Approved,
    Suspended,
}
```

### Borrowing Power

Represents a user's ability to borrow from the protocol.

```rust
#[derive(Clone)]
#[contracttype]
pub struct BorrowingPower {
    pub max_borrowing: i128,
    pub current_borrowed: i128,
    pub available_borrowing: i128,
    pub lp_balance: i128,
    pub required_collateral: i128,
    pub overall_health_factor: i128,
}
```

## Public Functions

### Bill Management

#### `create_bill`
Creates a new bill for a merchant.

```rust
pub fn create_bill(
    env: Env,
    merchant: Address,
    user: Address,
    amount: i128,
    order_id: String,
) -> u64
```

**Parameters:**
- `merchant`: Address of the merchant creating the bill
- `user`: Address of the user who will pay the bill
- `amount`: Bill amount in USDC (7 decimals)
- `order_id`: Unique identifier for the order

**Returns:** Bill ID

**Requirements:**
- Merchant must be approved
- Amount must be positive and within limits
- Order ID must be unique

**Events:** Emits `BillCreated` event

#### `get_bill`
Retrieves bill information.

```rust
pub fn get_bill(env: Env, bill_id: u64) -> Option<Bill>
```

#### `get_user_bills`
Gets all bills for a specific user.

```rust
pub fn get_user_bills(env: Env, user: Address) -> Vec<u64>
```

### Payment Functions

#### `pay_bill_bnpl`
Allows a user to pay a bill using BNPL (borrowing from the protocol).

```rust
pub fn pay_bill_bnpl(env: Env, bill_id: u64) -> u64
```

**Parameters:**
- `bill_id`: ID of the bill to pay

**Returns:** Loan ID

**Requirements:**
- Bill must exist and be in `Created` status
- User must have sufficient borrowing power (based on LP token holdings)
- User must have 111% collateral in LP tokens

**Process:**
1. Validate bill and check borrowing power
2. Lock required collateral (111% of bill amount)
3. Transfer 98.5% of bill amount to merchant
4. Collect 1.5% merchant fee for the protocol
5. Create BNPL record with 14-day grace period

**Events:** Emits `BillPaid` event

#### `repay_bill`
Allows a user to repay their loan.

```rust
pub fn repay_bill(env: Env, bill_id: u64) -> ()
```

**Parameters:**
- `bill_id`: ID of the bill to repay

**Requirements:**
- Bill must be in `Paid` status
- User must have approved sufficient USDC for repayment

**Process:**
1. Calculate repayment amount:
   - Within 14 days: Principal only (0% interest)
   - After 14 days: Principal + late fees (30% APR)
2. Transfer USDC from user to liquidity pool
3. Unlock user's LP token collateral
4. Update bill status to `Repaid`

**Events:** Emits `BillRepaid` event

### Merchant Functions

#### `enroll_merchant`
Enrolls a new merchant in the protocol.

```rust
pub fn enroll_merchant(
    env: Env,
    merchant: Address,
    merchant_info_id: String,
    status: MerchantStatus,
) -> ()
```

**Access:** Admin only

#### `get_merchant`
Retrieves merchant information.

```rust
pub fn get_merchant(env: Env, merchant: Address) -> Option<MerchantData>
```

#### `update_merchant_status`
Updates a merchant's status.

```rust
pub fn update_merchant_status(
    env: Env,
    merchant: Address,
    status: MerchantStatus,
) -> ()
```

**Access:** Admin only

### Liquidity Functions

#### `deposit`
Allows liquidity providers to deposit USDC.

```rust
pub fn deposit(env: Env, from: Address, amount: i128) -> ()
```

**Parameters:**
- `from`: Address depositing USDC
- `amount`: USDC amount to deposit

**Process:**
1. Transfer USDC from user to protocol
2. Mint LP tokens to user (handled by LP token contract)

#### `withdraw`
Allows liquidity providers to withdraw USDC.

```rust
pub fn withdraw(env: Env, from: Address, shares: i128) -> i128
```

**Parameters:**
- `from`: Address withdrawing
- `shares`: LP token shares to burn

**Returns:** USDC amount withdrawn

### User Information

#### `get_user_borrowing_power`
Calculates a user's borrowing capacity.

```rust
pub fn get_user_borrowing_power(env: Env, user: Address) -> BorrowingPower
```

**Calculation:**
- Max borrowing = (LP balance × 90%) - current debt
- Available borrowing = max borrowing - current borrowed
- Required collateral = loan amount × 111%
- Health factor = collateral value / debt value

#### `get_user_debt`
Gets a user's total debt information.

```rust
pub fn get_user_debt(env: Env, user: Address) -> DebtInfo
```

### Liquidation Functions

#### `liquidate_bill`
Liquidates an undercollateralized loan.

```rust
pub fn liquidate_bill(env: Env, bill_id: u64) -> ()
```

**Requirements:**
- Bill must be overdue (past 14-day grace period)
- Health factor < 1.2

**Process:**
1. Validate liquidation conditions
2. Liquidator repays the debt in USDC
3. Liquidator receives collateral + 10% bonus
4. Update bill status to `Liquidated`

### Administrative Functions

#### `update_admin`
Update the admin address.

```rust
pub fn update_admin(env: Env, new_admin: Address) -> ()
```

**Access:** Current admin only

#### `set_treasury`
Set the treasury address for fee collection.

```rust
pub fn set_treasury(env: Env, treasury: Address) -> ()
```

**Access:** Admin only

#### `set_insurance`
Set the insurance fund address.

```rust
pub fn set_insurance(env: Env, insurance: Address) -> ()
```

**Access:** Admin only

## BNPL Model

The protocol implements an interest-free BNPL model:

- **Grace Period:** 14 days with 0% interest
- **Late Fee:** 30% APR after grace period
- **Revenue Source:** 1.5% merchant fee on each transaction

### Fee Distribution
- **70%** to Liquidity Providers
- **20%** to Protocol Treasury
- **10%** to Insurance Fund

## Risk Management

### Collateralization

Users must hold LP tokens as collateral:

- **Collateral Requirement:** 111% of loan amount
- **LTV Ratio:** 90% (user can borrow up to 90% of LP token value)
- **Liquidation Penalty:** 10% bonus to liquidators

### Health Factor

```rust
Health Factor = Collateral Value / Debt Value
```

- **Healthy:** > 1.2
- **Liquidatable:** < 1.2 (after 14-day grace period)

### Key Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `COLLATERAL_RATIO` | 111% | Required collateral percentage |
| `GRACE_PERIOD_DAYS` | 14 | Days before late fees apply |
| `LATE_INTEREST_RATE` | 30% APR | Interest after grace period |
| `MERCHANT_FEE_RATE` | 1.5% | Fee charged to merchants |
| `LIQUIDATION_PENALTY` | 10% | Bonus for liquidators |

## Events

The contract emits the following events:

### `BillCreated`
```rust
BillCreated {
    bill_id: u64,
    merchant: Address,
    user: Address,
    amount: i128,
    order_id: String,
    created_at: u64,
}
```

### `BillPaid`
```rust
BillPaid {
    bill_id: u64,
    user: Address,
    loan_id: u64,
    amount: i128,
    interest_rate: u32,
}
```

### `BillRepaid`
```rust
BillRepaid {
    bill_id: u64,
    user: Address,
    amount_repaid: i128,
    interest_paid: i128,
}
```

### `BillLiquidated`
```rust
BillLiquidated {
    bill_id: u64,
    liquidator: Address,
    collateral_seized: i128,
    debt_repaid: i128,
}
```

### `LiquidityDeposited`
```rust
LiquidityDeposited {
    provider: Address,
    amount: i128,
    shares_minted: i128,
}
```

### `LiquidityWithdrawn`
```rust
LiquidityWithdrawn {
    provider: Address,
    amount: i128,
    shares_burned: i128,
}
```

## Error Codes

| Error | Description |
|-------|-------------|
| `NotFound` | Bill or merchant not found |
| `InvalidStatus` | Operation not allowed in current status |
| `Unauthorized` | Caller not authorized for this operation |
| `InsufficientFunds` | Insufficient balance or borrowing power |
| `InvalidAmount` | Amount is zero or negative |
| `AlreadyExists` | Duplicate entry (e.g., merchant already enrolled) |
| `NotLiquidatable` | Bill cannot be liquidated yet |

## Storage Keys

The contract uses the following storage keys:

- `Bills`: Map of bill ID to bill data
- `Loans`: Map of bill ID to loan data
- `Merchants`: Map of merchant address to merchant data
- `UserLoans`: Map of user address to list of bill IDs
- `ProtocolStats`: Global protocol statistics
- `Admins`: List of admin addresses
- `Config`: Protocol configuration parameters

## Integration Guide

### For Merchants
1. Get approved by admin (contact protocol team)
2. Create bills for customers using `create_bill`
3. Receive 98.5% of bill amount instantly when customer pays

### For Users
1. Hold LP tokens as collateral (111% of desired BNPL amount)
2. Pay bills with BNPL using `pay_bill_bnpl`
3. Repay within 14 days to avoid interest

### For Liquidity Providers
1. Deposit USDC using `deposit`
2. Receive LP tokens representing your share
3. Earn yield from merchant fees (1.5% of all transactions)
4. Withdraw anytime using `withdraw`