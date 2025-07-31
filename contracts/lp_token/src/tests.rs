use crate::*;
use soroban_sdk::{testutils::Address as _, String, Env, contract, contractimpl, contractclient};
use soroban_sdk::token::{StellarAssetClient, TokenClient};
use soroban_token_sdk::metadata::TokenMetadata;

// Simple mock BNPL Core for testing
#[contract]
pub struct MockBnplCore;

#[contractimpl]
impl MockBnplCore {
    pub fn get_user_required_collateral(_env: Env, user: Address) -> i128 {
        // Return test values based on user address
        // This is for demonstration - in real implementation this would calculate based on user's debt
        if user.to_string() == String::from_str(&_env, "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFCT4") {
            500 // This user has 500 locked
        } else {
            0 // Other users have no locked balance
        }
    }
    
    pub fn get_user_total_debt(_env: Env, _user: Address) -> i128 {
        0 // Simple mock
    }
}

// Generate LP Token client
#[contractclient(name = "LpTokenTestClient")]
trait _LpTokenTestTrait {
    fn initialize(env: Env, admin: Address, underlying_asset: Address, metadata: TokenMetadata);
    fn mint(env: Env, to: Address, amount: i128);
    fn balance(env: Env, user: Address) -> i128;
    fn transfer(env: Env, from: Address, to: Address, amount: i128);
    fn deposit(env: Env, from: Address, amount: i128) -> i128;
    fn withdraw(env: Env, from: Address, lp_amount: i128) -> i128;
    fn get_locked_balance(env: Env, user: Address) -> i128;
    fn available_balance(env: Env, user: Address) -> i128;
    fn get_balance_info(env: Env, user: Address) -> (i128, i128, i128);
    fn set_bnpl_core(env: Env, bnpl_core: Address);
    fn get_bnpl_core(env: Env) -> Option<Address>;
    fn update_index(env: Env);
    fn exchange_rate(env: Env) -> u128;
    fn borrow(env: Env, to: Address, amount: i128);
    fn repay(env: Env, from: Address, amount: i128);
    fn total_borrowed(env: Env) -> u128;
    fn utilization_ratio(env: Env) -> u32;
    fn total_supply(env: Env) -> i128;
    fn metadata(env: Env) -> TokenMetadata;
    fn underlying_asset(env: Env) -> Address;
    fn total_underlying(env: Env) -> i128;
    fn repay_with_burn(env: Env, from: Address, amount: i128, fee: i128);
}

#[test]
fn test_lp_token_initialization() {
    let env = Env::default();
    env.mock_all_auths();
    
    let admin = Address::generate(&env);
    let underlying_asset = env.register_stellar_asset_contract_v2(admin.clone()).address();
    
    let lp_contract_id = env.register(LpToken, ());
    let lp_client = LpTokenTestClient::new(&env, &lp_contract_id);
    
    let metadata = TokenMetadata {
        name: String::from_str(&env, "LP Token"),
        symbol: String::from_str(&env, "LP"),
        decimal: 9,
    };
    
    lp_client.initialize(&admin, &underlying_asset, &metadata);
    
    // Verify initialization
    assert_eq!(lp_client.exchange_rate(), DECIMALS);
}

#[test]
fn test_deposit_and_withdraw() {
    let env = Env::default();
    env.mock_all_auths();
    
    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    
    // Deploy underlying asset
    let underlying = env.register_stellar_asset_contract_v2(admin.clone());
    let underlying_client = StellarAssetClient::new(&env, &underlying.address());
    
    // Deploy LP token
    let lp_contract_id = env.register(LpToken, ());
    let lp_client = LpTokenTestClient::new(&env, &lp_contract_id);
    
    let metadata = TokenMetadata {
        name: String::from_str(&env, "LP Token"),
        symbol: String::from_str(&env, "LP"),
        decimal: 9,
    };
    
    lp_client.initialize(&admin, &underlying.address(), &metadata);
    
    // Mint underlying tokens to user
    underlying_client.mint(&user, &1_000_000);
    
    // Test deposit
    let deposited = lp_client.deposit(&user, &100_000);
    assert_eq!(deposited, 100_000);
    assert_eq!(lp_client.balance(&user), 100_000);
    
    // Test withdraw
    let withdrawn = lp_client.withdraw(&user, &50_000);
    assert_eq!(withdrawn, 50_000);
    assert_eq!(lp_client.balance(&user), 50_000);
}

#[test]
fn test_rebasing_mechanism() {
    let env = Env::default();
    env.mock_all_auths();
    
    let admin = Address::generate(&env);
    let user1 = Address::generate(&env);
    let user2 = Address::generate(&env);
    
    // Deploy underlying asset
    let underlying = env.register_stellar_asset_contract_v2(admin.clone());
    let underlying_client = StellarAssetClient::new(&env, &underlying.address());
    
    // Deploy LP token
    let lp_contract_id = env.register(LpToken, ());
    let lp_client = LpTokenTestClient::new(&env, &lp_contract_id);
    
    let metadata = TokenMetadata {
        name: String::from_str(&env, "LP Token"),
        symbol: String::from_str(&env, "LP"),
        decimal: 9,
    };
    
    lp_client.initialize(&admin, &underlying.address(), &metadata);
    
    // Mint underlying tokens to users
    underlying_client.mint(&user1, &1_000_000);
    underlying_client.mint(&user2, &1_000_000);
    underlying_client.mint(&admin, &1_000_000);
    
    // Users deposit
    lp_client.deposit(&user1, &100_000);
    lp_client.deposit(&user2, &100_000);
    
    // Initial balances
    assert_eq!(lp_client.balance(&user1), 100_000);
    assert_eq!(lp_client.balance(&user2), 100_000);
    
    // Send yield to LP contract  
    underlying_client.mint(&admin, &20_000);
    TokenClient::new(&env, &underlying.address()).transfer(&admin, &lp_contract_id, &20_000);
    
    // Update index to distribute yield
    lp_client.update_index();
    
    // Check balances increased proportionally
    assert_eq!(lp_client.balance(&user1), 110_000); // 100k + 10%
    assert_eq!(lp_client.balance(&user2), 110_000); // 100k + 10%
}

#[test]
fn test_simple_transfer() {
    let env = Env::default();
    env.mock_all_auths();
    
    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let recipient = Address::generate(&env);
    
    // Deploy contracts
    let underlying = env.register_stellar_asset_contract_v2(admin.clone());
    let lp_contract_id = env.register(LpToken, ());
    let lp_client = LpTokenTestClient::new(&env, &lp_contract_id);
    
    let metadata = TokenMetadata {
        name: String::from_str(&env, "LP Token"),
        symbol: String::from_str(&env, "LP"),
        decimal: 9,
    };
    
    lp_client.initialize(&admin, &underlying.address(), &metadata);
    
    // Mint LP tokens to user
    lp_client.mint(&user, &1000);
    assert_eq!(lp_client.balance(&user), 1000);
    
    // Transfer
    lp_client.transfer(&user, &recipient, &400);
    assert_eq!(lp_client.balance(&user), 600);
    assert_eq!(lp_client.balance(&recipient), 400);
}

#[test]
fn test_locked_balance_prevents_withdraw() {
    let env = Env::default();
    env.mock_all_auths();
    
    let admin = Address::generate(&env);
    let user = Address::from_string(&String::from_str(&env, "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFCT4"));
    
    // Deploy contracts
    let bnpl_core_id = env.register(MockBnplCore, ());
    let underlying = env.register_stellar_asset_contract_v2(admin.clone());
    let lp_contract_id = env.register(LpToken, ());
    let lp_client = LpTokenTestClient::new(&env, &lp_contract_id);
    
    let metadata = TokenMetadata {
        name: String::from_str(&env, "LP Token"),
        symbol: String::from_str(&env, "LP"),
        decimal: 9,
    };
    
    lp_client.initialize(&admin, &underlying.address(), &metadata);
    lp_client.set_bnpl_core(&bnpl_core_id);
    
    // First, deposit underlying assets to get LP tokens
    let underlying_client = StellarAssetClient::new(&env, &underlying.address());
    underlying_client.mint(&user, &10_000);
    lp_client.deposit(&user, &1000);
    
    // Check locked balance
    assert_eq!(lp_client.get_locked_balance(&user), 500);
    assert_eq!(lp_client.available_balance(&user), 500);
    
    // Can withdraw up to available balance
    lp_client.withdraw(&user, &300);
    assert_eq!(lp_client.balance(&user), 700);
}

#[test]
#[should_panic(expected = "insufficient available balance")]
fn test_withdraw_exceeding_available_panics() {
    let env = Env::default();
    env.mock_all_auths();
    
    let admin = Address::generate(&env);
    let user = Address::from_string(&String::from_str(&env, "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFCT4"));
    
    // Deploy contracts
    let bnpl_core_id = env.register(MockBnplCore, ());
    let underlying = env.register_stellar_asset_contract_v2(admin.clone());
    let lp_contract_id = env.register(LpToken, ());
    let lp_client = LpTokenTestClient::new(&env, &lp_contract_id);
    
    let metadata = TokenMetadata {
        name: String::from_str(&env, "LP Token"),
        symbol: String::from_str(&env, "LP"),
        decimal: 9,
    };
    
    lp_client.initialize(&admin, &underlying.address(), &metadata);
    lp_client.set_bnpl_core(&bnpl_core_id);
    
    // First, deposit underlying assets to get LP tokens
    let underlying_client = StellarAssetClient::new(&env, &underlying.address());
    underlying_client.mint(&user, &10_000);
    lp_client.deposit(&user, &1000);
    
    // Try to withdraw more than available (should panic)
    lp_client.withdraw(&user, &600); // Has 1000 but 500 locked
}

#[test]
fn test_locked_balance_prevents_transfer() {
    let env = Env::default();
    env.mock_all_auths();
    
    let admin = Address::generate(&env);
    let user = Address::from_string(&String::from_str(&env, "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFCT4"));
    // Generate multiple addresses to ensure we get a different one
    let mut recipient = Address::generate(&env);
    // Keep generating until we get a different address
    while recipient == user {
        recipient = Address::generate(&env);
    }
    
    // Deploy contracts
    let bnpl_core_id = env.register(MockBnplCore, ());
    let underlying = env.register_stellar_asset_contract_v2(admin.clone());
    let lp_contract_id = env.register(LpToken, ());
    let lp_client = LpTokenTestClient::new(&env, &lp_contract_id);
    
    let metadata = TokenMetadata {
        name: String::from_str(&env, "LP Token"),
        symbol: String::from_str(&env, "LP"),
        decimal: 9,
    };
    
    lp_client.initialize(&admin, &underlying.address(), &metadata);
    lp_client.set_bnpl_core(&bnpl_core_id);
    
    // Mint LP tokens to user
    lp_client.mint(&user, &1000);
    
    // Check initial balance
    assert_eq!(lp_client.balance(&user), 1000);
    assert_eq!(lp_client.get_locked_balance(&user), 500);
    assert_eq!(lp_client.available_balance(&user), 500);
    
    // Can transfer up to available balance
    lp_client.transfer(&user, &recipient, &400);
    
    // Check balances after transfer
    assert_eq!(lp_client.balance(&user), 600);
    assert_eq!(lp_client.balance(&recipient), 400);
}

#[test]
#[should_panic(expected = "insufficient available balance")]
fn test_transfer_exceeding_available_panics() {
    let env = Env::default();
    env.mock_all_auths();
    
    let admin = Address::generate(&env);
    let user = Address::from_string(&String::from_str(&env, "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFCT4"));
    // Generate multiple addresses to ensure we get a different one
    let mut recipient = Address::generate(&env);
    // Keep generating until we get a different address
    while recipient == user {
        recipient = Address::generate(&env);
    }
    
    // Deploy contracts
    let bnpl_core_id = env.register(MockBnplCore, ());
    let underlying = env.register_stellar_asset_contract_v2(admin.clone());
    let lp_contract_id = env.register(LpToken, ());
    let lp_client = LpTokenTestClient::new(&env, &lp_contract_id);
    
    let metadata = TokenMetadata {
        name: String::from_str(&env, "LP Token"),
        symbol: String::from_str(&env, "LP"),
        decimal: 9,
    };
    
    lp_client.initialize(&admin, &underlying.address(), &metadata);
    lp_client.set_bnpl_core(&bnpl_core_id);
    
    // Mint LP tokens to user
    lp_client.mint(&user, &1000);
    
    // Try to transfer more than available (should panic)
    lp_client.transfer(&user, &recipient, &600); // Has 1000 but 500 locked
}

#[test]
fn test_borrow_repay_tracking() {
    let env = Env::default();
    env.mock_all_auths();
    
    let admin = Address::generate(&env);
    let bnpl_core = Address::generate(&env);
    let recipient = Address::generate(&env);
    
    // Deploy contracts
    let underlying = env.register_stellar_asset_contract_v2(admin.clone());
    let underlying_token_client = TokenClient::new(&env, &underlying.address());
    let underlying_client = StellarAssetClient::new(&env, &underlying.address());
    let lp_contract_id = env.register(LpToken, ());
    let lp_client = LpTokenTestClient::new(&env, &lp_contract_id);
    
    let metadata = TokenMetadata {
        name: String::from_str(&env, "LP Token"),
        symbol: String::from_str(&env, "LP"),
        decimal: 9,
    };
    
    lp_client.initialize(&admin, &underlying.address(), &metadata);
    lp_client.set_bnpl_core(&bnpl_core);
    
    // Add liquidity to the LP token
    underlying_client.mint(&admin, &1_000_000);
    underlying_token_client.transfer(&admin, &lp_contract_id, &500_000);
    
    // Initial state
    assert_eq!(lp_client.total_borrowed(), 0);
    assert_eq!(lp_client.utilization_ratio(), 0);
    
    // BNPL Core borrows
    lp_client.borrow(&recipient, &100_000);
    assert_eq!(lp_client.total_borrowed(), 100_000);
    
    // Check utilization ratio (100k borrowed / 500k total = 20%)
    assert_eq!(lp_client.utilization_ratio(), 2000); // 20% = 2000 basis points
    
    // BNPL Core repays
    underlying_client.mint(&bnpl_core, &50_000);
    underlying_token_client.approve(&bnpl_core, &lp_contract_id, &50_000, &0);
    lp_client.repay(&bnpl_core, &50_000);
    assert_eq!(lp_client.total_borrowed(), 50_000);
    
    // Check new utilization ratio (50k borrowed / 500k total ≈ 10%)
    assert_eq!(lp_client.utilization_ratio(), 1000); // ≈10%
}

#[test]
fn test_set_bnpl_core() {
    let env = Env::default();
    env.mock_all_auths();
    
    let admin = Address::generate(&env);
    let bnpl_core = Address::generate(&env);
    let underlying = env.register_stellar_asset_contract_v2(admin.clone());
    
    let lp_contract_id = env.register(LpToken, ());
    let lp_client = LpTokenTestClient::new(&env, &lp_contract_id);
    
    let metadata = TokenMetadata {
        name: String::from_str(&env, "LP Token"),
        symbol: String::from_str(&env, "LP"),
        decimal: 9,
    };
    
    lp_client.initialize(&admin, &underlying.address(), &metadata);
    
    // Initially no BNPL Core
    assert_eq!(lp_client.get_bnpl_core(), None);
    
    // Set BNPL Core
    lp_client.set_bnpl_core(&bnpl_core);
    assert_eq!(lp_client.get_bnpl_core(), Some(bnpl_core));
}

#[test]
fn test_locked_balance_without_bnpl() {
    let env = Env::default();
    env.mock_all_auths();
    
    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let underlying = env.register_stellar_asset_contract_v2(admin.clone());
    
    let lp_contract_id = env.register(LpToken, ());
    let lp_client = LpTokenTestClient::new(&env, &lp_contract_id);
    
    let metadata = TokenMetadata {
        name: String::from_str(&env, "LP Token"),
        symbol: String::from_str(&env, "LP"),
        decimal: 9,
    };
    
    lp_client.initialize(&admin, &underlying.address(), &metadata);
    
    // Mint some tokens
    lp_client.mint(&user, &1000);
    
    // Without BNPL Core set, locked balance should be 0
    assert_eq!(lp_client.get_locked_balance(&user), 0);
    assert_eq!(lp_client.available_balance(&user), 1000);
    
    // get_balance_info should show all as available
    let (total, locked, available) = lp_client.get_balance_info(&user);
    assert_eq!(total, 1000);
    assert_eq!(locked, 0);
    assert_eq!(available, 1000);
}

#[test]
fn test_burn() {
    let env = Env::default();
    env.mock_all_auths();
    
    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let underlying = env.register_stellar_asset_contract_v2(admin.clone());
    
    let lp_contract_id = env.register(LpToken, ());
    let lp_client = LpTokenTestClient::new(&env, &lp_contract_id);
    let token_client = TokenClient::new(&env, &lp_contract_id);
    
    let metadata = TokenMetadata {
        name: String::from_str(&env, "LP Token"),
        symbol: String::from_str(&env, "LP"),
        decimal: 9,
    };
    
    lp_client.initialize(&admin, &underlying.address(), &metadata);
    
    // Mint tokens to user
    lp_client.mint(&user, &1000);
    assert_eq!(lp_client.balance(&user), 1000);
    
    // Burn tokens
    token_client.burn(&user, &300);
    assert_eq!(lp_client.balance(&user), 700);
}

#[test]
fn test_approve_and_allowance() {
    let env = Env::default();
    env.mock_all_auths();
    
    let admin = Address::generate(&env);
    let owner = Address::generate(&env);
    let spender = Address::generate(&env);
    let underlying = env.register_stellar_asset_contract_v2(admin.clone());
    
    let lp_contract_id = env.register(LpToken, ());
    let lp_client = LpTokenTestClient::new(&env, &lp_contract_id);
    let token_client = TokenClient::new(&env, &lp_contract_id);
    
    let metadata = TokenMetadata {
        name: String::from_str(&env, "LP Token"),
        symbol: String::from_str(&env, "LP"),
        decimal: 9,
    };
    
    lp_client.initialize(&admin, &underlying.address(), &metadata);
    
    // Initially no allowance
    assert_eq!(token_client.allowance(&owner, &spender), 0);
    
    // Approve spender
    token_client.approve(&owner, &spender, &500, &100000);
    assert_eq!(token_client.allowance(&owner, &spender), 500);
    
    // Approve different amount (overwrite)
    token_client.approve(&owner, &spender, &1000, &100000);
    assert_eq!(token_client.allowance(&owner, &spender), 1000);
}

#[test]
fn test_transfer_from() {
    let env = Env::default();
    env.mock_all_auths();
    
    let admin = Address::generate(&env);
    let owner = Address::generate(&env);
    let spender = Address::generate(&env);
    let recipient = Address::generate(&env);
    let underlying = env.register_stellar_asset_contract_v2(admin.clone());
    
    let lp_contract_id = env.register(LpToken, ());
    let lp_client = LpTokenTestClient::new(&env, &lp_contract_id);
    let token_client = TokenClient::new(&env, &lp_contract_id);
    
    let metadata = TokenMetadata {
        name: String::from_str(&env, "LP Token"),
        symbol: String::from_str(&env, "LP"),
        decimal: 9,
    };
    
    lp_client.initialize(&admin, &underlying.address(), &metadata);
    
    // Mint tokens to owner
    lp_client.mint(&owner, &1000);
    
    // Approve spender
    token_client.approve(&owner, &spender, &600, &100000);
    
    // Transfer from owner to recipient via spender
    token_client.transfer_from(&spender, &owner, &recipient, &400);
    
    // Check balances
    assert_eq!(lp_client.balance(&owner), 600);
    assert_eq!(lp_client.balance(&recipient), 400);
    
    // Check remaining allowance
    assert_eq!(token_client.allowance(&owner, &spender), 200);
}

#[test]
fn test_burn_from() {
    let env = Env::default();
    env.mock_all_auths();
    
    let admin = Address::generate(&env);
    let owner = Address::generate(&env);
    let spender = Address::generate(&env);
    let underlying = env.register_stellar_asset_contract_v2(admin.clone());
    
    let lp_contract_id = env.register(LpToken, ());
    let lp_client = LpTokenTestClient::new(&env, &lp_contract_id);
    let token_client = TokenClient::new(&env, &lp_contract_id);
    
    let metadata = TokenMetadata {
        name: String::from_str(&env, "LP Token"),
        symbol: String::from_str(&env, "LP"),
        decimal: 9,
    };
    
    lp_client.initialize(&admin, &underlying.address(), &metadata);
    
    // Mint tokens to owner
    lp_client.mint(&owner, &1000);
    
    // Approve spender
    token_client.approve(&owner, &spender, &600, &100000);
    
    // Burn from owner via spender
    token_client.burn_from(&spender, &owner, &300);
    
    // Check balance
    assert_eq!(lp_client.balance(&owner), 700);
    
    // Check remaining allowance
    assert_eq!(token_client.allowance(&owner, &spender), 300);
}

#[test]
fn test_metadata_functions() {
    let env = Env::default();
    env.mock_all_auths();
    
    let admin = Address::generate(&env);
    let underlying = env.register_stellar_asset_contract_v2(admin.clone());
    
    let lp_contract_id = env.register(LpToken, ());
    let lp_client = LpTokenTestClient::new(&env, &lp_contract_id);
    let token_client = TokenClient::new(&env, &lp_contract_id);
    
    let metadata = TokenMetadata {
        name: String::from_str(&env, "LP Token"),
        symbol: String::from_str(&env, "LP"),
        decimal: 9,
    };
    
    lp_client.initialize(&admin, &underlying.address(), &metadata);
    
    // Test metadata functions
    assert_eq!(token_client.decimals(), 9);
    assert_eq!(token_client.name(), String::from_str(&env, "LP Token"));
    assert_eq!(token_client.symbol(), String::from_str(&env, "LP"));
}

#[test]
#[should_panic(expected = "insufficient available balance")]
fn test_burn_with_locked_balance() {
    let env = Env::default();
    env.mock_all_auths();
    
    let admin = Address::generate(&env);
    let user = Address::from_string(&String::from_str(&env, "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFCT4"));
    
    // Deploy contracts
    let bnpl_core_id = env.register(MockBnplCore, ());
    let underlying = env.register_stellar_asset_contract_v2(admin.clone());
    let lp_contract_id = env.register(LpToken, ());
    let lp_client = LpTokenTestClient::new(&env, &lp_contract_id);
    let token_client = TokenClient::new(&env, &lp_contract_id);
    
    let metadata = TokenMetadata {
        name: String::from_str(&env, "LP Token"),
        symbol: String::from_str(&env, "LP"),
        decimal: 9,
    };
    
    lp_client.initialize(&admin, &underlying.address(), &metadata);
    lp_client.set_bnpl_core(&bnpl_core_id);
    
    // Mint tokens to user
    lp_client.mint(&user, &1000);
    
    // Try to burn more than available (should panic)
    token_client.burn(&user, &600); // Has 1000 but 500 locked
}

#[test]
#[should_panic(expected = "insufficient available balance")]
fn test_burn_from_with_locked_balance() {
    let env = Env::default();
    env.mock_all_auths();
    
    let admin = Address::generate(&env);
    let owner = Address::from_string(&String::from_str(&env, "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFCT4"));
    let spender = Address::generate(&env);
    
    // Deploy contracts
    let bnpl_core_id = env.register(MockBnplCore, ());
    let underlying = env.register_stellar_asset_contract_v2(admin.clone());
    let lp_contract_id = env.register(LpToken, ());
    let lp_client = LpTokenTestClient::new(&env, &lp_contract_id);
    let token_client = TokenClient::new(&env, &lp_contract_id);
    
    let metadata = TokenMetadata {
        name: String::from_str(&env, "LP Token"),
        symbol: String::from_str(&env, "LP"),
        decimal: 9,
    };
    
    lp_client.initialize(&admin, &underlying.address(), &metadata);
    lp_client.set_bnpl_core(&bnpl_core_id);
    
    // Mint tokens to owner
    lp_client.mint(&owner, &1000);
    
    // Approve spender
    token_client.approve(&owner, &spender, &1000, &100000);
    
    // Try to burn more than available (should panic)
    token_client.burn_from(&spender, &owner, &600); // Has 1000 but 500 locked
}

#[test]
fn test_underlying_asset() {
    let env = Env::default();
    env.mock_all_auths();
    
    let admin = Address::generate(&env);
    let underlying = env.register_stellar_asset_contract_v2(admin.clone());
    
    let lp_contract_id = env.register(LpToken, ());
    let lp_client = LpTokenTestClient::new(&env, &lp_contract_id);
    
    let metadata = TokenMetadata {
        name: String::from_str(&env, "LP Token"),
        symbol: String::from_str(&env, "LP"),
        decimal: 9,
    };
    
    lp_client.initialize(&admin, &underlying.address(), &metadata);
    
    // Test underlying_asset function
    assert_eq!(lp_client.underlying_asset(), underlying.address());
}

#[test]
fn test_total_supply() {
    let env = Env::default();
    env.mock_all_auths();
    
    let admin = Address::generate(&env);
    let user1 = Address::generate(&env);
    let user2 = Address::generate(&env);
    let underlying = env.register_stellar_asset_contract_v2(admin.clone());
    
    let lp_contract_id = env.register(LpToken, ());
    let lp_client = LpTokenTestClient::new(&env, &lp_contract_id);
    let token_client = TokenClient::new(&env, &lp_contract_id);
    
    let metadata = TokenMetadata {
        name: String::from_str(&env, "LP Token"),
        symbol: String::from_str(&env, "LP"),
        decimal: 9,
    };
    
    lp_client.initialize(&admin, &underlying.address(), &metadata);
    
    // Initially zero supply
    assert_eq!(lp_client.total_supply(), 0);
    
    // Mint to users
    lp_client.mint(&user1, &1000);
    assert_eq!(lp_client.total_supply(), 1000);
    
    lp_client.mint(&user2, &500);
    assert_eq!(lp_client.total_supply(), 1500);
    
    // Burn from user1
    token_client.burn(&user1, &200);
    assert_eq!(lp_client.total_supply(), 1300);
    
    // Transfer doesn't affect total supply
    lp_client.transfer(&user1, &user2, &300);
    assert_eq!(lp_client.total_supply(), 1300);
}

#[test]
fn test_metadata() {
    let env = Env::default();
    env.mock_all_auths();
    
    let admin = Address::generate(&env);
    let underlying = env.register_stellar_asset_contract_v2(admin.clone());
    
    let lp_contract_id = env.register(LpToken, ());
    let lp_client = LpTokenTestClient::new(&env, &lp_contract_id);
    
    let metadata = TokenMetadata {
        name: String::from_str(&env, "Test LP Token"),
        symbol: String::from_str(&env, "TLP"),
        decimal: 7,
    };
    
    lp_client.initialize(&admin, &underlying.address(), &metadata);
    
    // Test metadata function
    let retrieved_metadata = lp_client.metadata();
    assert_eq!(retrieved_metadata.name, String::from_str(&env, "Test LP Token"));
    assert_eq!(retrieved_metadata.symbol, String::from_str(&env, "TLP"));
    assert_eq!(retrieved_metadata.decimal, 7);
}

#[test]
fn test_total_supply_with_rebasing() {
    let env = Env::default();
    env.mock_all_auths();
    
    let admin = Address::generate(&env);
    let user1 = Address::generate(&env);
    let user2 = Address::generate(&env);
    
    // Deploy underlying asset
    let underlying = env.register_stellar_asset_contract_v2(admin.clone());
    let underlying_client = StellarAssetClient::new(&env, &underlying.address());
    
    // Deploy LP token
    let lp_contract_id = env.register(LpToken, ());
    let lp_client = LpTokenTestClient::new(&env, &lp_contract_id);
    
    let metadata = TokenMetadata {
        name: String::from_str(&env, "LP Token"),
        symbol: String::from_str(&env, "LP"),
        decimal: 9,
    };
    
    lp_client.initialize(&admin, &underlying.address(), &metadata);
    
    // Mint underlying tokens to users
    underlying_client.mint(&user1, &1_000_000);
    underlying_client.mint(&user2, &1_000_000);
    underlying_client.mint(&admin, &1_000_000);
    
    // Users deposit
    lp_client.deposit(&user1, &100_000);
    lp_client.deposit(&user2, &100_000);
    
    // Initial total supply
    assert_eq!(lp_client.total_supply(), 200_000);
    
    // Send yield to LP contract
    underlying_client.mint(&admin, &20_000);
    TokenClient::new(&env, &underlying.address()).transfer(&admin, &lp_contract_id, &20_000);
    
    // Update index to distribute yield
    lp_client.update_index();
    
    // Total supply should increase after rebasing
    assert_eq!(lp_client.total_supply(), 220_000); // 200k + 10%
    
    // Individual balances should also reflect the increase
    assert_eq!(lp_client.balance(&user1), 110_000);
    assert_eq!(lp_client.balance(&user2), 110_000);
}

#[test]
fn test_update_index_with_borrowed_amount() {
    let env = Env::default();
    env.mock_all_auths();
    
    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let bnpl_core = Address::generate(&env);
    let borrower = Address::generate(&env);
    
    // Deploy underlying asset
    let underlying = env.register_stellar_asset_contract_v2(admin.clone());
    let underlying_client = StellarAssetClient::new(&env, &underlying.address());
    
    // Deploy LP token
    let lp_contract_id = env.register(LpToken, ());
    let lp_client = LpTokenTestClient::new(&env, &lp_contract_id);
    
    let metadata = TokenMetadata {
        name: String::from_str(&env, "LP Token"),
        symbol: String::from_str(&env, "LP"),
        decimal: 9,
    };
    
    lp_client.initialize(&admin, &underlying.address(), &metadata);
    lp_client.set_bnpl_core(&bnpl_core);
    
    // User deposits 1,000,000
    underlying_client.mint(&user, &1_000_000);
    lp_client.deposit(&user, &1_000_000);
    
    // BNPL Core borrows 400,000
    lp_client.borrow(&borrower, &400_000);
    
    // Now contract has 600,000 and 400,000 is borrowed
    assert_eq!(lp_client.total_underlying(), 600_000);
    assert_eq!(lp_client.total_borrowed(), 400_000);
    
    // Send 100,000 as yield (10% on total 1,000,000)
    underlying_client.mint(&admin, &100_000);
    TokenClient::new(&env, &underlying.address()).transfer(&admin, &lp_contract_id, &100_000);
    
    // Update index to distribute yield
    lp_client.update_index();
    
    // User balance should increase by 10% (from 1,000,000 to 1,100,000)
    assert_eq!(lp_client.balance(&user), 1_100_000);
    
    // Total supply should also increase
    assert_eq!(lp_client.total_supply(), 1_100_000);
}

#[test]
fn test_repay_with_burn() {
    let env = Env::default();
    env.mock_all_auths();
    
    let admin = Address::generate(&env);
    let user = Address::generate(&env);
    let bnpl_core = Address::generate(&env);
    let borrower = Address::generate(&env);
    
    // Deploy underlying asset
    let underlying = env.register_stellar_asset_contract_v2(admin.clone());
    let underlying_client = StellarAssetClient::new(&env, &underlying.address());
    let underlying_token = TokenClient::new(&env, &underlying.address());
    
    // Deploy LP token
    let lp_contract_id = env.register(LpToken, ());
    let lp_client = LpTokenTestClient::new(&env, &lp_contract_id);
    
    let metadata = TokenMetadata {
        name: String::from_str(&env, "LP Token"),
        symbol: String::from_str(&env, "LP"),
        decimal: 9,
    };
    
    lp_client.initialize(&admin, &underlying.address(), &metadata);
    lp_client.set_bnpl_core(&bnpl_core);
    
    // User deposits 1,000,000
    underlying_client.mint(&user, &1_000_000);
    lp_client.deposit(&user, &1_000_000);
    
    // BNPL Core borrows 400,000 
    lp_client.borrow(&borrower, &400_000);
    
    // Initial state
    assert_eq!(lp_client.balance(&user), 1_000_000);
    assert_eq!(lp_client.total_borrowed(), 400_000);
    
    // Liquidate: repay 200,000 with 10,000 fee
    lp_client.repay_with_burn(&user, &200_000, &10_000);
    
    // Check user balance decreased by 210,000 (200k + 10k fee)
    assert_eq!(lp_client.balance(&user), 790_000);
    
    // Check borrowed amount decreased by 200,000 (not including fee)
    assert_eq!(lp_client.total_borrowed(), 200_000);
    
    // Check BNPL Core received the 10,000 fee
    assert_eq!(underlying_token.balance(&bnpl_core), 10_000);
    
    // Check total supply decreased by 210,000
    assert_eq!(lp_client.total_supply(), 790_000);
}