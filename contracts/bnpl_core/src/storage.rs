use soroban_sdk::{contracttype, Address, Env, Vec};
use crate::types::{Config, Bill, MerchantData, MerchantStatus};

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    // Configuration
    Config,
    
    // Simplified Merchant Data
    MerchantData(Address),

    // Counters
    BillCounter,
    
    // Bills
    Bill(u64),
    UserBills(Address),
    
}

// === CONFIG FUNCTIONS ===

pub fn has_config(env: &Env) -> bool {
    env.storage().instance().has(&DataKey::Config)
}

pub fn get_config(env: &Env) -> Config {
    env.storage().instance().get(&DataKey::Config).unwrap()
}

pub fn set_config(env: &Env, config: &Config) {
    env.storage().instance().set(&DataKey::Config, config);
}

// === MERCHANT STATUS FUNCTIONS ===

pub fn get_merchant_data(env: &Env, merchant: &Address) -> Option<MerchantData> {
    env.storage().persistent().get(&DataKey::MerchantData(merchant.clone()))
}

pub fn set_merchant_data(env: &Env, merchant: &Address, data: &MerchantData) {
    env.storage().persistent().set(&DataKey::MerchantData(merchant.clone()), data);
}

pub fn is_merchant_approved(env: &Env, merchant: &Address) -> bool {
    get_merchant_data(env, merchant).is_some() && get_merchant_data(env, merchant).unwrap().status == MerchantStatus::Approved
}

// === COUNTER FUNCTIONS ===

pub fn get_bill_counter(env: &Env) -> u64 {
    env.storage().persistent().get(&DataKey::BillCounter).unwrap_or(1)
}

pub fn set_bill_counter(env: &Env, counter: u64) {
    env.storage().persistent().set(&DataKey::BillCounter, &counter);
}

// === BILL FUNCTIONS ===

pub fn get_bill(env: &Env, bill_id: u64) -> Bill {
    env.storage().persistent().get(&DataKey::Bill(bill_id)).unwrap()
}

pub fn set_bill(env: &Env, bill_id: u64, bill: &Bill) {
    env.storage().persistent().set(&DataKey::Bill(bill_id), bill);
}

pub fn has_bill(env: &Env, bill_id: u64) -> bool {
    env.storage().persistent().has(&DataKey::Bill(bill_id))
}

pub fn get_user_bills(env: &Env, user: &Address) -> Vec<u64> {
    env.storage().persistent().get(&DataKey::UserBills(user.clone())).unwrap_or(Vec::new(env))
}

pub fn set_user_bills(env: &Env, user: &Address, bills: &Vec<u64>) {
    env.storage().persistent().set(&DataKey::UserBills(user.clone()), bills);
}

