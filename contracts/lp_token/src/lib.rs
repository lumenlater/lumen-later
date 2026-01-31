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
    pub shares_minted: u128,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct WithdrawEvent {
    pub user: Address,
    pub amount: i128,
    pub shares_burned: u128,
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

const DECIMALS: u128 = 1_000_000_000; // 1e9 for precision

#[contract]
pub struct LpToken;

#[contractimpl]
impl LpToken {
    // ==================== Internal Helpers ====================

    fn get_balances(env: &Env) -> Map<Address, u128> {
        env.storage().instance().get(&symbol_short!("balances")).unwrap_or(Map::new(env))
    }

    fn set_balances(env: &Env, balances: Map<Address, u128>) {
        env.storage().instance().set(&symbol_short!("balances"), &balances);
    }

    fn get_supply(env: &Env) -> u128 {
        env.storage().instance().get(&symbol_short!("supply")).unwrap_or(0)
    }

    fn set_supply(env: &Env, supply: u128) {
        env.storage().instance().set(&symbol_short!("supply"), &supply);
    }

    fn get_index(env: &Env) -> u128 {
        env.storage().instance().get(&symbol_short!("index")).unwrap_or(DECIMALS)
    }

    fn set_index(env: &Env, index: u128) {
        env.storage().instance().set(&symbol_short!("index"), &index);
    }

    /// Get raw shares for a user (internal use)
    fn get_shares(env: &Env, user: &Address) -> u128 {
        Self::get_balances(env).get(user.clone()).unwrap_or(0)
    }

    /// Set raw shares for a user (internal use)
    fn set_shares(env: &Env, user: &Address, shares: u128) {
        let mut balances = Self::get_balances(env);
        balances.set(user.clone(), shares);
        Self::set_balances(env, balances);
    }

    /// Convert USDC amount to shares at current index
    fn amount_to_shares(env: &Env, amount: u128) -> u128 {
        let index = Self::get_index(env);
        amount * DECIMALS / index
    }

    /// Convert shares to USDC amount at current index
    fn shares_to_amount(env: &Env, shares: u128) -> u128 {
        let index = Self::get_index(env);
        shares * index / DECIMALS
    }

    fn do_transfer(env: Env, from: Address, to: Address, amount: i128) {
        // Check available balance
        let available = Self::available_balance(env.clone(), from.clone());
        assert!(amount <= available, "insufficient available balance");

        let shares_to_transfer = Self::amount_to_shares(&env, amount as u128);

        let from_shares = Self::get_shares(&env, &from);
        let to_shares = Self::get_shares(&env, &to);

        assert!(shares_to_transfer <= from_shares, "insufficient balance");

        Self::set_shares(&env, &from, from_shares - shares_to_transfer);
        Self::set_shares(&env, &to, to_shares + shares_to_transfer);
    }

    // ==================== Public Functions ====================

    pub fn initialize(env: Env, admin: Address, underlying_asset: Address, metadata: TokenMetadata) {
        admin.require_auth();
        env.storage().instance().set(&symbol_short!("admin"), &admin);
        env.storage().instance().set(&symbol_short!("asset"), &underlying_asset);
        env.storage().instance().set(&symbol_short!("metadata"), &metadata);
        env.storage().instance().set(&symbol_short!("index"), &DECIMALS); // Start at 1.0
        env.storage().instance().set(&symbol_short!("supply"), &0u128);
        env.storage().instance().set(&symbol_short!("balances"), &Map::<Address, u128>::new(&env));
        env.storage().instance().set(&symbol_short!("allowance"), &Map::<(Address, Address), u128>::new(&env));
        env.storage().instance().set(&symbol_short!("borrowed"), &0u128);
    }

    /// Update the index based on current underlying balance vs LP supply
    /// This distributes any excess underlying tokens to all LP holders proportionally
    ///
    /// Call this after sending tokens to the contract to distribute them as yield
    pub fn update_index(env: Env) {
        let underlying_balance = Self::total_underlying(env.clone());
        let total_borrowed = Self::total_borrowed(env.clone()) as i128;
        let total_assets = underlying_balance + total_borrowed;

        if total_assets <= 0 {
            return;
        }

        let supply = Self::get_supply(&env);
        if supply == 0 {
            return;
        }

        let current_index = Self::get_index(&env);
        let expected_value = (supply * current_index / DECIMALS) as i128;

        // If we have more assets than expected, increase the index
        if total_assets > expected_value {
            let new_index = (total_assets as u128) * DECIMALS / supply;
            Self::set_index(&env, new_index);
        }
    }

    /// Deposit underlying assets and receive LP tokens
    /// Returns the amount of LP tokens (USDC value) credited to the user
    pub fn deposit(env: Env, from: Address, amount: i128) -> i128 {
        from.require_auth();

        // Update index first to ensure fair exchange rate
        Self::update_index(env.clone());

        // Transfer underlying tokens from user to this contract
        let underlying_asset: Address = env.storage().instance().get(&symbol_short!("asset")).unwrap();
        let underlying_client = TokenClient::new(&env, &underlying_asset);
        underlying_client.transfer(&from, &env.current_contract_address(), &amount);

        // Calculate shares to mint based on current index
        let shares_to_mint = Self::amount_to_shares(&env, amount as u128);

        // Update user's shares
        let current_shares = Self::get_shares(&env, &from);
        Self::set_shares(&env, &from, current_shares + shares_to_mint);

        // Update total supply
        let new_supply = Self::get_supply(&env) + shares_to_mint;
        Self::set_supply(&env, new_supply);

        // Emit deposit event
        env.events().publish(
            (symbol_short!("deposit"), from.clone()),
            DepositEvent {
                user: from,
                amount,
                shares_minted: shares_to_mint,
            }
        );

        // Return the USDC value deposited (which equals amount)
        amount
    }

    /// Withdraw LP tokens and receive underlying assets
    /// amount: The USDC value to withdraw (same as balance() units)
    /// Returns the actual USDC amount received
    pub fn withdraw(env: Env, from: Address, amount: i128) -> i128 {
        from.require_auth();

        // Check available balance
        let available = Self::available_balance(env.clone(), from.clone());
        assert!(amount <= available, "insufficient available balance");

        // Calculate shares to burn
        let shares_to_burn = Self::amount_to_shares(&env, amount as u128);

        let user_shares = Self::get_shares(&env, &from);
        assert!(shares_to_burn <= user_shares, "insufficient balance");

        // Update user's shares
        Self::set_shares(&env, &from, user_shares - shares_to_burn);

        // Update total supply
        let current_supply = Self::get_supply(&env);
        Self::set_supply(&env, current_supply - shares_to_burn);

        // Transfer underlying tokens back to user
        let underlying_asset: Address = env.storage().instance().get(&symbol_short!("asset")).unwrap();
        let underlying_client = TokenClient::new(&env, &underlying_asset);
        underlying_client.transfer(&env.current_contract_address(), &from, &amount);

        // Emit withdraw event
        env.events().publish(
            (symbol_short!("withdraw"), from.clone()),
            WithdrawEvent {
                user: from,
                amount,
                shares_burned: shares_to_burn,
            }
        );

        amount
    }

    /// Get the current exchange rate (index)
    /// 1 share = index / DECIMALS USDC
    pub fn exchange_rate(env: Env) -> u128 {
        Self::get_index(&env)
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

    /// Borrow underlying assets (BNPL Core only)
    pub fn borrow(env: Env, to: Address, amount: i128) {
        let bnpl_core: Address = env.storage().instance().get(&symbol_short!("bnpl_core")).unwrap();
        bnpl_core.require_auth();

        let current_borrowed: u128 = env.storage().instance().get(&symbol_short!("borrowed")).unwrap_or(0);
        env.storage().instance().set(&symbol_short!("borrowed"), &(current_borrowed + (amount as u128)));

        let underlying_asset: Address = env.storage().instance().get(&symbol_short!("asset")).unwrap();
        let underlying_client = TokenClient::new(&env, &underlying_asset);
        underlying_client.transfer(&env.current_contract_address(), &to, &amount);

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
        let bnpl_core: Address = env.storage().instance().get(&symbol_short!("bnpl_core")).unwrap();
        bnpl_core.require_auth();

        let current_borrowed: u128 = env.storage().instance().get(&symbol_short!("borrowed")).unwrap_or(0);
        let repay_amount = if (amount as u128) > current_borrowed {
            current_borrowed
        } else {
            amount as u128
        };

        env.storage().instance().set(&symbol_short!("borrowed"), &(current_borrowed - repay_amount));

        let underlying_asset: Address = env.storage().instance().get(&symbol_short!("asset")).unwrap();
        let underlying_client = TokenClient::new(&env, &underlying_asset);
        underlying_client.transfer_from(&env.current_contract_address(), &from, &env.current_contract_address(), &(repay_amount as i128));

        env.events().publish(
            (symbol_short!("repay"), from.clone()),
            RepayEvent {
                repayer: from,
                amount: repay_amount as i128,
            }
        );
    }

    /// Get total amount borrowed
    pub fn total_borrowed(env: Env) -> u128 {
        env.storage().instance().get(&symbol_short!("borrowed")).unwrap_or(0)
    }

    /// Repay with burn for liquidation (BNPL Core only)
    pub fn repay_with_burn(env: Env, from: Address, amount: i128, fee: i128) {
        let bnpl_core: Address = env.storage().instance().get(&symbol_short!("bnpl_core")).unwrap();
        bnpl_core.require_auth();

        let total_to_burn = amount + fee;
        let shares_to_burn = Self::amount_to_shares(&env, total_to_burn as u128);

        let user_shares = Self::get_shares(&env, &from);
        assert!(shares_to_burn <= user_shares, "insufficient balance for liquidation");

        // Burn shares from user
        Self::set_shares(&env, &from, user_shares - shares_to_burn);

        // Update total supply
        let current_supply = Self::get_supply(&env);
        Self::set_supply(&env, current_supply - shares_to_burn);

        // Update borrowed amount
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
            underlying_client.transfer(&env.current_contract_address(), &bnpl_core, &fee);
        }

        env.events().publish(
            (symbol_short!("liq_burn"), from.clone()),
            LiquidationBurnEvent {
                user: from,
                amount_burned: total_to_burn,
                fee,
            }
        );
    }

    /// Calculate utilization ratio (borrowed / total_deposits)
    /// Returns basis points (10000 = 100%)
    pub fn utilization_ratio(env: Env) -> u32 {
        let total_assets = Self::total_underlying(env.clone()) as u128;
        let total_borrows = Self::total_borrowed(env.clone());
        let total_deposits = total_assets + total_borrows;

        if total_deposits == 0 {
            return 0;
        }

        ((total_borrows * 10000) / total_deposits) as u32
    }

    /// Get locked LP tokens for a user based on BNPL Core requirements
    pub fn get_locked_balance(env: Env, user: Address) -> i128 {
        let bnpl_core: Address = match env.storage().instance().get(&symbol_short!("bnpl_core")) {
            Some(addr) => addr,
            None => return 0,
        };

        let bnpl_client = BnplCoreClient::new(&env, &bnpl_core);
        bnpl_client.get_user_required_collateral(&user)
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

        let shares_to_mint = Self::amount_to_shares(&env, amount as u128);
        let current_shares = Self::get_shares(&env, &to);
        Self::set_shares(&env, &to, current_shares + shares_to_mint);

        let new_supply = Self::get_supply(&env) + shares_to_mint;
        Self::set_supply(&env, new_supply);
    }

    pub fn metadata(env: Env) -> TokenMetadata {
        env.storage().instance().get(&symbol_short!("metadata")).unwrap()
    }

    /// Total supply in USDC value (not raw shares)
    pub fn total_supply(env: Env) -> i128 {
        Self::shares_to_amount(&env, Self::get_supply(&env)) as i128
    }

    /// Get user's raw shares (for debugging/transparency)
    pub fn raw_shares(env: Env, user: Address) -> u128 {
        Self::get_shares(&env, &user)
    }

    /// Get total raw shares (for debugging/transparency)
    pub fn total_raw_shares(env: Env) -> u128 {
        Self::get_supply(&env)
    }
}

#[contractimpl]
impl TokenInterface for LpToken {
    /// Balance in USDC value (shares * index / DECIMALS)
    fn balance(env: Env, user: Address) -> i128 {
        let shares = Self::get_shares(&env, &user);
        Self::shares_to_amount(&env, shares) as i128
    }

    fn allowance(env: Env, from: Address, spender: Address) -> i128 {
        let allowances: Map<(Address, Address), u128> = env.storage().instance().get(&symbol_short!("allowance")).unwrap_or(Map::new(&env));
        allowances.get((from, spender)).unwrap_or(0) as i128
    }

    fn approve(env: Env, from: Address, spender: Address, amount: i128, expiration_ledger: u32) {
        from.require_auth();
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

        let available = Self::available_balance(env.clone(), from.clone());
        assert!(amount <= available, "insufficient available balance");

        let shares_to_burn = Self::amount_to_shares(&env, amount as u128);
        let user_shares = Self::get_shares(&env, &from);
        assert!(shares_to_burn <= user_shares, "insufficient balance");

        Self::set_shares(&env, &from, user_shares - shares_to_burn);

        let current_supply = Self::get_supply(&env);
        Self::set_supply(&env, current_supply - shares_to_burn);
    }

    fn burn_from(env: Env, spender: Address, from: Address, amount: i128) {
        spender.require_auth();

        let available = Self::available_balance(env.clone(), from.clone());
        assert!(amount <= available, "insufficient available balance");

        let mut allowances: Map<(Address, Address), u128> = env.storage().instance().get(&symbol_short!("allowance")).unwrap_or(Map::new(&env));
        let current = allowances.get((from.clone(), spender.clone())).unwrap_or(0) as i128;
        assert!(current >= amount, "allowance exceeded");
        allowances.set((from.clone(), spender.clone()), (current - amount) as u128);
        env.storage().instance().set(&symbol_short!("allowance"), &allowances);

        let shares_to_burn = Self::amount_to_shares(&env, amount as u128);
        let user_shares = Self::get_shares(&env, &from);
        assert!(shares_to_burn <= user_shares, "insufficient balance");

        Self::set_shares(&env, &from, user_shares - shares_to_burn);

        let current_supply = Self::get_supply(&env);
        Self::set_supply(&env, current_supply - shares_to_burn);
    }

    fn decimals(_env: Env) -> u32 {
        7 // USDC decimals
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
