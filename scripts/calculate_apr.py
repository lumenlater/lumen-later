import sys

# Default Parameters
# These can be overridden by command-line arguments
DEFAULT_PARAMS = {
    # Pool & Loan Configuration
    'total_liquidity': 1_000_000,  # Total USDC in the Liquidity Pool
    'utilization_ratio': 0.8,      # Percentage of liquidity being used for loans
    'loan_term_days': 30,          # Average loan term in days

    # Fee Rates
    'merchant_fee_rate': 0.015,    # 1.5% fee charged to the merchant
    'late_interest_apr': 0.30,     # 30% APR for late payments
    'liquidation_penalty_rate': 0.05, # 5% penalty on the outstanding debt upon liquidation

    # Risk & Behavior Assumptions
    'delinquency_rate': 0.05,      # 5% of loans become delinquent (late)
    'liquidation_rate': 0.10,      # 10% of delinquent loans are liquidated

    # Fee Distribution Ratios (must sum to 1.0 for each category)
    'merchant_fee_dist': {
        'lp_yield': 0.7,         # 70% to LP yield
        'treasury': 0.15,        # 15% to Treasury
        'insurance_fund': 0.15,  # 15% to Insurance Fund
    },
    'late_fee_dist': {
        'lp_yield': 0.8,         # 80% to LP yield
        'treasury': 0.1,         # 10% to Treasury
        'insurance_fund': 0.1,   # 10% to Insurance Fund
    },
    'liquidation_penalty_dist': {
        'liquidator': 0.5,       # 50% to the liquidator as an incentive
        'lp_yield': 0.2,         # 20% to LP yield
        'treasury': 0.15,        # 15% to Treasury
        'insurance_fund': 0.15,  # 15% to Insurance Fund
    },
}

def calculate_apr(params):
    """
    Calculates the APR for LPs and revenues for other components based on protocol parameters.
    """
    # --- Calculated Variables ---
    lent_amount = params['total_liquidity'] * params['utilization_ratio']
    # How many times the loan portfolio turns over in a year
    loan_cycles_per_year = 365 / params['loan_term_days']
    # Total value of loans issued in a year
    total_annual_loan_volume = lent_amount * loan_cycles_per_year

    # --- Revenue Calculations ---

    # 1. Merchant Fee Revenue
    total_merchant_fee = total_annual_loan_volume * params['merchant_fee_rate']

    # 2. Late Interest Revenue
    # Volume of loans that become late annually
    delinquent_volume = total_annual_loan_volume * params['delinquency_rate']
    # We assume late interest is paid for one loan term on average before repayment or liquidation
    avg_late_period_in_years = params['loan_term_days'] / 365
    total_late_interest = delinquent_volume * params['late_interest_apr'] * avg_late_period_in_years

    # 3. Liquidation Penalty Revenue
    # Volume of loans that get liquidated annually
    liquidated_volume = delinquent_volume * params['liquidation_rate']
    total_liquidation_penalty = liquidated_volume * params['liquidation_penalty_rate']

    # --- Revenue Distribution ---
    dist_merchant = params['merchant_fee_dist']
    dist_late = params['late_fee_dist']
    dist_liq = params['liquidation_penalty_dist']

    # Calculate total revenue for each component
    lp_revenue = (
        total_merchant_fee * dist_merchant['lp_yield'] +
        total_late_interest * dist_late['lp_yield'] +
        total_liquidation_penalty * dist_liq['lp_yield']
    )

    treasury_revenue = (
        total_merchant_fee * dist_merchant['treasury'] +
        total_late_interest * dist_late['treasury'] +
        total_liquidation_penalty * dist_liq['treasury']
    )

    insurance_fund_revenue = (
        total_merchant_fee * dist_merchant['insurance_fund'] +
        total_late_interest * dist_late['insurance_fund'] +
        total_liquidation_penalty * dist_liq['insurance_fund']
    )

    liquidator_revenue = total_liquidation_penalty * dist_liq['liquidator']

    # --- Final APR/APY Calculation ---
    # APR is calculated based on the total liquidity provided, not just the utilized part
    lp_apr = (lp_revenue / params['total_liquidity']) * 100

    # --- Output Results ---
    print("\n📊 BNPL Protocol APR & Revenue Simulation")
    print("-" * 50)
    print(f"{'> Pool Size:':<30} ${params['total_liquidity']:,.2f}")
    print(f"{'> Utilization:':<30} {params['utilization_ratio'] * 100:.2f}%")
    print(f"{'> Annual Loan Volume:':<30} ${total_annual_loan_volume:,.2f}")
    print("-" * 50)
    print(f"\033[1m\033[92m{'>> LP APR:':<30} {lp_apr:.4f}%\033[0m")
    print("-" * 50)
    print("\n💰 Annual Revenue Breakdown")
    print("-" * 50)
    print(f"{'> LP Yield:':<30} ${lp_revenue:,.2f}")
    print(f"{'> Treasury:':<30} ${treasury_revenue:,.2f}")
    print(f"{'> Insurance Fund:':<30} ${insurance_fund_revenue:,.2f}")
    print(f"{'> Liquidators:':<30} ${liquidator_revenue:,.2f}")
    print("-" * 50)


if __name__ == "__main__":
    # You can run this script with arguments like:
    # python calculate_apr.py utilization_ratio=0.9 delinquency_rate=0.1
    params = DEFAULT_PARAMS.copy()
    try:
        for arg in sys.argv[1:]:
            key, value = arg.split('=')
            if key in params and isinstance(params[key], (int, float)):
                params[key] = float(value)
            else:
                print(f"Warning: Ignoring invalid or non-numeric parameter '{key}'")
    except ValueError:
        print("Error: Invalid argument format. Please use key=value.")
        sys.exit(1)

    calculate_apr(params)
