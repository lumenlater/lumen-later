use soroban_sdk::{contracttype, Address, String, Map};

// === CORE DATA STRUCTURES ===

// MerchantStatus enum moved below to avoid duplicate definition

#[derive(Clone)]
#[contracttype]
pub struct Config {
    pub admin: Address,  // Changed from single admin to multiple admins
    pub liquidity_pool: Address,
    pub usdc_token: Address,
    pub treasury: Address,         // New field - Optional for backward compatibility
    pub insurance_fund: Address,   // New field - Optional for backward compatibility
}

#[derive(Clone)]
#[contracttype]
pub struct MerchantData {
    pub merchant_info_id: String,  // MongoDB merchant info ID
    pub status: MerchantStatus,
}

#[derive(Clone, PartialEq, Debug)]
#[contracttype]
pub enum MerchantStatus {
    None,      // Not enrolled
    Pending,   // Enrolled but not approved
    Approved,  // Approved and active
    Rejected,  // Application rejected
    Suspended, // Temporarily suspended
    Cancelled, // Permanently cancelled
}

#[derive(Clone)]
#[contracttype]
pub struct Bill {
    pub id: u64,
    pub merchant: Address,
    pub user: Address,
    pub principal: i128,
    pub status: BillStatus,
    pub order_id: String,
    pub created_at: u64,
    pub paid_at: u64,
}

#[derive(Clone, PartialEq, Debug)]
#[contracttype]  
pub enum BillStatus {
    None, // Not created
    Created, // Created but not paid
    Expired, // Expired
    Paid, // Paid
    Repaid, // Repaid
    Overdue, // Overdue -- late fee applied
    Liquidated, // Liquidated -- liquidation fee applied
}


#[derive(Clone)]
#[contracttype]
pub struct BorrowingPower {
    pub lp_balance: i128,
    pub max_borrowing: i128,
    pub current_borrowed: i128,
    pub current_debt: i128,
    pub available_borrowing: i128,
    pub required_collateral: i128,
    pub overall_health_factor: i128,
}


#[derive(Clone, PartialEq, Debug)]
#[contracttype]
pub struct MerchantEnrolledEvent {
    pub merchant: Address,
    pub merchant_info_id: String,
    pub timestamp: u64,
}

// Event types
#[derive(Clone, PartialEq, Debug)]
#[contracttype]
pub struct MerchantStatusUpdatedEvent {
    pub merchant: Address,
    pub old_status: MerchantStatus,
    pub new_status: MerchantStatus,
    pub timestamp: u64,
}

#[derive(Clone, PartialEq, Debug)]
#[contracttype]
pub struct PaymentCompletedEvent {
    pub bill_id: u64,
    pub user: Address,
    pub merchant: Address,
    pub total_paid: i128,
}

#[derive(Clone, PartialEq, Debug)]
#[contracttype]
pub struct RepaymentEvent {
    pub bill_id: u64,
    pub user: Address,
    pub amount_paid: i128,
    pub timestamp: u64,
}
    

#[derive(Clone, PartialEq, Debug)]
#[contracttype]
pub struct BillCreatedEvent {
    pub bill_id: u64,
    pub merchant: Address,
    pub user: Address,
    pub amount: i128,
    pub order_id: String,
    pub created_at: u64,
}

#[derive(Clone, PartialEq, Debug)]
#[contracttype]
pub struct LiquidationEvent {
    pub bill_id: u64,
    pub liquidator: Address,
    pub total_liquidated: i128,
}
