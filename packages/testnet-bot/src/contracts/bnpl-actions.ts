/**
 * BNPL contract action wrappers
 */

import type { Client as BnplClient } from '@lumenlater/bnpl-core-client';
import { logger } from '../utils/logger.js';
import { createClients } from './client-factory.js';
import { usdcActions } from './usdc-actions.js';
import { config } from '../config/index.js';

export interface EnrollMerchantParams {
  merchantAccountName: string;
  merchantAddress: string;
  mongoId: string;
}

export interface UpdateMerchantStatusParams {
  adminAccountName: string;
  merchantAddress: string;
  newStatus: 'Approved' | 'Rejected' | 'Suspended';
}

export interface CreateBillParams {
  merchantAccountName: string;
  merchantAddress: string;
  userAddress: string;
  amount: bigint;
  orderId: string;
}

export interface PayBillParams {
  userAccountName: string;
  billId: bigint;
}

export interface RepayBillParams {
  userAccountName: string;
  billId: bigint;
}

export const bnplActions = {
  /**
   * Enroll a merchant on the blockchain
   */
  async enrollMerchant(params: EnrollMerchantParams): Promise<void> {
    const { merchantAccountName, merchantAddress, mongoId } = params;
    const clients = createClients(merchantAccountName);

    logger.tx('enroll_merchant', `${merchantAddress} with mongoId ${mongoId}`);

    const tx = await clients.bnpl.enroll_merchant({
      merchant: merchantAddress,
      merchant_info_id: mongoId,
    });

    await tx.signAndSend();
    logger.success('Merchant enrolled on chain');
  },

  /**
   * Update merchant status (admin only)
   */
  async updateMerchantStatus(params: UpdateMerchantStatusParams): Promise<void> {
    const { adminAccountName, merchantAddress, newStatus } = params;
    const clients = createClients(adminAccountName);
    const adminAddress = (await import('../utils/stellar-cli.js')).stellarCli.getAddress(adminAccountName);

    logger.tx('update_merchant_status', `${merchantAddress} -> ${newStatus}`);

    const tx = await clients.bnpl.update_merchant_status({
      admin: adminAddress,
      merchant: merchantAddress,
      new_status: { tag: newStatus, values: undefined } as any,
    });

    await tx.signAndSend();
    logger.success(`Merchant status updated to ${newStatus}`);
  },

  /**
   * Create a bill
   */
  async createBill(params: CreateBillParams): Promise<bigint> {
    const { merchantAccountName, merchantAddress, userAddress, amount, orderId } = params;
    const clients = createClients(merchantAccountName);

    logger.tx('create_bill', `${orderId} for ${amount} to user ${userAddress.slice(0, 8)}...`);

    const tx = await clients.bnpl.create_bill({
      merchant: merchantAddress,
      user: userAddress,
      amount,
      order_id: orderId,
    });

    const result = await tx.signAndSend();
    const billId = result.result as bigint;

    logger.success(`Bill created with ID: ${billId}`);
    return billId;
  },

  /**
   * Pay a bill using BNPL (LP collateral)
   */
  async payBillBnpl(params: PayBillParams): Promise<void> {
    const { userAccountName, billId } = params;
    const clients = createClients(userAccountName);

    logger.tx('pay_bill_bnpl', `Bill #${billId}`);

    const tx = await clients.bnpl.pay_bill_bnpl({
      bill_id: billId,
    });

    await tx.signAndSend();
    logger.success(`Bill #${billId} paid via BNPL`);
  },

  /**
   * Repay a bill
   * Note: Requires USDC approval for the BNPL contract before calling
   */
  async repayBill(params: RepayBillParams): Promise<void> {
    const { userAccountName, billId } = params;
    const clients = createClients(userAccountName);

    // Get bill details to know the repay amount
    const billTx = await clients.bnpl.get_bill({ bill_id: billId });
    const bill = billTx.result;

    if (!bill) {
      throw new Error(`Bill #${billId} not found`);
    }

    // Bill uses "principal" field for the amount
    const repayAmount = bill.principal;

    if (repayAmount <= 0n) {
      logger.info(`Bill #${billId} has no amount to repay`);
      return;
    }

    // Check bill status - should be "Paid" to repay
    if (bill.status.tag === 'Repaid') {
      logger.info(`Bill #${billId} already repaid`);
      return;
    }

    // Approve BNPL contract to spend USDC on user's behalf
    logger.info(`Approving BNPL contract to spend ${repayAmount} USDC for repayment...`);
    await usdcActions.approve({
      ownerAccountName: userAccountName,
      spenderAddress: config.contracts.bnplCoreId,
      amount: repayAmount,
    });

    logger.tx('repay_bill', `Bill #${billId}`);

    const tx = await clients.bnpl.repay_bill({
      bill_id: billId,
    });

    await tx.signAndSend();
    logger.success(`Bill #${billId} repaid`);
  },

  /**
   * Get bill details
   */
  async getBill(accountName: string, billId: bigint) {
    const clients = createClients(accountName);
    const tx = await clients.bnpl.get_bill({ bill_id: billId });
    return tx.result;
  },

  /**
   * Get user's borrowing power
   */
  async getUserBorrowingPower(accountName: string, userAddress: string) {
    const clients = createClients(accountName);
    const tx = await clients.bnpl.get_user_borrowing_power({ user: userAddress });
    return tx.result;
  },
};
