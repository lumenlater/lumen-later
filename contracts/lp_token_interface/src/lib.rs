#![no_std]
use soroban_sdk::{
    contractclient, Address, Env,
};
use soroban_token_sdk::metadata::TokenMetadata;

// BNPL interface for checking user debt
#[contractclient(name = "LPTokenClient")]
pub trait LPTokenInterface {
    fn initialize(env: Env, admin: Address, underlying_asset: Address, metadata: TokenMetadata);
    fn set_bnpl_core(env: Env, bnpl_core: Address);

    fn borrow(env: Env, to: Address, amount: i128);
    fn repay(env: Env, from: Address, amount: i128);
    fn repay_with_burn(env: Env, from: Address, amount: i128, fee: i128);
    fn get_total_assets(env: Env) -> i128;
    fn get_accumulated_yield(env: Env) -> i128;
    fn get_share_value(env: Env) -> i128;
    fn balance(env: Env, user: Address) -> i128;
    fn total_underlying(env: Env) -> i128;
    fn update_index(env: Env);

    fn deposit(env: Env, from: Address, amount: i128) -> i128;
    fn withdraw(env: Env, from: Address, lp_amount: i128) -> i128;
}