#![no_std]
#![cfg(test)]

use soroban_sdk::{
    testutils::{Address as _, Ledger}, 
    token::TokenClient,
    Env, Address, String
};
use soroban_token_sdk::metadata::TokenMetadata;

// Import types from interface
use soroban_sdk::{contract, contracttype};

// We need to define the types that were previously imported from other crates
#[derive(Clone, PartialEq, Debug)]
#[contracttype]
pub enum MerchantStatus {
    None,
    Pending,
    Approved,
    Suspended,
    Rejected,
}

#[derive(Clone, PartialEq, Debug)]
#[contracttype]
pub enum BillStatus {
    Created,
    Paid,
    Repaid,
    Overdue,
    Liquidated,
}

#[derive(Clone)]
#[contracttype]
pub struct Config {
    pub liquidity_pool: Address,
    pub usdc_token: Address,
    pub treasury: Address,
    pub insurance_fund: Address,
    pub admin: Address,
}

#[derive(Clone)]
#[contracttype]
pub struct MerchantData {
    pub merchant_info_id: String,
    pub status: MerchantStatus,
}

#[derive(Clone)]
#[contracttype]
pub struct Bill {
    pub id: u64,
    pub merchant: Address,
    pub user: Address,
    pub order_id: String,
    pub principal: i128,
    pub status: BillStatus,
    pub created_at: u64,
    pub paid_at: u64,
}

// Mock contracts for testing
mod mock_contracts {
    use super::*;
    
    #[contract]
    pub struct MockBnplCore;
    
    #[contract]
    pub struct MockUsdcToken;
    
    #[contract]
    pub struct MockLpToken;
}

// Constants from bnpl_core
const SCALE_7: i128 = 10_000_000;
const MERCHANT_FEE_RATE: i128 = 150_000; // 1.5%
const FEE_TO_LP_RATIO: i128 = 7_000_000; // 70%
const LIQUIDATION_PENALTY: i128 = 100_000; // 1%
const _BILL_DURATION_DAYS: u64 = 1; // 1 day for bill expiration
const SECONDS_PER_DAY: u64 = 86400;
const _LIQUIDATION_THRESHOLD_DAYS: u64 = 28; // 28 days grace period before liquidation


// Generate client types for the contracts
use soroban_sdk::contractclient;

#[contractclient(name = "UnifiedBNPLContractClient")]
pub trait UnifiedBNPLContractTrait {
    fn initialize(env: Env, liquidity_pool: Address, usdc_token: Address, admin: Address, treasury: Address, insurance_fund: Address);
    fn get_config(env: Env) -> Config;
    fn enroll_merchant(env: Env, merchant: Address, merchant_info_id: String);
    fn update_merchant_status(env: Env, admin: Address, merchant: Address, new_status: MerchantStatus);
    fn get_merchant(env: Env, merchant: Address) -> MerchantData;
    fn create_bill(env: Env, merchant: Address, user: Address, amount: i128, order_id: String) -> u64;
    fn get_bill(env: Env, bill_id: u64) -> Bill;
    fn pay_bill_bnpl(env: Env, bill_id: u64);
    fn repay_bill(env: Env, bill_id: u64);
    fn liquidate_bill(env: Env, bill_id: u64, liquidator: Address);
}

#[contractclient(name = "UsdcTokenClient")]
pub trait UsdcTokenTrait {
    fn initialize(env: Env, admin: Address, name: String, symbol: String, decimals: u32, mint_limit: i128);
    fn mint(env: Env, to: Address, amount: i128);
    fn approve(env: Env, from: Address, spender: Address, amount: i128, expiration_ledger: u32);
    fn balance(env: Env, address: Address) -> i128;
}

#[contractclient(name = "LpTokenClient")]
pub trait LpTokenTrait {
    fn initialize(env: Env, admin: Address, underlying_asset: Address, metadata: TokenMetadata);
    fn set_bnpl_core(env: Env, bnpl_core: Address);
    fn deposit(env: Env, from: Address, amount: i128) -> i128;
    fn withdraw(env: Env, from: Address, lp_amount: i128) -> i128;
    fn balance(env: Env, address: Address) -> i128;
}

fn create_test_env() -> (Env, Address, Address, Address, Address, Address) {
    let env = Env::default();
    env.mock_all_auths();
    
    let admin = Address::generate(&env);
    let treasury = Address::generate(&env);
    let insurance_fund = Address::generate(&env);
    
    // Deploy USDC token
    let usdc_token_id = env.register(usdc_token::UsdcToken, ());
    
    // Initialize USDC token
    let usdc_client = UsdcTokenClient::new(&env, &usdc_token_id);
    usdc_client.initialize(
        &admin,
        &String::from_str(&env, "USD Coin"),
        &String::from_str(&env, "USDC"),
        &7,
        &1_000_000_000_000_000 // 1 billion USDC mint limit
    );
    
    // Deploy LP token
    let lp_token_id = env.register(lp_token::LpToken, ());

    let metadata = TokenMetadata {
        name: String::from_str(&env, "LP Token"),
        symbol: String::from_str(&env, "LP"),
        decimal: 9,
    };
    
    // Initialize LP token
    let lp_client = LpTokenClient::new(&env, &lp_token_id);
    lp_client.initialize(&admin, &usdc_token_id, &metadata);

    // Deploy BNPL Core
    let bnpl_core_id = env.register(bnpl_core::UnifiedBNPLContract, ());
    
    // Set BNPL core in LP token
    lp_client.set_bnpl_core(&bnpl_core_id);
    
    (env, bnpl_core_id, lp_token_id, usdc_token_id, treasury, insurance_fund)
}

#[test]
fn test_initialization() {
    let (env, bnpl_core, lp_token, usdc_token_id, treasury, insurance_fund) = create_test_env();
    let admin = Address::generate(&env);
    
    let client = UnifiedBNPLContractClient::new(&env, &bnpl_core);
    
    // Initialize
    client.initialize(&lp_token, &usdc_token_id, &admin, &treasury, &insurance_fund);
    
    // Verify initialization
    let config = client.get_config();
    assert_eq!(config.liquidity_pool, lp_token);
    assert_eq!(config.usdc_token, usdc_token_id);
    assert_eq!(config.treasury, treasury);
    assert_eq!(config.insurance_fund, insurance_fund);
    assert_eq!(config.admin, admin);
}

#[test]
#[should_panic(expected = "Already initialized")]
fn test_double_initialization() {
    let (env, bnpl_core, lp_token, usdc_token, treasury, insurance_fund) = create_test_env();
    let admin = Address::generate(&env);
    
    let client = UnifiedBNPLContractClient::new(&env, &bnpl_core);
    
    // First initialization
    client.initialize(&lp_token, &usdc_token, &admin, &treasury, &insurance_fund);
    
    // Second initialization should panic
    client.initialize(&lp_token, &usdc_token, &admin, &treasury, &insurance_fund);
}

#[test]
fn test_basic_bnpl_scenario() {
    let (env, bnpl_core, lp_token, usdc_token, treasury, insurance_fund) = create_test_env();
    let admin = Address::generate(&env);
    let merchant = Address::generate(&env);
    let user = Address::generate(&env);
    let lp_provider = Address::generate(&env);
    
    // Initialize all clients
    let bnpl_client = UnifiedBNPLContractClient::new(&env, &bnpl_core);
    let usdc_client = UsdcTokenClient::new(&env, &usdc_token);
    let lp_client = LpTokenClient::new(&env, &lp_token);
    let token_client = TokenClient::new(&env, &usdc_token);
    
    // Step 1: Initialize BNPL contract
    bnpl_client.initialize(&lp_token, &usdc_token, &admin, &treasury, &insurance_fund);
    
    // Step 2: Mint USDC to different parties
    usdc_client.mint(&admin, &50_000_000_000); // 50,000 USDC to admin
    usdc_client.mint(&lp_provider, &10_000_000_000); // 10,000 USDC to LP provider
    usdc_client.mint(&user, &5_000_000_000); // 5,000 USDC to user
    
    // Step 3: LP provider deposits USDC to get LP tokens
    usdc_client.approve(&lp_provider, &lp_token, &10_000_000_000, &200);
    lp_client.deposit(&lp_provider, &10_000_000_000);
    
    // User also deposits some USDC to get LP tokens (for collateral)
    usdc_client.approve(&user, &lp_token, &2_000_000_000, &200);
    lp_client.deposit(&user, &2_000_000_000);
    
    // Verify LP tokens were minted
    assert_eq!(lp_client.balance(&lp_provider), 10_000_000_000);
    assert_eq!(lp_client.balance(&user), 2_000_000_000);
    
    // Step 4: Enroll merchant
    let merchant_info_id = String::from_str(&env, "MERCHANT_001");
    bnpl_client.enroll_merchant(&merchant, &merchant_info_id);
    
    // Step 5: Admin approves merchant
    bnpl_client.update_merchant_status(&admin, &merchant, &MerchantStatus::Approved);
    
    // Verify merchant status
    let merchant_data = bnpl_client.get_merchant(&merchant);
    assert_eq!(merchant_data.status, MerchantStatus::Approved);
    
    // Step 6: Create a bill (user purchases from merchant)
    let purchase_amount = 1_000_000_000; // 1,000 USDC
    let order_id = String::from_str(&env, "ORDER_001");
    let bill_id = bnpl_client.create_bill(
        &merchant,
        &user,
        &purchase_amount,
        &order_id,
    );
    
    // Verify bill was created
    let bill = bnpl_client.get_bill(&bill_id);
    assert_eq!(bill.merchant, merchant);
    assert_eq!(bill.user, user);
    assert_eq!(bill.principal, purchase_amount);
    assert_eq!(bill.status, BillStatus::Created);
    
    // Step 7: Pay the bill (BNPL pays merchant)
    bnpl_client.pay_bill_bnpl(&bill_id);
    
    // Verify bill status changed to Paid
    let bill = bnpl_client.get_bill(&bill_id);
    assert_eq!(bill.status, BillStatus::Paid);
    
    // Verify merchant received payment (minus fees)
    let merchant_fee = (purchase_amount * MERCHANT_FEE_RATE) / SCALE_7;
    let merchant_payment = purchase_amount - merchant_fee;
    assert_eq!(token_client.balance(&merchant), merchant_payment);
    
    // Verify fee distribution
    let _lp_fee = (merchant_fee * FEE_TO_LP_RATIO) / SCALE_7;
    let treasury_fee = (merchant_fee * 2_000_000) / SCALE_7; // 20% to treasury
    let insurance_fee = (merchant_fee * 1_000_000) / SCALE_7; // 10% to insurance
    
    assert_eq!(token_client.balance(&treasury), treasury_fee);
    assert_eq!(token_client.balance(&insurance_fund), insurance_fee);
    
    // Step 8: User repays the bill
    usdc_client.approve(&user, &bnpl_core, &purchase_amount, &200);
    bnpl_client.repay_bill(&bill_id);
    
    // Verify bill is repaid
    let bill = bnpl_client.get_bill(&bill_id);
    assert_eq!(bill.status, BillStatus::Repaid);
    
    // Verify user's balance decreased (initial 5,000 - 2,000 deposited - 1,000 repaid)
    assert_eq!(token_client.balance(&user), 5_000_000_000 - 2_000_000_000 - purchase_amount);
    
    // Step 9: LP provider can withdraw their funds plus earned fees
    let lp_balance = lp_client.balance(&lp_provider);
    lp_client.withdraw(&lp_provider, &lp_balance);
    
    // Verify LP provider got their funds back
    // Note: The exact amount depends on the share value which may have changed
    let final_balance = token_client.balance(&lp_provider);
    assert!(final_balance >= 10_000_000_000); // At least the initial deposit
}

#[test]
fn test_liquidation_scenario() {
    let (env, bnpl_core, lp_token, usdc_token, treasury, insurance_fund) = create_test_env();
    let admin = Address::generate(&env);
    let merchant = Address::generate(&env);
    let user = Address::generate(&env);
    let liquidator = Address::generate(&env);
    let lp_provider = Address::generate(&env);
    
    // Initialize all clients
    let bnpl_client = UnifiedBNPLContractClient::new(&env, &bnpl_core);
    let usdc_client = UsdcTokenClient::new(&env, &usdc_token);
    let lp_client = LpTokenClient::new(&env, &lp_token);
    let token_client = TokenClient::new(&env, &usdc_token);
    
    // Step 1: Initialize BNPL contract
    bnpl_client.initialize(&lp_token, &usdc_token, &admin, &treasury, &insurance_fund);
    
    // Step 2: Setup initial balances
    usdc_client.mint(&admin, &50_000_000_000); // 50,000 USDC to admin
    usdc_client.mint(&lp_provider, &10_000_000_000); // 10,000 USDC to LP provider
    usdc_client.mint(&user, &5_000_000_000); // 5,000 USDC to user
    usdc_client.mint(&liquidator, &5_000_000_000); // 5,000 USDC to liquidator
    
    // Step 3: LP provider deposits USDC
    usdc_client.approve(&lp_provider, &lp_token, &10_000_000_000, &200);
    lp_client.deposit(&lp_provider, &10_000_000_000);
    
    // User deposits USDC for collateral
    usdc_client.approve(&user, &lp_token, &3_000_000_000, &200);
    lp_client.deposit(&user, &3_000_000_000);
    
    // Liquidator also needs LP tokens to perform liquidation
    usdc_client.approve(&liquidator, &lp_token, &2_000_000_000, &200);
    lp_client.deposit(&liquidator, &2_000_000_000);
    
    // Step 4: Setup merchant
    let merchant_info_id = String::from_str(&env, "MERCHANT_002");
    bnpl_client.enroll_merchant(&merchant, &merchant_info_id);
    bnpl_client.update_merchant_status(&admin, &merchant, &MerchantStatus::Approved);
    
    // Step 5: Create and pay a bill
    let purchase_amount = 2_000_000_000; // 2,000 USDC
    let order_id = String::from_str(&env, "ORDER_002");
    let bill_id = bnpl_client.create_bill(
        &merchant,
        &user,
        &purchase_amount,
        &order_id,
    );
    
    // Pay the bill (BNPL pays merchant)
    bnpl_client.pay_bill_bnpl(&bill_id);
    
    // Verify bill is paid
    let bill = bnpl_client.get_bill(&bill_id);
    assert_eq!(bill.status, BillStatus::Paid);
    
    // Step 6: Move time forward past the liquidation threshold (29 days)
    env.ledger().with_mut(|li| {
        li.timestamp = li.timestamp + (29 * SECONDS_PER_DAY); // 29 days later (past 28 day threshold)
    });
    
    // Step 7: Liquidate the bill
    let liquidator_initial_balance = token_client.balance(&liquidator);
    let user_lp_balance_before = lp_client.balance(&user);
    
    bnpl_client.liquidate_bill(&bill_id, &liquidator);
    
    // Verify bill is liquidated
    let bill = bnpl_client.get_bill(&bill_id);
    assert_eq!(bill.status, BillStatus::Liquidated);
    
    // Step 8: Verify liquidation results
    // User's LP tokens should be reduced (burned for repayment)
    let user_lp_balance_after = lp_client.balance(&user);
    assert!(user_lp_balance_after < user_lp_balance_before);
    
    // Liquidator should receive reward (half of liquidation penalty)
    let liquidation_fee = purchase_amount * LIQUIDATION_PENALTY / SCALE_7;
    let liquidator_reward = liquidation_fee / 2;
    let liquidator_final_balance = token_client.balance(&liquidator);
    
    // Liquidator gets the reward in USDC
    assert_eq!(liquidator_final_balance, liquidator_initial_balance + liquidator_reward);
    
    // Treasury and insurance fund should receive their share of fees
    assert!(token_client.balance(&treasury) > 0);
    assert!(token_client.balance(&insurance_fund) > 0);
}