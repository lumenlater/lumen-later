#![no_std]
use soroban_sdk::{
    contractclient, contracttype, Address, Env,
};


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

// BNPL interface for checking user debt
#[contractclient(name = "BnplCoreClient")]
pub trait BnplCoreInterface {
    fn get_user_total_debt(env: Env, user: Address) -> i128;
    fn get_user_required_collateral(env: Env, user: Address) -> i128;
    fn get_user_borrowing_power(env: Env, user: Address) -> BorrowingPower;
}