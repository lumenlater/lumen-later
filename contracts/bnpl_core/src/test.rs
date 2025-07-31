#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::{Address as _, Ledger}, token::TokenClient, token::StellarAssetClient, Env, contractclient, vec};
use soroban_token_sdk::metadata::TokenMetadata;
use soroban_sdk::{contract, contractimpl, Address};
use lp_token_interface::LPTokenInterface;

// Generate client for BNPL Core
#[contractclient(name = "UnifiedBNPLContractClient")]
trait UnifiedBNPLContractTrait {
    fn initialize(env: Env, liquidity_pool: Address, usdc_token: Address, admin: Address, treasury: Address, insurance_fund: Address);
    fn get_config(env: Env) -> Config;
    fn add_admin(env: Env, current_admin: Address, new_admin: Address);
    fn remove_admin(env: Env, current_admin: Address, admin_to_remove: Address);
    fn enroll_merchant(env: Env, merchant: Address, merchant_info_id: String);
    fn update_merchant_status(env: Env, admin: Address, merchant: Address, new_status: MerchantStatus);
    fn get_merchant(env: Env, merchant: Address) -> MerchantData;
    fn create_bill(env: Env, merchant: Address, user: Address, amount: i128, order_id: String) -> u64;
    fn get_bill(env: Env, bill_id: u64) -> Bill;
    fn pay_bill_bnpl(env: Env, bill_id: u64);
    fn repay_bill(env: Env, bill_id: u64);
    fn liquidate_bill(env: Env, bill_id: u64, liquidator: Address);
    fn get_user_borrowing_power(env: Env, user: Address) -> BorrowingPower;
    fn get_user_total_debt(env: Env, user: Address) -> (i128, i128);
}

mod mock_lp_token {
    use super::*;
    #[contract]
    pub struct MockLPToken;
    
    #[contractimpl]
    impl LPTokenInterface for MockLPToken {
        fn initialize(_env: Env, _admin: Address, _underlying_asset: Address, _metadata: TokenMetadata) {}
        
        fn set_bnpl_core(_env: Env, _bnpl_core: Address) {}
        
        fn get_total_assets(_env: Env) -> i128 { 10_000_000 }
        fn get_accumulated_yield(_env: Env) -> i128 { 0 }
        fn get_share_value(_env: Env) -> i128 { 1_000_000 }
        fn balance(_env: Env, _user: Address) -> i128 { 1_000_000_000 }
        fn total_underlying(_env: Env) -> i128 { 10_000_000 }
        fn update_index(_env: Env) {}
        
        fn deposit(_env: Env, _from: Address, _amount: i128) -> i128 { _amount }
        fn withdraw(_env: Env, _from: Address, _lp_amount: i128) -> i128 { _lp_amount }
        
        fn borrow(_env: Env, _to: Address, _amount: i128) {
            // Mock implementation - just transfer tokens
            let usdc = _env.storage().instance().get::<_, Address>(&"usdc").unwrap();
            let usdc_client = TokenClient::new(&_env, &usdc);
            usdc_client.transfer(&_env.current_contract_address(), &_to, &_amount);
        }
        
        fn repay(_env: Env, _from: Address, _amount: i128) {
            // Mock implementation - just receive tokens
            let usdc = _env.storage().instance().get::<_, Address>(&"usdc").unwrap();
            let usdc_client = TokenClient::new(&_env, &usdc);
            usdc_client.transfer_from(&_env.current_contract_address(), &_from, &_env.current_contract_address(), &_amount);
        }
        
        fn repay_with_burn(_env: Env, _from: Address, _amount: i128, _fee: i128) {
            // Mock implementation - burn LP tokens and transfer fee
            let usdc = &_env.storage().instance().get::<_, Address>(&"usdc").unwrap();
            let usdc_client = TokenClient::new(&_env, &usdc);
            usdc_client.transfer(&_env.current_contract_address(), &_env.storage().instance().get::<_, Address>(&"bnpl_core").unwrap(), &_fee );
        }
    }
}

fn create_test_env() -> (Env, Address, Address, Address, Address, Address, Address) {
    let env = Env::default();
    env.mock_all_auths();
    
    let admin = Address::generate(&env);
    let treasury = Address::generate(&env);
    let insurance_fund = Address::generate(&env);

    let approved_merchant = Address::generate(&env);
    
    // Deploy USDC token
    let usdc = env.register_stellar_asset_contract_v2(admin.clone());
    let usdc_client = TokenClient::new(&env, &usdc.address());
    let usdc_client_mint = StellarAssetClient::new(&env, &usdc.address());
    let usdc_address = usdc.address();
    
    // Deploy mock LP token
    let lp_token = env.register(mock_lp_token::MockLPToken, ());


    let metadata = TokenMetadata {
        name: String::from_str(&env, "LP Token"),
        symbol: String::from_str(&env, "LP"),
        decimal: 9,
    };
    
    lp_token_interface::LPTokenClient::new(&env, &lp_token).initialize(&admin, &usdc_address, &metadata);

    // Deploy BNPL Core
    let bnpl_core = env.register(UnifiedBNPLContract, ());
    // Store USDC address for mock LP token to use
    env.as_contract(&lp_token, || {
        env.storage().instance().set(&"usdc", &usdc_address);
        env.storage().instance().set(&"bnpl_core", &bnpl_core);
    });
    
    (env, bnpl_core, lp_token, usdc_address, treasury, insurance_fund, approved_merchant)
}

#[test]
fn test_initialization() {
    let (env, bnpl_core, lp_token, usdc_token, treasury, insurance_fund, _approved_merchant) = create_test_env();
    let admin = Address::generate(&env);
    
    let client = UnifiedBNPLContractClient::new(&env, &bnpl_core);
    
    // Initialize
    client.initialize(&lp_token, &usdc_token, &admin, &treasury, &insurance_fund);
    
    // Verify initialization
    let config = client.get_config();
    assert_eq!(config.liquidity_pool, lp_token);
    assert_eq!(config.usdc_token, usdc_token);
    assert_eq!(config.treasury, treasury);
    assert_eq!(config.insurance_fund, insurance_fund);
    assert_eq!(config.admin, admin);
}

#[test]
#[should_panic(expected = "Already initialized")]
fn test_double_initialization() {
    let (env, bnpl_core, lp_token, usdc_token, treasury, insurance_fund, _approved_merchant) = create_test_env();
    let admin = Address::generate(&env);
    
    let client = UnifiedBNPLContractClient::new(&env, &bnpl_core);
    
    // First initialization
    client.initialize(&lp_token, &usdc_token, &admin, &treasury, &insurance_fund);
    
    // Second initialization should panic
    client.initialize(&lp_token, &usdc_token, &admin, &treasury, &insurance_fund);
}

#[test]
fn test_admin_management() {
    let (env, bnpl_core, lp_token, usdc_token, treasury, insurance_fund, _approved_merchant) = create_test_env();
    let admin1 = Address::generate(&env);
    let admin2 = Address::generate(&env);
    
    let client = UnifiedBNPLContractClient::new(&env, &bnpl_core);
    
    // Initialize with admin1
    client.initialize(&lp_token, &usdc_token, &admin1, &treasury, &insurance_fund);
    
}

#[test]
fn test_merchant_enrollment() {
    let (env, bnpl_core, lp_token, usdc_token, treasury, insurance_fund, _approved_merchant) = create_test_env();
    let admin = Address::generate(&env);
    let merchant = Address::generate(&env);
    
    let client = UnifiedBNPLContractClient::new(&env, &bnpl_core);
    
    // Initialize
    client.initialize(&lp_token, &usdc_token, &admin, &treasury, &insurance_fund);
    
    // Enroll merchant
    let merchant_info_id = String::from_str(&env, "MERCHANT_001");
    client.enroll_merchant(&merchant, &merchant_info_id);
    
    // Check merchant status
    let merchant_data = client.get_merchant(&merchant);
    assert_eq!(merchant_data.status, MerchantStatus::Pending);
}

#[test]
fn test_merchant_approval() {
    let (env, bnpl_core, lp_token, usdc_token, treasury, insurance_fund, _approved_merchant) = create_test_env();
    let admin = Address::generate(&env);
    let merchant = Address::generate(&env);
    
    let client = UnifiedBNPLContractClient::new(&env, &bnpl_core);
    
    // Initialize
    client.initialize(&lp_token, &usdc_token, &admin, &treasury, &insurance_fund);
    
    // Enroll merchant
    let merchant_info_id = String::from_str(&env, "MERCHANT_001");
    client.enroll_merchant(&merchant, &merchant_info_id);
    
    // Approve merchant
    client.update_merchant_status(&admin, &merchant, &MerchantStatus::Approved);
    
    // Check merchant status
    let merchant_data = client.get_merchant(&merchant);
    assert_eq!(merchant_data.status, MerchantStatus::Approved);
}

#[test]
fn test_create_bill() {
    let (env, bnpl_core, lp_token, usdc_token, treasury, insurance_fund, _approved_merchant) = create_test_env();
    let admin = Address::generate(&env);
    let merchant = Address::generate(&env);
    let user = Address::generate(&env);
    
    let client = UnifiedBNPLContractClient::new(&env, &bnpl_core);
    let usdc_client = StellarAssetClient::new(&env, &usdc_token);
    
    // Initialize
    client.initialize(&lp_token, &usdc_token, &admin, &treasury, &insurance_fund);
    
    // Setup merchant
    let merchant_info_id = String::from_str(&env, "MERCHANT_001");
    client.enroll_merchant(&merchant, &merchant_info_id);
    client.update_merchant_status(&admin, &merchant, &MerchantStatus::Approved);
    
    // Mint USDC to LP token contract (for lending)
    usdc_client.mint(&admin, &10_000_000);
    TokenClient::new(&env, &usdc_token).transfer(&admin, &lp_token, &10_000_000);
    
    // Create bill
    let amount = 1_000_000; // 1 USDC
    let order_id = String::from_str(&env, "ORDER_001");
    let bill_id = client.create_bill(
        &merchant,
        &user,
        &amount,
        &order_id,
    );
    
    // Verify bill
    let bill = client.get_bill(&bill_id);
    assert_eq!(bill.merchant, merchant);
    assert_eq!(bill.user, user);
    assert_eq!(bill.principal, amount);
    assert_eq!(bill.status, BillStatus::Created);
}


#[test]
fn test_pay_bill() {
    let (env, bnpl_core, lp_token, usdc_token, treasury, insurance_fund, _approved_merchant) = create_test_env();
    let admin = Address::generate(&env);
    let merchant = Address::generate(&env);
    let user = Address::generate(&env);
    
    let client = UnifiedBNPLContractClient::new(&env, &bnpl_core);
    let usdc_client = StellarAssetClient::new(&env, &usdc_token);
    let usdc_token_client = TokenClient::new(&env, &usdc_token);
    
    // Initialize
    client.initialize(&lp_token, &usdc_token, &admin, &treasury, &insurance_fund);
    
    // Setup merchant
    let merchant_info_id = String::from_str(&env, "MERCHANT_001");
    client.enroll_merchant(&merchant, &merchant_info_id);
    client.update_merchant_status(&admin, &merchant, &MerchantStatus::Approved);
    
    // Mint USDC to LP token contract (for lending)
    usdc_client.mint(&admin, &10_000_000);
    usdc_client.mint(&user, &10_000_000);
    usdc_token_client.transfer(&admin, &lp_token, &10_000_000);
    
    // Create bill
    let amount = 1_000_000; // 1 USDC
    let order_id = String::from_str(&env, "ORDER_001");
    let bill_id = client.create_bill(
        &merchant,
        &user,
        &amount,
        &order_id,
    );
    
    // Verify bill
    let bill = client.get_bill(&bill_id);
    
    // Pay bill
    client.pay_bill_bnpl(&bill_id);
    
    // Verify bill status
    let bill = client.get_bill(&bill_id);
    assert_eq!(bill.status, BillStatus::Paid);
    
    // Verify lp balance decreased
    let liquidity_pool_balance = usdc_token_client.balance(&lp_token);
    assert_eq!(liquidity_pool_balance, 10_000_000 - amount + amount * MERCHANT_FEE_RATE * FEE_TO_LP_RATIO / SCALE_7 / SCALE_7);

    // Verify merchant balance increased
    let merchant_balance = usdc_token_client.balance(&merchant);
    assert_eq!(merchant_balance, amount * (SCALE_7-MERCHANT_FEE_RATE) / SCALE_7);
}

#[test]
fn test_repay_bill() {
    let (env, bnpl_core, lp_token, usdc_token, treasury, insurance_fund, _approved_merchant) = create_test_env();
    let admin = Address::generate(&env);
    let merchant = Address::generate(&env);
    let user = Address::generate(&env);
    
    let client = UnifiedBNPLContractClient::new(&env, &bnpl_core);
    let usdc_client = StellarAssetClient::new(&env, &usdc_token);
    let usdc_token_client = TokenClient::new(&env, &usdc_token);
    
    // Initialize
    client.initialize(&lp_token, &usdc_token, &admin, &treasury, &insurance_fund);
    
    // Setup merchant
    let merchant_info_id = String::from_str(&env, "MERCHANT_001");
    client.enroll_merchant(&merchant, &merchant_info_id);
    client.update_merchant_status(&admin, &merchant, &MerchantStatus::Approved);
    
    // Mint USDC to LP token and user
    usdc_client.mint(&admin, &10_000_000);
    usdc_token_client.transfer(&admin, &lp_token, &5_000_000);
    usdc_client.mint(&user, &2_000_000);
    
    // Create bill
    let amount = 1_000_000;
    let order_id = String::from_str(&env, "ORDER_001");
    let bill_id = client.create_bill(
        &merchant,
        &user,
        &amount,
        &order_id,
    );
    
    // Pay bill
    client.pay_bill_bnpl(&bill_id);

    usdc_token_client.approve(&user, &bnpl_core, &amount, &0);

    // Repay bill
    client.repay_bill(&bill_id);
    
    
    // Verify bill status
    let bill = client.get_bill(&bill_id);
    assert_eq!(bill.status, BillStatus::Repaid);
    
    // Verify user balance decreased
    let user_balance = usdc_token_client.balance(&user);
    assert_eq!(user_balance, 2_000_000 - amount);
}

#[test]
fn test_liquidation() {
    let (env, bnpl_core, lp_token, usdc_token, treasury, insurance_fund, _approved_merchant) = create_test_env();
    let admin = Address::generate(&env);
    let merchant = Address::generate(&env);
    let user = Address::generate(&env);
    let liquidator = Address::generate(&env);
    
    let client = UnifiedBNPLContractClient::new(&env, &bnpl_core);
    let usdc_client = StellarAssetClient::new(&env, &usdc_token);
    let usdc_token_client = TokenClient::new(&env, &usdc_token);    
    // Initialize
    client.initialize(&lp_token, &usdc_token, &admin, &treasury, &insurance_fund);

    // Setup
    let merchant_info_id = String::from_str(&env, "MERCHANT_001");
    client.enroll_merchant(&merchant, &merchant_info_id);
    client.update_merchant_status(&admin, &merchant, &MerchantStatus::Approved);
    
    // Mint tokens
    usdc_client.mint(&admin, &10_000_000);
    TokenClient::new(&env, &usdc_token).transfer(&admin, &lp_token, &5_000_000);
    
    // Create bill
    let amount = 1_000_000;
    let order_id = String::from_str(&env, "ORDER_001");
    let bill_id = client.create_bill(
        &merchant,
        &user,
        &amount,
        &order_id,
    );
    
    // Pay bill
    client.pay_bill_bnpl(&bill_id);
    
    // Move time forward past liquidation threshold (28 days)
    env.ledger().with_mut(|li| {
        li.timestamp = li.timestamp + (29 * 86400); // 29 days
    });
    
    // Liquidate
    client.liquidate_bill(&bill_id, &liquidator);
    
    // Verify bill status
    let bill = client.get_bill(&bill_id);
    assert_eq!(bill.status, BillStatus::Liquidated);
}

#[test]
fn test_get_user_borrowing_power() {
    let (env, bnpl_core, lp_token, usdc_token, treasury, insurance_fund, _approved_merchant) = create_test_env();
    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    
    let client = UnifiedBNPLContractClient::new(&env, &bnpl_core);
    
    // Initialize
    client.initialize(&lp_token, &usdc_token, &admin, &treasury, &insurance_fund);
    
    // Get borrowing power (mock LP token returns 1B balance)
    let borrowing_power = client.get_user_borrowing_power(&user);
    
    assert_eq!(borrowing_power.lp_balance, 1_000_000_000);
    assert_eq!(borrowing_power.max_borrowing, 900_000_000); // 90% of LP balance
    assert_eq!(borrowing_power.current_borrowed, 0);
    assert_eq!(borrowing_power.current_debt, 0);
    assert_eq!(borrowing_power.available_borrowing, 900_000_000);
}

#[test]
fn test_fee_distribution() {
    let (env, bnpl_core, lp_token, usdc_token, treasury, insurance_fund, _approved_merchant) = create_test_env();
    let admin = Address::generate(&env);
    let merchant = Address::generate(&env);
    let user = Address::generate(&env);
    
    let client = UnifiedBNPLContractClient::new(&env, &bnpl_core);
    let usdc_client = StellarAssetClient::new(&env, &usdc_token);
    let token_client = TokenClient::new(&env, &usdc_token);
    
    // Initialize
    client.initialize(&lp_token, &usdc_token, &admin, &treasury, &insurance_fund);
    
    // Setup
    let merchant_info_id = String::from_str(&env, "MERCHANT_001");
    client.enroll_merchant(&merchant, &merchant_info_id);
    client.update_merchant_status(&admin, &merchant, &MerchantStatus::Approved);
    
    // Mint USDC
    usdc_client.mint(&admin, &10_000_000);
    token_client.transfer(&admin, &lp_token, &5_000_000);
    
    // Create bill
    let amount = 1_000_000;
    let order_id = String::from_str(&env, "ORDER_001");
    let bill_id = client.create_bill(
        &merchant,
        &user,
        &amount,
        &order_id,
    );

    client.pay_bill_bnpl(&bill_id);
    
    // Check fee distribution
    let merchant_fee = (amount * 150_000) / 10_000_000; // 1.5%
    let lp_fee = (merchant_fee * 7_000_000) / 10_000_000; // 70% to LP
    let treasury_fee = (merchant_fee * 2_000_000) / 10_000_000; // 20% to treasury
    let insurance_fee = (merchant_fee * 1_000_000) / 10_000_000; // 10% to insurance
    
    assert_eq!(token_client.balance(&treasury), treasury_fee);
    assert_eq!(token_client.balance(&insurance_fund), insurance_fee);
    // LP fee stays in LP contract
    assert_eq!(token_client.balance(&lp_token), 5_000_000 - amount + lp_fee);
}

#[test]
fn test_get_user_total_debt() {
    let (env, bnpl_core, lp_token, usdc_token, treasury, insurance_fund, _approved_merchant) = create_test_env();
    let admin = Address::generate(&env);
    let merchant = Address::generate(&env);
    let user = Address::generate(&env);
    
    let client = UnifiedBNPLContractClient::new(&env, &bnpl_core);
    let usdc_client = StellarAssetClient::new(&env, &usdc_token);
    let token_client = TokenClient::new(&env, &usdc_token);
    
    // Initialize
    client.initialize(&lp_token, &usdc_token, &admin, &treasury, &insurance_fund);
    
    // Setup merchant
    let merchant_info_id = String::from_str(&env, "MERCHANT_001");
    client.enroll_merchant(&merchant, &merchant_info_id);
    client.update_merchant_status(&admin, &merchant, &MerchantStatus::Approved);
    
    // Mint USDC to LP token and user
    usdc_client.mint(&admin, &100_000_000);
    token_client.transfer(&admin, &lp_token, &50_000_000);
    usdc_client.mint(&user, &20_000_000);
    
    // Create multiple bills
    let bill_amounts = vec![&env, 1_000_000, 2_000_000, 1_500_000, 3_000_000]; // 7.5M total
    let mut bill_ids = Vec::new(&env);
    
    for (i, amount) in bill_amounts.iter().enumerate() {
        let order_id = match i {
            0 => String::from_str(&env, "ORDER_001"),
            1 => String::from_str(&env, "ORDER_002"),
            2 => String::from_str(&env, "ORDER_003"),
            3 => String::from_str(&env, "ORDER_004"),
            _ => String::from_str(&env, "ORDER_XXX"),
        };
        let bill_id = client.create_bill(
            &merchant,
            &user,
            &amount,
            &order_id,
        );
        bill_ids.push_back(bill_id);
    }
    
    // Pay all bills first
    for bill_id in bill_ids.iter() {
        client.pay_bill_bnpl(&bill_id);
    }
    
    // Check initial debt (just principal, no late fees)
    let (total_interest, total_principal) = client.get_user_total_debt(&user);
    assert_eq!(total_principal, 7_500_000); // Sum of all bills
    assert_eq!(total_interest, 0); // No late fees yet
    
    // Repay first two bills
    token_client.approve(&user, &bnpl_core, &3_000_000, &0);
    client.repay_bill(&bill_ids.get(0).unwrap());
    client.repay_bill(&bill_ids.get(1).unwrap());
    
    // Check debt after partial repayment
    let (total_interest, total_principal) = client.get_user_total_debt(&user);
    assert_eq!(total_principal, 4_500_000); // Only bills 3 and 4 remain
    assert_eq!(total_interest, 0); // Still no late fees
    
    // Move time forward to create late fees (15 days - past grace period)
    env.ledger().with_mut(|li| {
        li.timestamp = li.timestamp + (15 * 86400);
    });
    
    // Check debt with late fees
    let (total_interest, total_principal) = client.get_user_total_debt(&user);
    assert_eq!(total_principal, 4_500_000); // Principal unchanged
    
    // Calculate expected late fee: 1 day overdue * 30% APR / 365
    let expected_late_fee_per_day = 4_500_000 * LATE_INTEREST_APR / SCALE_7 / 365;
    let expected_total_late_fee = expected_late_fee_per_day * 1; // 1 day past grace period
    // Allow for small rounding differences
    assert!((total_interest - expected_total_late_fee).abs() <= 1);
    
    // Move further forward (total 20 days)
    env.ledger().with_mut(|li| {
        li.timestamp = li.timestamp + (5 * 86400);
    });
    
    // Check increased late fees
    let (total_interest, total_principal) = client.get_user_total_debt(&user);
    assert_eq!(total_principal, 4_500_000); // Principal still unchanged
    
    // Now 6 days past grace period
    let expected_total_late_fee = expected_late_fee_per_day * 6;
    assert!((total_interest - expected_total_late_fee).abs() <= 6);
    
    // Repay one more bill with late fee
    let late_fee_for_one_bill = 1_500_000 * LATE_INTEREST_APR * 6 / SCALE_7 / 365;
    token_client.approve(&user, &bnpl_core, &(1_500_000 + late_fee_for_one_bill + 1), &0);
    client.repay_bill(&bill_ids.get(2).unwrap());
    
    // Final check - only one bill remains
    let (total_interest, total_principal) = client.get_user_total_debt(&user);
    assert_eq!(total_principal, 3_000_000); // Only bill 4 remains
    
    // Late fee only for the remaining bill
    let expected_late_fee = 3_000_000 * LATE_INTEREST_APR * 6 / SCALE_7 / 365;
    assert!((total_interest - expected_late_fee).abs() <= 3);
}