#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, String};
use soroban_token_sdk::{metadata::TokenMetadata, TokenUtils};

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Admin,
    Metadata,
    Balance(Address),
    Allowance(Address, Address),
    TotalSupply,
    MintLimit,
    LastMint(Address),
    DailyMinted(Address),
}

pub trait TokenTrait {
    fn initialize(env: Env, admin: Address, name: String, symbol: String, decimals: u32, mint_limit: i128);
    
    fn mint(env: Env, to: Address, amount: i128);
    
    fn burn(env: Env, from: Address, amount: i128);

    fn burn_from(env: Env, spender: Address, from: Address, amount: i128);

    fn balance(env: Env, id: Address) -> i128;
    
    fn transfer(env: Env, from: Address, to: Address, amount: i128);
    
    fn approve(env: Env, from: Address, spender: Address, amount: i128, expiration_ledger: u32);
    
    fn allowance(env: Env, from: Address, spender: Address) -> i128;
    
    fn transfer_from(env: Env, spender: Address, from: Address, to: Address, amount: i128);
    
    fn total_supply(env: Env) -> i128;
    
    fn name(env: Env) -> String;
    
    fn symbol(env: Env) -> String;
    
    fn decimals(env: Env) -> u32;
    
    fn get_mint_limit(env: Env) -> i128;
    
    fn get_daily_minted(env: Env, address: Address) -> i128;
}

#[contract]
pub struct UsdcToken;

#[contractimpl]
impl TokenTrait for UsdcToken {
    fn initialize(env: Env, admin: Address, name: String, symbol: String, decimals: u32, mint_limit: i128) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("Already initialized");
        }
        
        env.storage().instance().set(&DataKey::Admin, &admin);
        
        let metadata = TokenMetadata {
            name: name.clone(),
            symbol: symbol.clone(),
            decimal: decimals,
        };
        env.storage().instance().set(&DataKey::Metadata, &metadata);
        
        // Set initial values
        env.storage().instance().set(&DataKey::TotalSupply, &0i128);
        
        // Set daily mint limit to 1000 USDC (with 7 decimals - updated for consistency)
        env.storage().instance().set(&DataKey::MintLimit, &mint_limit);
    }
    
    fn mint(env: Env, to: Address, amount: i128) {
        to.require_auth();
        
        if amount <= 0 {
            panic!("Amount must be positive");
        }
        
        // Check daily mint limit
        let current_time = env.ledger().timestamp();
        let day = current_time / 86400; // Convert to days
        
        let last_mint_key = DataKey::LastMint(to.clone());
        let daily_minted_key = DataKey::DailyMinted(to.clone());
        
        let last_mint_day = env.storage().instance()
            .get::<DataKey, u64>(&last_mint_key)
            .unwrap_or(0);
        
        let daily_minted = if last_mint_day < day {
            // New day, reset counter
            0i128
        } else {
            env.storage().instance()
                .get::<DataKey, i128>(&daily_minted_key)
                .unwrap_or(0)
        };
        
        let mint_limit = env.storage().instance()
            .get::<DataKey, i128>(&DataKey::MintLimit)
            .unwrap();
        
        if daily_minted + amount > mint_limit {
            panic!("Daily mint limit exceeded");
        }
        
        // Update mint tracking with TTL extension
        env.storage().instance().set(&last_mint_key, &day);
        env.storage().instance().set(&daily_minted_key, &(daily_minted + amount));
        env.storage().instance().extend_ttl(100000, 100000);
        
        // Mint tokens
        let balance_key = DataKey::Balance(to.clone());
        let balance = env.storage().instance()
            .get::<DataKey, i128>(&balance_key)
            .unwrap_or(0);
        
        env.storage().instance().set(&balance_key, &(balance + amount));
        env.storage().instance().extend_ttl(100000, 100000);
        
        // Update total supply
        let total_supply = env.storage().instance()
            .get::<DataKey, i128>(&DataKey::TotalSupply)
            .unwrap();
        env.storage().instance().set(&DataKey::TotalSupply, &(total_supply + amount));
        
        // Emit standard token event
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        TokenUtils::new(&env).events().mint(admin.clone(), to.clone(), amount);
    }
    
    fn burn(env: Env, from: Address, amount: i128) {
        from.require_auth();
        
        if amount <= 0 {
            panic!("Amount must be positive");
        }
        
        let balance_key = DataKey::Balance(from.clone());
        let balance = env.storage().instance()
            .get::<DataKey, i128>(&balance_key)
            .unwrap_or(0);
        
        if balance < amount {
            panic!("Insufficient balance");
        }
        
        env.storage().instance().set(&balance_key, &(balance - amount));
        
        // Update total supply
        let total_supply = env.storage().instance()
            .get::<DataKey, i128>(&DataKey::TotalSupply)
            .unwrap();
        env.storage().instance().set(&DataKey::TotalSupply, &(total_supply - amount));
        
        // Emit standard token event
        TokenUtils::new(&env).events().burn(from.clone(), amount);
    }

    fn burn_from(env: Env, spender: Address, from: Address, amount: i128) {
        spender.require_auth();

        if amount <= 0 {
            panic!("Amount must be positive");
        }

        // Check allowance
        let allowance_key = DataKey::Allowance(from.clone(), spender.clone());
        let allowance = env.storage().instance()
            .get::<DataKey, i128>(&allowance_key)
            .unwrap_or(0);

        if allowance < amount {
            panic!("Insufficient allowance");
        }

        // Check balance
        let balance_key = DataKey::Balance(from.clone());
        let balance = env.storage().instance()
            .get::<DataKey, i128>(&balance_key)
            .unwrap_or(0);

        if balance < amount {
            panic!("Insufficient balance");
        }

        // Decrease balance
        env.storage().instance().set(&balance_key, &(balance - amount));

        // Decrease allowance
        env.storage().instance().set(&allowance_key, &(allowance - amount));

        // Update total supply
        let total_supply = env.storage().instance()
            .get::<DataKey, i128>(&DataKey::TotalSupply)
            .unwrap();
        env.storage().instance().set(&DataKey::TotalSupply, &(total_supply - amount));

        // Emit burn event
        TokenUtils::new(&env).events().burn(from.clone(), amount);
    }
    
    fn balance(env: Env, address: Address) -> i128 {
        let balance_key = DataKey::Balance(address);
        env.storage().instance()
            .get::<DataKey, i128>(&balance_key)
            .unwrap_or(0)
    }
    
    fn transfer(env: Env, from: Address, to: Address, amount: i128) {
        from.require_auth();
        
        if amount <= 0 {
            panic!("Amount must be positive");
        }
        
        let from_balance_key = DataKey::Balance(from.clone());
        let from_balance = env.storage().instance()
            .get::<DataKey, i128>(&from_balance_key)
            .unwrap_or(0);
        
        if from_balance < amount {
            panic!("Insufficient balance");
        }
        
        let to_balance_key = DataKey::Balance(to.clone());
        let to_balance = env.storage().instance()
            .get::<DataKey, i128>(&to_balance_key)
            .unwrap_or(0);
        
        env.storage().instance().set(&from_balance_key, &(from_balance - amount));
        env.storage().instance().set(&to_balance_key, &(to_balance + amount));
        
        // Emit standard token event
        TokenUtils::new(&env).events().transfer(from.clone(), to.clone(), amount);
    }
    
    fn approve(env: Env, from: Address, spender: Address, amount: i128, expiration_ledger: u32) {
        from.require_auth();
        
        let allowance_key = DataKey::Allowance(from.clone(), spender.clone());
        env.storage().instance().set(&allowance_key, &amount);
        
        // Emit standard token event
        TokenUtils::new(&env).events().approve(from.clone(), spender.clone(), amount, expiration_ledger);
    }
    
    fn allowance(env: Env, from: Address, spender: Address) -> i128 {
        let allowance_key = DataKey::Allowance(from, spender);
        env.storage().instance()
            .get::<DataKey, i128>(&allowance_key)
            .unwrap_or(0)
    }
    
    fn transfer_from(env: Env, spender: Address, from: Address, to: Address, amount: i128) {
        spender.require_auth();
        
        if amount <= 0 {
            panic!("Amount must be positive");
        }
        
        let allowance_key = DataKey::Allowance(from.clone(), spender.clone());
        let allowance = env.storage().instance()
            .get::<DataKey, i128>(&allowance_key)
            .unwrap_or(0);
        
        if allowance < amount {
            panic!("Insufficient allowance");
        }
        
        let from_balance_key = DataKey::Balance(from.clone());
        let from_balance = env.storage().instance()
            .get::<DataKey, i128>(&from_balance_key)
            .unwrap_or(0);
        
        if from_balance < amount {
            panic!("Insufficient balance");
        }
        
        let to_balance_key = DataKey::Balance(to.clone());
        let to_balance = env.storage().instance()
            .get::<DataKey, i128>(&to_balance_key)
            .unwrap_or(0);
        
        env.storage().instance().set(&from_balance_key, &(from_balance - amount));
        env.storage().instance().set(&to_balance_key, &(to_balance + amount));
        env.storage().instance().set(&allowance_key, &(allowance - amount));
        
        // Emit standard token event
        TokenUtils::new(&env).events().transfer(from.clone(), to.clone(), amount);
    }
    
    fn total_supply(env: Env) -> i128 {
        env.storage().instance()
            .get::<DataKey, i128>(&DataKey::TotalSupply)
            .unwrap_or(0)
    }
    
    fn name(env: Env) -> String {
        let metadata = env.storage().instance()
            .get::<DataKey, TokenMetadata>(&DataKey::Metadata)
            .unwrap();
        metadata.name
    }
    
    fn symbol(env: Env) -> String {
        let metadata = env.storage().instance()
            .get::<DataKey, TokenMetadata>(&DataKey::Metadata)
            .unwrap();
        metadata.symbol
    }
    
    fn decimals(env: Env) -> u32 {
        let metadata = env.storage().instance()
            .get::<DataKey, TokenMetadata>(&DataKey::Metadata)
            .unwrap();
        metadata.decimal
    }
    
    fn get_mint_limit(env: Env) -> i128 {
        env.storage().instance()
            .get::<DataKey, i128>(&DataKey::MintLimit)
            .unwrap()
    }
    
    fn get_daily_minted(env: Env, address: Address) -> i128 {
        let current_time = env.ledger().timestamp();
        let day = current_time / 86400;
        
        let last_mint_key = DataKey::LastMint(address.clone());
        let daily_minted_key = DataKey::DailyMinted(address);
        
        let last_mint_day = env.storage().instance()
            .get::<DataKey, u64>(&last_mint_key)
            .unwrap_or(0);
        
        if last_mint_day < day {
            0
        } else {
            env.storage().instance()
                .get::<DataKey, i128>(&daily_minted_key)
                .unwrap_or(0)
        }
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::testutils::Address as _;
    use soroban_sdk::{Address, Env, String};
    

    #[test]
    fn test_initialize() {
        let env = Env::default();
        let contract_id = env.register(UsdcToken, ());
        let client = UsdcTokenClient::new(&env, &contract_id);
        
        let admin = Address::generate(&env);
        let name = String::from_str(&env, "Testnet USDC");
        let symbol = String::from_str(&env, "USDC");
        
        client.initialize(&admin, &name, &symbol, &7, &10000000_0000000);
        
        assert_eq!(client.name(), name);
        assert_eq!(client.symbol(), symbol);
        assert_eq!(client.decimals(), 7);
        assert_eq!(client.total_supply(), 0);
    }
    
    #[test]
    fn test_mint() {
        let env = Env::default();
        let contract_id = env.register(UsdcToken, ());
        let client = UsdcTokenClient::new(&env, &contract_id);
        
        let admin = Address::generate(&env);
        let user = Address::generate(&env);
        
        client.initialize(
            &admin,
            &String::from_str(&env, "Testnet USDC"),
            &String::from_str(&env, "USDC"),
            &7,
            &1000_0000000
        );
        
        // Test minting (user requires auth for minting)
        env.mock_all_auths();
        let amount = 100_0000000i128; // 100 USDC
        client.mint(&user, &amount);
        
        assert_eq!(client.balance(&user), amount);
        assert_eq!(client.total_supply(), amount);
    }
    
    #[test]
    #[should_panic(expected = "Daily mint limit exceeded")]
    fn test_mint_limit() {
        let env = Env::default();
        let contract_id = env.register(UsdcToken, ());
        let client = UsdcTokenClient::new(&env, &contract_id);
        
        let admin = Address::generate(&env);
        let user = Address::generate(&env);
        
        client.initialize(
            &admin,
            &String::from_str(&env, "Testnet USDC"),
            &String::from_str(&env, "USDC"),
            &7,
            &1000_0000000
        );
        
        // Try to mint more than limit
        env.mock_all_auths();
        let amount = 1001_0000000i128; // 1001 USDC (exceeds 1000 limit)
        client.mint(&user, &amount);
    }
    
    #[test]
    fn test_transfer() {
        let env = Env::default();
        let contract_id = env.register(UsdcToken, ());
        let client = UsdcTokenClient::new(&env, &contract_id);
        
        let admin = Address::generate(&env);
        let user1 = Address::generate(&env);
        let user2 = Address::generate(&env);
        
        client.initialize(
            &admin,
            &String::from_str(&env, "Testnet USDC"),
            &String::from_str(&env, "USDC"),
            &7,
            &1000_0000000
        );
        
        // Mint and transfer
        env.mock_all_auths();
        let amount = 100_0000000i128;
        client.mint(&user1, &amount);
        
        let transfer_amount = 50_0000000i128;
        client.transfer(&user1, &user2, &transfer_amount);
        
        assert_eq!(client.balance(&user1), amount - transfer_amount);
        assert_eq!(client.balance(&user2), transfer_amount);
    }

    #[test]
    fn test_burn_from() {
        let env = Env::default();
        let contract_id = env.register(UsdcToken, ());
        let client = UsdcTokenClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let owner = Address::generate(&env);
        let spender = Address::generate(&env);

        client.initialize(
            &admin,
            &String::from_str(&env, "Testnet USDC"),
            &String::from_str(&env, "USDC"),
            &7,
            &1000_0000000
        );

        env.mock_all_auths();

        // Mint tokens to owner
        let mint_amount = 100_0000000i128;
        client.mint(&owner, &mint_amount);

        // Owner approves spender
        let approve_amount = 50_0000000i128;
        client.approve(&owner, &spender, &approve_amount, &1000);

        // Spender burns from owner
        let burn_amount = 30_0000000i128;
        client.burn_from(&spender, &owner, &burn_amount);

        // Verify results
        assert_eq!(client.balance(&owner), mint_amount - burn_amount);
        assert_eq!(client.allowance(&owner, &spender), approve_amount - burn_amount);
        assert_eq!(client.total_supply(), mint_amount - burn_amount);
    }

    #[test]
    #[should_panic(expected = "Insufficient allowance")]
    fn test_burn_from_insufficient_allowance() {
        let env = Env::default();
        let contract_id = env.register(UsdcToken, ());
        let client = UsdcTokenClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let owner = Address::generate(&env);
        let spender = Address::generate(&env);

        client.initialize(
            &admin,
            &String::from_str(&env, "Testnet USDC"),
            &String::from_str(&env, "USDC"),
            &7,
            &1000_0000000
        );

        env.mock_all_auths();

        // Mint tokens to owner
        client.mint(&owner, &100_0000000i128);

        // Owner approves small amount
        client.approve(&owner, &spender, &10_0000000i128, &1000);

        // Spender tries to burn more than allowed
        client.burn_from(&spender, &owner, &50_0000000i128);
    }

    #[test]
    #[should_panic(expected = "Insufficient balance")]
    fn test_burn_from_insufficient_balance() {
        let env = Env::default();
        let contract_id = env.register(UsdcToken, ());
        let client = UsdcTokenClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let owner = Address::generate(&env);
        let spender = Address::generate(&env);

        client.initialize(
            &admin,
            &String::from_str(&env, "Testnet USDC"),
            &String::from_str(&env, "USDC"),
            &7,
            &1000_0000000
        );

        env.mock_all_auths();

        // Mint small amount to owner
        client.mint(&owner, &10_0000000i128);

        // Owner approves large amount
        client.approve(&owner, &spender, &100_0000000i128, &1000);

        // Spender tries to burn more than balance
        client.burn_from(&spender, &owner, &50_0000000i128);
    }
}