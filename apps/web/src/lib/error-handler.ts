/**
 * Enhanced error handling for new LP token restrictions
 */

export interface ErrorInfo {
  type: string;
  message: string;
  suggestion?: string;
}

export function handleContractError(error: any): ErrorInfo {
  const message = error.message || error.toString();
  
  // New LP token restriction errors
  if (message.includes('Cannot transfer: insufficient collateral')) {
    return {
      type: 'TRANSFER_RESTRICTED',
      message: 'Cannot transfer LP tokens below required collateral for outstanding loans',
      suggestion: 'Pay off some loans or transfer a smaller amount'
    };
  }
  
  if (message.includes('Cannot withdraw: insufficient collateral')) {
    return {
      type: 'WITHDRAW_RESTRICTED',
      message: 'Cannot withdraw LP tokens below required collateral for outstanding loans',
      suggestion: 'Pay off some loans or withdraw a smaller amount'
    };
  }
  
  if (message.includes('Insufficient LP token balance for total collateral')) {
    return {
      type: 'INSUFFICIENT_COLLATERAL',
      message: 'Not enough LP tokens to cover existing loans plus new loan',
      suggestion: 'Acquire more LP tokens or choose a smaller loan amount'
    };
  }
  
  if (message.includes('Insufficient collateral for outstanding debt')) {
    return {
      type: 'COLLATERAL_LOCKED',
      message: 'Your LP tokens are locked as collateral and cannot be moved',
      suggestion: 'Repay your loans to unlock your LP tokens'
    };
  }
  
  // Existing error cases
  if (message.includes('Merchant not authorized')) {
    return {
      type: 'UNAUTHORIZED_MERCHANT',
      message: 'You are not authorized as a merchant',
      suggestion: 'Contact support to register as a merchant'
    };
  }
  
  if (message.includes('Bill expired')) {
    return {
      type: 'BILL_EXPIRED',
      message: 'This bill has expired and cannot be paid',
      suggestion: 'Request a new bill from the merchant'
    };
  }
  
  if (message.includes('Loan not active')) {
    return {
      type: 'LOAN_NOT_ACTIVE',
      message: 'This loan is not active',
      suggestion: 'Check your loan status in the dashboard'
    };
  }
  
  // Generic error
  return {
    type: 'UNKNOWN_ERROR',
    message: 'An unexpected error occurred',
    suggestion: 'Please try again or contact support if the issue persists'
  };
}

export function getErrorToastData(error: any) {
  const errorInfo = handleContractError(error);
  
  return {
    title: errorInfo.message,
    description: errorInfo.suggestion,
    variant: 'destructive' as const
  };
}