use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    // Initialization errors
    AlreadyInitialized = 1,
    NotInitialized = 2,
    
    // Authorization errors
    NotAdmin = 11,
    AdminAlreadySet = 12,
    CannotRemoveItself = 13,
    
    // Bill errors
    BillNotFound = 20,
    BillNotPayable = 21,
    BillNotPaid = 22,
    BillExpired = 23,
    LiquidationNotPossible = 24,
    InvalidAmount = 25,
    
    // Liquidation errors
    InvalidInstallmentNumber = 41,
    InsufficientCollateralForLiquidation = 42,
    GracePeriodNotExpired = 43,
    NonLpTokenHolder = 44,
    
    // General errors
    InvalidInput = 100,
    InternalError = 101,
    
    // Merchant errors
    MerchantAlreadyEnrolled = 110,
    MerchantNotFound = 111,
    MerchantNotApproved = 112,
}