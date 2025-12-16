#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, Env, Map};
use soroban_sdk::token::{TokenInterface, TokenClient};
use soroban_token_sdk::metadata::TokenMetadata;
use bnpl_core_interface::BnplCoreClient;

// === EVENT TYPES ===
#[contracttype]
#[derive(Clone, Debug)]
pub struct DepositEvent {
    pub user: Address,
    pub amount: i128,
    pub shares_minted: i128,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct WithdrawEvent {
    pub user: Address,
    pub amount: i128,
    pub shares_burned: i128,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct BorrowEvent {
    pub borrower: Address,
    pub amount: i128,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct RepayEvent {
    pub repayer: Address,
    pub amount: i128,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct LiquidationBurnEvent {
    pub user: Address,
    pub amount_burned: i128,
    pub fee: i128,
}

const DECIMALS: u128 = 1_000_000_000;

#[contract]
pub struct LpToken;

// Helper methods that are not part of the trait
#[contractimpl]
impl LpToken {
    fn do_transfer(env: Env, from: Address, to: Address, amount: i128) {
        // Check available balance (total - locked)
        let available = Self::available_balance(env.clone(), from.clone());
        assert!(amount <= available, "insufficient available balance");
        
        let (mut balances, mut user_index, index) = Self::load_state(&env);
        // Apply lazy evaluation to get actual shares at current index
        let from_actual_shares = Self::apply_lazy(&from, &balances, &user_index, index);
        let to_actual_shares = Self::apply_lazy(&to, &balances, &user_index, index);

        let shares = (amount as u128) * DECIMALS / index;
        assert!(shares <= from_actual_shares, "insufficient balance");

        balances.set(from.clone(), from_actual_shares - shares);
        balances.set(to.clone(), to_actual_shares + shares);
        user_index.set(from.clone(), index);
        user_index.set(to.clone(), index);

        Self::save_state(&env, balances, user_index);
    }

    fn supply(env: &Env) -> u128 {
        env.storage().instance().get(&symbol_short!("supply")).unwrap_or(0)
    }

    fn index(env: &Env) -> u128 {
        env.storage().instance().get(&symbol_short!("index")).unwrap_or(DECIMALS)
    }

    fn load_state(env: &Env) -> (Map<Address, u128>, Map<Address, u128>, u128) {
        (
            env.storage().instance().get(&symbol_short!("balances")).unwrap_or(Map::new(&env)),
            env.storage().instance().get(&symbol_short!("usr_index")).unwrap_or(Map::new(&env)),
            Self::index(env),
        )
    }

    fn save_state(env: &Env, balances: Map<Address, u128>, user_index: Map<Address, u128>) {
        env.storage().instance().set(&symbol_short!("balances"), &balances);
        env.storage().instance().set(&symbol_short!("usr_index"), &user_index);
    }

    fn apply_lazy(user: &Address, balances: &Map<Address, u128>, user_index: &Map<Address, u128>, current_index: u128) -> u128 {
        let prev_index = user_index.get(user.clone()).unwrap_or(DECIMALS);
        let stored = balances.get(user.clone()).unwrap_or(0);
        stored * current_index / prev_index
    }

    pub fn initialize(env: Env, admin: Address, underlying_asset: Address, metadata: TokenMetadata) {
        admin.require_auth();
        env.storage().instance().set(&symbol_short!("admin"), &admin);
        env.storage().instance().set(&symbol_short!("asset"), &underlying_asset);
        env.storage().instance().set(&symbol_short!("metadata"), &metadata);
        env.storage().instance().set(&symbol_short!("index"), &DECIMALS); // 1.0
        env.storage().instance().set(&symbol_short!("supply"), &0u128);
        env.storage().instance().set(&symbol_short!("balances"), &Map::<Address, u128>::new(&env));
        env.storage().instance().set(&symbol_short!("usr_index"), &Map::<Address, u128>::new(&env));
        env.storage().instance().set(&symbol_short!("allowance"), &Map::<(Address, Address), u128>::new(&env));
        // Initialize borrowing related storage
        env.storage().instance().set(&symbol_short!("borrowed"), &0u128); // BNPL Core borrowed amount
        // BNPL Core address will be set later via set_bnpl_core()
    }

    /// Update the index based on current underlying balance vs LP supply
    /// This distributes any excess underlying tokens to all LP holders
    /// 
    /// How to use:
    /// 1. Send underlying tokens directly to this contract address
    /// 2. Call update_index() to distribute them to all LP holders
    pub fn update_index(env: Env) {
        // Get current underlying balance in contract
        let underlying_balance = Self::total_underlying(env.clone());
        
        // Get total borrowed amount
        let total_borrowed = Self::total_borrowed(env.clone()) as i128;
        
        // Total assets = balance in contract + borrowed amount
        let total_assets = underlying_balance + total_borrowed;
        
        if total_assets <= 0 {
            return;
        }
        
        // Get current supply and index
        let supply = Self::supply(&env);
        if supply == 0 {
            return;
        }
        
        let current_index = Self::index(&env);
        
        // Calculate what the total supply should be worth at current index
        let expected_underlying = (supply * current_index / DECIMALS) as i128;
        
        // If we have more total assets than expected, increase the index
        if total_assets > expected_underlying {
            let new_index = (total_assets as u128) * DECIMALS / supply;
            env.storage().instance().set(&symbol_short!("index"), &new_index);
        }
    }

    /// Deposit underlying assets and mint LP tokens
    pub fn deposit(env: Env, from: Address, amount: i128) -> i128 {
        from.require_auth();
        
        // First update index to ensure fair exchange rate
        Self::update_index(env.clone());
        
        // Get underlying asset
        let underlying_asset: Address = env.storage().instance().get(&symbol_short!("asset")).unwrap();
        let underlying_client = TokenClient::new(&env, &underlying_asset);
        
        // Transfer underlying tokens from user to this contract
        underlying_client.transfer(&from, &env.current_contract_address(), &amount);
        
        // Calculate LP tokens to mint based on current index
        let (mut balances, mut user_index, index) = Self::load_state(&env);
        let prev_actual_shares = Self::apply_lazy(&from, &balances, &user_index, index);
        
        // Convert amount to shares
        let shares_to_mint = (amount as u128) * DECIMALS / index;
        
        // Update user balance
        balances.set(from.clone(), prev_actual_shares + shares_to_mint);
        user_index.set(from.clone(), index);
        
        // Update total supply
        let new_supply = Self::supply(&env) + shares_to_mint;
        env.storage().instance().set(&symbol_short!("supply"), &new_supply);

        Self::save_state(&env, balances, user_index);

        // Emit deposit event
        env.events().publish(
            (symbol_short!("deposit"), from.clone()),
            DepositEvent {
                user: from,
                amount,
                shares_minted: amount,
            }
        );

        // Return actual LP tokens minted (in amount, not shares)
        amount
    }

    /// Withdraw LP tokens and receive underlying assets
    pub fn withdraw(env: Env, from: Address, lp_amount: i128) -> i128 {
        from.require_auth();
        
        // Check available balance (total - locked)
        let available = Self::available_balance(env.clone(), from.clone());
        assert!(lp_amount <= available, "insufficient available balance");
        
        // Get underlying asset
        let underlying_asset: Address = env.storage().instance().get(&symbol_short!("asset")).unwrap();
        let underlying_client = TokenClient::new(&env, &underlying_asset);
        
        // Calculate shares to burn
        let (mut balances, mut user_index, index) = Self::load_state(&env);
        let user_actual_shares = Self::apply_lazy(&from, &balances, &user_index, index);
        let shares_to_burn = (lp_amount as u128) * DECIMALS / index;
        
        assert!(shares_to_burn <= user_actual_shares, "insufficient balance");
        
        // Calculate underlying amount to return (includes accumulated interest)
        let underlying_amount = (shares_to_burn * index / DECIMALS) as i128;
        
        // Update user balance
        balances.set(from.clone(), user_actual_shares - shares_to_burn);
        user_index.set(from.clone(), index);
        
        // Update total supply
        let new_supply = Self::supply(&env) - shares_to_burn;
        env.storage().instance().set(&symbol_short!("supply"), &new_supply);
        
        Self::save_state(&env, balances, user_index);

        // Transfer underlying tokens back to user
        underlying_client.transfer(&env.current_contract_address(), &from, &underlying_amount);

        // Emit withdraw event
        env.events().publish(
            (symbol_short!("withdraw"), from.clone()),
            WithdrawEvent {
                user: from,
                amount: underlying_amount,
                shares_burned: lp_amount,
            }
        );

        underlying_amount
    }

    /// Get the current exchange rate (how much underlying asset 1 LP token is worth)
    pub fn exchange_rate(env: Env) -> u128 {
        Self::index(&env)
    }

    /// Get the underlying asset address
    pub fn underlying_asset(env: Env) -> Address {
        env.storage().instance().get(&symbol_short!("asset")).unwrap()
    }

    /// Get total underlying assets held by the contract
    pub fn total_underlying(env: Env) -> i128 {
        let underlying_asset: Address = env.storage().instance().get(&symbol_short!("asset")).unwrap();
        let underlying_client = TokenClient::new(&env, &underlying_asset);
        underlying_client.balance(&env.current_contract_address())
    }
    
    /// Set the BNPL Core contract address (admin only)
    pub fn set_bnpl_core(env: Env, bnpl_core: Address) {
        let admin: Address = env.storage().instance().get(&symbol_short!("admin")).unwrap();
        admin.require_auth();
        env.storage().instance().set(&symbol_short!("bnpl_core"), &bnpl_core);
    }
    
    /// Get the BNPL Core contract address
    pub fn get_bnpl_core(env: Env) -> Option<Address> {
        env.storage().instance().get(&symbol_short!("bnpl_core"))
    }
    
    /// Borrow underlying assets (BNPL Core only, no interest)
    pub fn borrow(env: Env, to: Address, amount: i128) {
        // Only BNPL Core can call this
        let bnpl_core: Address = env.storage().instance().get(&symbol_short!("bnpl_core")).unwrap();
        bnpl_core.require_auth();

        // Get current borrowed amount
        let current_borrowed: u128 = env.storage().instance().get(&symbol_short!("borrowed")).unwrap_or(0);

        // Update borrowed amount
        env.storage().instance().set(&symbol_short!("borrowed"), &(current_borrowed + (amount as u128)));

        // Transfer underlying tokens to recipient
        let underlying_asset: Address = env.storage().instance().get(&symbol_short!("asset")).unwrap();
        let underlying_client = TokenClient::new(&env, &underlying_asset);
        underlying_client.transfer(&env.current_contract_address(), &to, &amount);

        // Emit borrow event
        env.events().publish(
            (symbol_short!("borrow"), to.clone()),
            BorrowEvent {
                borrower: to,
                amount,
            }
        );
    }
    
    /// Repay borrowed amount (BNPL Core only)
    pub fn repay(env: Env, from: Address, amount: i128) {
        // Only BNPL Core can call this
        let bnpl_core: Address = env.storage().instance().get(&symbol_short!("bnpl_core")).unwrap();
        bnpl_core.require_auth();

        // Get current borrowed amount
        let current_borrowed: u128 = env.storage().instance().get(&symbol_short!("borrowed")).unwrap_or(0);

        // Cannot repay more than borrowed
        let repay_amount = if (amount as u128) > current_borrowed {
            current_borrowed
        } else {
            amount as u128
        };

        // Update borrowed amount
        env.storage().instance().set(&symbol_short!("borrowed"), &(current_borrowed - repay_amount));

        // Transfer underlying tokens from repayer to this contract
        let underlying_asset: Address = env.storage().instance().get(&symbol_short!("asset")).unwrap();
        let underlying_client = TokenClient::new(&env, &underlying_asset);
        underlying_client.transfer_from(&env.current_contract_address(), &from, &env.current_contract_address(), &(repay_amount as i128));

        // Emit repay event
        env.events().publish(
            (symbol_short!("repay"), from.clone()),
            RepayEvent {
                repayer: from,
                amount: repay_amount as i128,
            }
        );
    }
    
    /// Get total amount borrowed (by BNPL Core)
    pub fn total_borrowed(env: Env) -> u128 {
        env.storage().instance().get(&symbol_short!("borrowed")).unwrap_or(0)
    }
    
    /// Repay with burn for liquidation (BNPL Core only)
    /// Burns LP tokens from user and transfers fee to BNPL Core
    /// amount: The borrowed amount being repaid
    /// fee: The liquidation fee
    /// from: The user being liquidated
    pub fn repay_with_burn(env: Env, from: Address, amount: i128, fee: i128) {
        // Only BNPL Core can call this
        let bnpl_core: Address = env.storage().instance().get(&symbol_short!("bnpl_core")).unwrap();
        bnpl_core.require_auth();
        
        // Total to burn = amount + fee
        let total_to_burn = amount + fee;
        
        // Get current state
        let (mut balances, mut user_index, index) = Self::load_state(&env);
        let user_actual_shares = Self::apply_lazy(&from, &balances, &user_index, index);
        
        // Calculate shares to burn
        let shares_to_burn = (total_to_burn as u128) * DECIMALS / index;
        assert!(shares_to_burn <= user_actual_shares, "insufficient balance for liquidation");
        
        // Burn the shares from user
        balances.set(from.clone(), user_actual_shares - shares_to_burn);
        user_index.set(from.clone(), index);
        
        // Update total supply
        let new_supply = Self::supply(&env) - shares_to_burn;
        env.storage().instance().set(&symbol_short!("supply"), &new_supply);
        
        Self::save_state(&env, balances, user_index);
        
        // Update borrowed amount (reduce by the repaid amount only, not the fee)
        let current_borrowed: u128 = env.storage().instance().get(&symbol_short!("borrowed")).unwrap_or(0);
        let new_borrowed = if (amount as u128) > current_borrowed {
            0
        } else {
            current_borrowed - (amount as u128)
        };
        env.storage().instance().set(&symbol_short!("borrowed"), &new_borrowed);
        
        // Transfer the fee to BNPL Core
        if fee > 0 {
            let underlying_asset: Address = env.storage().instance().get(&symbol_short!("asset")).unwrap();
            let underlying_client = TokenClient::new(&env, &underlying_asset);

            // The underlying tokens equivalent to the fee are now available in the contract
            // Transfer them to BNPL Core
            underlying_client.transfer(&env.current_contract_address(), &bnpl_core, &fee);
        }

        // Emit liquidation burn event
        env.events().publish(
            (symbol_short!("liq_burn"), from.clone()),
            LiquidationBurnEvent {
                user: from,
                amount_burned: total_to_burn,
                fee,
            }
        );
    }

    /// Calculate utilization ratio (borrowed / total_supply)
    /// Returns basis points (10000 = 100%)
    pub fn utilization_ratio(env: Env) -> u32 {
        let total_assets = Self::total_underlying(env.clone()) as u128;
        let total_borrows = Self::total_borrowed(env.clone());
        let total_deposits = total_assets + total_borrows;
        
        if total_deposits == 0 {
            return 0;
        }
        
        // Calculate utilization as basis points
        ((total_borrows * 10000) / total_deposits) as u32
    }
    
    /// Get locked LP tokens for a user based on BNPL Core requirements
    /// This prevents users from withdrawing collateral needed for their BNPL positions
    pub fn get_locked_balance(env: Env, user: Address) -> i128 {
        // Get BNPL Core contract address
        let bnpl_core: Address = match env.storage().instance().get(&symbol_short!("bnpl_core")) {
            Some(addr) => addr,
            None => return 0, // No BNPL Core set, no locked balance
        };
        
        // Query BNPL Core for the user's required collateral
        let bnpl_client = BnplCoreClient::new(&env, &bnpl_core);
        let required_collateral = bnpl_client.get_user_required_collateral(&user);
        
        // The locked balance is the required collateral amount
        required_collateral
    }
    
    
    /// Get available balance (total balance - locked balance)
    pub fn available_balance(env: Env, user: Address) -> i128 {
        let total = Self::balance(env.clone(), user.clone());
        let locked = Self::get_locked_balance(env, user);
        
        if total > locked {
            total - locked
        } else {
            0
        }
    }
    
    /// Get user balance info (total, locked, available)
    pub fn get_balance_info(env: Env, user: Address) -> (i128, i128, i128) {
        let total = Self::balance(env.clone(), user.clone());
        let locked = Self::get_locked_balance(env.clone(), user.clone());
        let available = if total > locked { total - locked } else { 0 };
        
        (total, locked, available)
    }

    pub fn mint(env: Env, to: Address, amount: i128) {
        let admin: Address = env.storage().instance().get(&symbol_short!("admin")).unwrap();
        admin.require_auth();

        let (mut balances, mut user_index, index) = Self::load_state(&env);
        let prev_actual_shares = Self::apply_lazy(&to, &balances, &user_index, index);
        let amount_u128 = amount as u128;
        balances.set(to.clone(), prev_actual_shares + amount_u128 * DECIMALS / index);
        user_index.set(to.clone(), index);
        env.storage().instance().set(&symbol_short!("supply"), &(Self::supply(&env) + amount_u128 * DECIMALS / index));
        Self::save_state(&env, balances, user_index);
    }

    pub fn metadata(env: Env) -> TokenMetadata {
        env.storage().instance().get(&symbol_short!("metadata")).unwrap()
    }

    pub fn total_supply(env: Env) -> i128 {
        (Self::supply(&env) * Self::index(&env) / DECIMALS) as i128
    }
}

#[contractimpl]
impl TokenInterface for LpToken {
    fn balance(env: Env, user: Address) -> i128 {
        let (balances, user_index, index) = Self::load_state(&env);
        let shares = balances.get(user.clone()).unwrap_or(0);
        let user_idx = user_index.get(user.clone()).unwrap_or(DECIMALS);
        // Apply the rebasing formula: shares * current_index / user_index
        (shares * index / user_idx) as i128
    }

    fn allowance(env: Env, from: Address, spender: Address) -> i128 {
        let allowances: Map<(Address, Address), u128> = env.storage().instance().get(&symbol_short!("allowance")).unwrap_or(Map::new(&env));
        allowances.get((from, spender)).unwrap_or(0) as i128
    }

    fn approve(env: Env, from: Address, spender: Address, amount: i128, expiration_ledger: u32) {
        from.require_auth();
        // Note: we ignore expiration_ledger for simplicity
        let _ = expiration_ledger;
        let mut allowances: Map<(Address, Address), u128> = env.storage().instance().get(&symbol_short!("allowance")).unwrap_or(Map::new(&env));
        allowances.set((from.clone(), spender), amount as u128);
        env.storage().instance().set(&symbol_short!("allowance"), &allowances);
    }

    fn transfer(env: Env, from: Address, to: Address, amount: i128) {
        from.require_auth();
        Self::do_transfer(env, from, to, amount);
    }

    fn transfer_from(env: Env, spender: Address, from: Address, to: Address, amount: i128) {
        spender.require_auth();
        let mut allowances: Map<(Address, Address), u128> = env.storage().instance().get(&symbol_short!("allowance")).unwrap_or(Map::new(&env));
        let current = allowances.get((from.clone(), spender.clone())).unwrap_or(0) as i128;
        assert!(current >= amount, "allowance exceeded");
        allowances.set((from.clone(), spender.clone()), (current - amount) as u128);
        env.storage().instance().set(&symbol_short!("allowance"), &allowances);
        Self::do_transfer(env, from, to, amount);
    }

    fn burn(env: Env, from: Address, amount: i128) {
        from.require_auth();
        
        // Check available balance (total - locked)
        let available = Self::available_balance(env.clone(), from.clone());
        assert!(amount <= available, "insufficient available balance");
        
        let (mut balances, mut user_index, index) = Self::load_state(&env);
        let prev_actual_shares = Self::apply_lazy(&from, &balances, &user_index, index);
        let burn_shares = (amount as u128) * DECIMALS / index;
        assert!(burn_shares <= prev_actual_shares, "insufficient balance");
        balances.set(from.clone(), prev_actual_shares - burn_shares);
        user_index.set(from.clone(), index);
        env.storage().instance().set(&symbol_short!("supply"), &(Self::supply(&env) - burn_shares));
        Self::save_state(&env, balances, user_index);
    }

    fn burn_from(env: Env, spender: Address, from: Address, amount: i128) {
        spender.require_auth();
        
        // Check available balance (total - locked)
        let available = Self::available_balance(env.clone(), from.clone());
        assert!(amount <= available, "insufficient available balance");
        
        let mut allowances: Map<(Address, Address), u128> = env.storage().instance().get(&symbol_short!("allowance")).unwrap_or(Map::new(&env));
        let current = allowances.get((from.clone(), spender.clone())).unwrap_or(0) as i128;
        assert!(current >= amount, "allowance exceeded");
        allowances.set((from.clone(), spender.clone()), (current - amount) as u128);
        env.storage().instance().set(&symbol_short!("allowance"), &allowances);

        let (mut balances, mut user_index, index) = Self::load_state(&env);
        let prev_actual_shares = Self::apply_lazy(&from, &balances, &user_index, index);
        let burn_shares = (amount as u128) * DECIMALS / index;
        assert!(burn_shares <= prev_actual_shares, "insufficient balance");
        balances.set(from.clone(), prev_actual_shares - burn_shares);
        user_index.set(from.clone(), index);
        env.storage().instance().set(&symbol_short!("supply"), &(Self::supply(&env) - burn_shares));
        Self::save_state(&env, balances, user_index);
    }

    fn decimals(_env: Env) -> u32 {
        9
    }

    fn name(env: Env) -> soroban_sdk::String {
        let metadata: TokenMetadata = env.storage().instance().get(&symbol_short!("metadata")).unwrap();
        metadata.name
    }

    fn symbol(env: Env) -> soroban_sdk::String {
        let metadata: TokenMetadata = env.storage().instance().get(&symbol_short!("metadata")).unwrap();
        metadata.symbol
    }
}

#[cfg(test)]
mod tests;