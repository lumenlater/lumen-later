#![no_std]

mod storage;
mod types;
mod error;

#[cfg(test)]
mod test;


use soroban_sdk::{contract, contractimpl, Address, Env, String, Vec, Map, symbol_short};

pub use crate::types::*;
pub use crate::error::Error;
use crate::storage::DataKey;
use lp_token_interface::LPTokenClient;

// === FEE CONSTANTS ===
// All rates are scaled by 10^7 for precision
const SCALE_7: i128 = 10_000_000; 


const MERCHANT_FEE_RATE: i128 = 150_000; // 1.5% (scaled by 10^7)
const LATE_INTEREST_APR: i128 = 3_000_000; // 30% APR (scaled by 10^7)
const LIQUIDATION_PENALTY: i128 = 100_000; // 1% (scaled by 10^7)

// Fee distribution ratios (total must equal 100%)
const FEE_TO_LP_RATIO: i128 = 7_000_000;      // 70% to LPs
const FEE_TO_TREASURY_RATIO: i128 = 2_000_000; // 20% to Treasury
const FEE_TO_INSURANCE_RATIO: i128 = 1_000_000; // 10% to Insurance Fund

// LTV and liquidation constants
const MAX_LTV: i128 = 9_000_000; // 90% LTV (scaled by 10^7)
const COLLATERAL_RATIO: i128 = 11_100_000; // 111% collateral requirement (scaled by 10^7)

// Time constants
const BILL_DURATION_DAYS: u64 = 1; // 1 day for bill expiration
const GRACE_PERIOD_DAYS: u64 = 14; // 14 days grace period before late fee
const LIQUIDATION_THRESHOLD_DAYS: u64 = 28; // 28 days grace period before liquidation
const SECONDS_PER_DAY: u64 = 86400; // 60 * 60 * 24

#[contract]
pub struct UnifiedBNPLContract;

#[contractimpl]
impl UnifiedBNPLContract {
    // === INITIALIZATION ===
    pub fn initialize(
        env: Env,
        liquidity_pool: Address,
        usdc_token: Address,
        admin: Address,
        treasury: Address,
        insurance_fund: Address,
    ) {
        if storage::has_config(&env) {
            panic!("Already initialized");
        }

        let config = Config {
            admin: admin.clone(),
            liquidity_pool,
            usdc_token,
            treasury,
            insurance_fund,
        };

        storage::set_config(&env, &config);
        
        // Initialize counters
        storage::set_bill_counter(&env, 1);

        // Emit initialization event
        env.events().publish(
            (soroban_sdk::symbol_short!("init"), admin),
            config
        );
    }

    pub fn get_config(env: Env) -> Config {
        storage::get_config(&env)
    }
    
    // internal function to distribute fees to treasury, insurance fund, and LPs
    fn distribute_fees(env: Env, amount: i128) {
        let config = storage::get_config(&env);
        let usdc_client = soroban_sdk::token::Client::new(&env, &config.usdc_token);
        
        let treasury_amount = amount * FEE_TO_TREASURY_RATIO / SCALE_7;
        let insurance_amount = amount * FEE_TO_INSURANCE_RATIO / SCALE_7;
        let lp_amount = amount * FEE_TO_LP_RATIO / SCALE_7;
    
        // Transfer the fees to the treasury and insurance fund
        if treasury_amount > 0 {    
            usdc_client.transfer(&env.current_contract_address(), &config.treasury, &treasury_amount);
        }
        if insurance_amount > 0 {
            usdc_client.transfer(&env.current_contract_address(), &config.insurance_fund, &insurance_amount);
        }
        
        // Distribute LP yield by transferring to LP token contract and notifying it
        if lp_amount > 0 {
            // Transfer the yield to LP token contract
            usdc_client.transfer(&env.current_contract_address(), &config.liquidity_pool, &lp_amount);
            
            // Notify LP token contract to update its yield tracking
            let lp_client = LPTokenClient::new(&env, &config.liquidity_pool);
            lp_client.update_index();
        }
    }

    pub fn is_admin(env: Env, address: Address) -> bool {
        let config = storage::get_config(&env);
        config.admin == address
    }
    
    // === MERCHANT MANAGEMENT ===

    /// Enroll a new merchant with application ID
    pub fn enroll_merchant(
        env: Env,
        merchant: Address,
        merchant_info_id: String,
    ) -> Result<(), Error> {
        merchant.require_auth();
        
        // Check if merchant is already enrolled
        let key = DataKey::MerchantData(merchant.clone());
        
        if storage::get_merchant_data(&env, &merchant).is_some() {
            return Err(Error::MerchantAlreadyEnrolled);
        }
        
        let merchant_data = MerchantData {
            merchant_info_id: merchant_info_id.clone(),
            status: MerchantStatus::Pending,
        };
        
        // Store merchant data
        storage::set_merchant_data(&env, &merchant, &merchant_data);
        
        // Emit enrollment event
        env.events().publish(
            (symbol_short!("m_enroll"), merchant.clone()),
            MerchantEnrolledEvent {
                merchant: merchant.clone(),
                merchant_info_id: merchant_info_id.clone(),
                timestamp: env.ledger().timestamp(),
            }
        );
        
        Ok(())
    }
    
    /// Update merchant status (admin only)
    pub fn update_merchant_status(
        env: Env,
        admin: Address,
        merchant: Address,
        new_status: MerchantStatus,
    ) -> Result<(), Error> {
        admin.require_auth();
        
        // Check if admin is authorized
        if !Self::is_admin(env.clone(), admin.clone()) {
            return Err(Error::NotAdmin);
        }
        
        // Get merchant data
        let merchant_data = storage::get_merchant_data(&env, &merchant);
        if merchant_data.is_none() {
            return Err(Error::MerchantNotFound);
        }
        
        let old_status = merchant_data.clone().unwrap().status.clone();
        let mut new_merchant_data = merchant_data.clone().unwrap();
        new_merchant_data.status = new_status.clone();
        
        // Update storage
        storage::set_merchant_data(&env, &merchant, &new_merchant_data);
        
        // Emit status update event
        env.events().publish(
            (symbol_short!("m_status"), merchant.clone()),
            MerchantStatusUpdatedEvent {
                merchant: merchant.clone(),
                old_status, 
                new_status: new_status.clone(),
                timestamp: env.ledger().timestamp(),
            }
        );
        
        Ok(())
    }
    
    /// Get merchant data by address
    pub fn get_merchant(
        env: Env,
        merchant: Address,
    ) -> MerchantData {
        storage::get_merchant_data(&env, &merchant).unwrap()
    }

    // === BILL MANAGEMENT ===
    pub fn create_bill(
        env: Env,
        merchant: Address,
        user: Address,
        amount: i128,
        order_id: String,
    ) -> u64 {
        merchant.require_auth();
        
        // Check if merchant is approved using new system
        let merchant_data = storage::get_merchant_data(&env, &merchant);
        if merchant_data.is_none() || merchant_data.unwrap().status != MerchantStatus::Approved {
            panic!("Merchant not approved");
        }

        if amount <= 0 {
            panic!("Invalid amount");
        }

        let bill_id = storage::get_bill_counter(&env);
        
        let bill = Bill {
            id: bill_id,
            merchant: merchant.clone(),
            user: user.clone(),
            principal: amount,
            status: BillStatus::Created,
            order_id, // Offchain order ID
            created_at: env.ledger().timestamp(),
            paid_at: 0,
        };

        storage::set_bill(&env, bill_id, &bill);
        storage::set_bill_counter(&env, bill_id + 1);
    
        env.events().publish(
            (soroban_sdk::symbol_short!("bill_new"), merchant, bill_id),
            BillCreatedEvent {
                bill_id,
                merchant: bill.merchant,
                user: bill.user,
                amount: bill.principal,
                order_id: bill.order_id,
                created_at: bill.created_at,
            }
        );

        bill_id
    }

    pub fn get_bill(env: Env, bill_id: u64) -> Bill {
        storage::get_bill(&env, bill_id)
    }
    
    pub fn get_user_bills(env: Env, user: Address) -> Vec<u64> {
        storage::get_user_bills(&env, &user)
    }

    pub fn pay_bill_bnpl(
        env: Env,
        bill_id: u64
    ) {
        let mut bill = storage::get_bill(&env, bill_id);
        bill.user.require_auth();
        
        // Validate bill
        if bill.status != BillStatus::Created {
            panic!("Bill not payable");
        }
        if env.ledger().timestamp() > bill.created_at + BILL_DURATION_DAYS * SECONDS_PER_DAY {
            panic!("Bill expired");
        }

        let available_borrowing = Self::get_user_borrowing_power(env.clone(), bill.user.clone());
        
        if available_borrowing.available_borrowing < bill.principal {
            panic!("Insufficient collateral");
        }

        // Calculate merchant fee
        let merchant_fee = (bill.principal * MERCHANT_FEE_RATE) / SCALE_7;
        let merchant_receives = bill.principal - merchant_fee;
        
        // Transfer USDC to merchant (minus fee)
        let config = storage::get_config(&env);
        let liquidity_pool = config.liquidity_pool;
        let liquidity_pool_client = LPTokenClient::new(&env, &liquidity_pool);

        liquidity_pool_client.borrow(&env.current_contract_address(), &bill.principal);

        let usdc_client = soroban_sdk::token::Client::new(&env, &config.usdc_token);
        usdc_client.transfer(&env.current_contract_address(), &bill.merchant, &merchant_receives);

        Self::distribute_fees(env.clone(), merchant_fee);

        // Update bill status and track who paid
        bill.status = BillStatus::Paid;
        bill.paid_at = env.ledger().timestamp();
        
        storage::set_bill(&env, bill_id, &bill);
        
        // Add bill to user bills list after payment
        let mut user_bills = storage::get_user_bills(&env, &bill.user);
        user_bills.push_back(bill_id);
        storage::set_user_bills(&env, &bill.user, &user_bills);

        env.events().publish(
            (soroban_sdk::symbol_short!("payment"), bill.user.clone(), bill_id),
            PaymentCompletedEvent {
                bill_id,
                user: bill.user,
                merchant: bill.merchant,
                total_paid: bill.principal,
            }
        );

    }

    // === LOAN MANAGEMENT ===
    pub fn repay_bill(env: Env, bill_id: u64) {
        let mut bill = storage::get_bill(&env, bill_id);
        bill.user.require_auth();

        let current_time = env.ledger().timestamp();
        
        if bill.status != BillStatus::Paid {
            panic!("Bill not paid");
        }
        
        let config = storage::get_config(&env);
        let liquidity_pool_client = LPTokenClient::new(&env, &config.liquidity_pool);

        let late_fee = Self::calc_late_fee(&env, bill.created_at, bill.principal);

        // Transfer USDC from borrower
        let usdc_client = soroban_sdk::token::Client::new(&env, &config.usdc_token);
        usdc_client.transfer_from(&env.current_contract_address(), &bill.user, &env.current_contract_address(), &(&bill.principal + late_fee));

        usdc_client.approve(&env.current_contract_address(), &config.liquidity_pool, &(&bill.principal + late_fee), &200);
        liquidity_pool_client.repay(&env.current_contract_address(), &bill.principal);
        Self::distribute_fees(env.clone(), late_fee);

        bill.status = BillStatus::Repaid;

        // Update loan
        storage::set_bill(&env, bill_id, &bill);
        
        // Remove bill from user bills list after repayment
        let mut user_bills = storage::get_user_bills(&env, &bill.user);
        let mut new_user_bills = Vec::new(&env);
        for i in 0..user_bills.len() {
            let id = user_bills.get(i).unwrap();
            if id != bill_id {
                new_user_bills.push_back(id);
            }
        }
        storage::set_user_bills(&env, &bill.user, &new_user_bills);

        env.events().publish(
            (soroban_sdk::symbol_short!("repayment"), bill.user.clone(), bill_id),
            RepaymentEvent {
                bill_id,
                user: bill.user,
                amount_paid: bill.principal,
                timestamp: env.ledger().timestamp(),
            }
        );
    }

    // === LIQUIDATION ===
    pub fn liquidate_bill(
        env: Env,
        bill_id: u64,
        liquidator: Address,
    ) {
        liquidator.require_auth();
        
        // Check if liquidator holds LP tokens
        let config = storage::get_config(&env);
        let lp_token_client = LPTokenClient::new(&env, &config.liquidity_pool);
        let lp_balance = lp_token_client.balance(&liquidator);
        
        if lp_balance == 0 {
            panic!("Not LP token holder");
        }

        let mut bill = storage::get_bill(&env, bill_id);
        
        if env.ledger().timestamp() < bill.created_at + (LIQUIDATION_THRESHOLD_DAYS * SECONDS_PER_DAY) {
            panic!("Grace period not expired");
        }
        
        if !(bill.status == BillStatus::Paid || bill.status == BillStatus::Overdue) {
            panic!("Liquidation not possible");
        }

        bill.status = BillStatus::Liquidated;
        storage::set_bill(&env, bill_id, &bill);
        
        // Remove bill from user bills list after liquidation
        let mut user_bills = storage::get_user_bills(&env, &bill.user);
        let mut new_user_bills = Vec::new(&env);
        for i in 0..user_bills.len() {
            let id = user_bills.get(i).unwrap();
            if id != bill_id {
                new_user_bills.push_back(id);
            }
        }
        storage::set_user_bills(&env, &bill.user, &new_user_bills);

        let late_fee = Self::calc_late_fee(&env, bill.created_at, bill.principal);
        let liquidation_fee = bill.principal * LIQUIDATION_PENALTY / SCALE_7;

        let total_liquidated = bill.principal + late_fee + liquidation_fee;
        
        let config = storage::get_config(&env);
        let liquidity_pool_client = LPTokenClient::new(&env, &config.liquidity_pool);
        liquidity_pool_client.repay_with_burn(&bill.user, &bill.principal, &(late_fee+liquidation_fee));

        let usdc_client = soroban_sdk::token::Client::new(&env, &config.usdc_token);
        usdc_client.transfer(&env.current_contract_address(), &liquidator, &(liquidation_fee/2));
        Self::distribute_fees(env.clone(), liquidation_fee/2 + late_fee);
        
        env.events().publish(
            (soroban_sdk::symbol_short!("liquidate"), liquidator.clone(), bill_id),
            LiquidationEvent {
                bill_id,
                liquidator,
                total_liquidated,
            }
        );
    }

    fn calc_late_fee(env: &Env, paid_date: u64, amount_paid: i128) -> i128 {
        let current_time = env.ledger().timestamp();
        let grace_period_seconds = GRACE_PERIOD_DAYS * SECONDS_PER_DAY;
        
        // Only apply late fees after grace period
        if current_time <= paid_date + grace_period_seconds {
            return 0;
        }
        
        // Calculate days overdue (after grace period)
        let seconds_overdue = current_time - paid_date - grace_period_seconds;
        let days_overdue = seconds_overdue / SECONDS_PER_DAY;
        
        // Apply late fee calculation
        let late_fee = (amount_paid * LATE_INTEREST_APR * days_overdue as i128) / (365 * SCALE_7);
        
        late_fee
    }

    // === USER DASHBOARD ===
    pub fn get_user_total_debt(env: Env, user: Address) -> (i128, i128) {
        let user_bills = storage::get_user_bills(&env, &user);
        let mut total_interest = 0i128;
        let mut total_principal = 0i128;
        
        for i in 0..user_bills.len() {
            let bill_id = user_bills.get(i).unwrap();
            let bill = storage::get_bill(&env, bill_id);
            
            if bill.status == BillStatus::Paid {
                total_interest += Self::calc_late_fee(&env, bill.paid_at, bill.principal);
                total_principal += bill.principal;
            }
        }
        
        (total_interest, total_principal)
    }
    
    pub fn get_user_required_collateral(env: Env, user: Address) -> i128 {
        let (total_interest, total_principal) = Self::get_user_total_debt(env.clone(), user.clone());
        // let _config = storage::get_config(&env); // Unused variable
        
        // Calculate required collateral based on min_ltv (111%)
        (total_principal + total_interest) * COLLATERAL_RATIO / SCALE_7
    }
    

    pub fn get_user_borrowing_power(env: Env, user: Address) -> BorrowingPower {
        let config = storage::get_config(&env);
        let lp_client = LPTokenClient::new(&env, &config.liquidity_pool);
        let lp_balance = lp_client.balance(&user);
        
        let (total_interest, total_principal) = Self::get_user_total_debt(env.clone(), user.clone());
        
        let max_borrowing = (lp_balance * 90) / 100;
        let available_borrowing = if max_borrowing > (total_principal + total_interest) {
            max_borrowing - (total_principal + total_interest)
        } else {
            0
        };
        
        let overall_health_factor =  if (total_principal + total_interest) > 0 { max_borrowing / (total_principal + total_interest) } else { 1 };
        
        BorrowingPower {
            lp_balance,
            max_borrowing,
            current_borrowed: total_principal,
            current_debt: total_principal + total_interest,
            available_borrowing,
            required_collateral: (total_principal + total_interest) * COLLATERAL_RATIO / SCALE_7,
            overall_health_factor,
        }
    }
    

    // === PROTOCOL CONSTANTS (Frontend) ===
    pub fn get_protocol_constants(env: Env) -> Map<String, i128> {
        let mut constants = Map::new(&env);
        constants.set(String::from_str(&env, "MERCHANT_FEE_RATE"), MERCHANT_FEE_RATE);
        constants.set(String::from_str(&env, "LATE_INTEREST_APR"), LATE_INTEREST_APR);
        constants.set(String::from_str(&env, "MAX_LTV"), MAX_LTV);
        constants.set(String::from_str(&env, "COLLATERAL_RATIO"), COLLATERAL_RATIO);
        constants.set(String::from_str(&env, "GRACE_PERIOD_DAYS"), GRACE_PERIOD_DAYS as i128);
        constants.set(String::from_str(&env, "FEE_TO_LP_RATIO"), FEE_TO_LP_RATIO);
        constants.set(String::from_str(&env, "FEE_TO_TREASURY_RATIO"), FEE_TO_TREASURY_RATIO);
        constants.set(String::from_str(&env, "FEE_TO_INSURANCE_RATIO"), FEE_TO_INSURANCE_RATIO);
        constants
    }

}

pub use UnifiedBNPLContract as UnifiedBNPL;