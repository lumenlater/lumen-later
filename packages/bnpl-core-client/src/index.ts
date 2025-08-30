import { Buffer } from "buffer";
import { Address } from '@stellar/stellar-sdk';
import {
  AssembledTransaction,
  Client as ContractClient,
  ClientOptions as ContractClientOptions,
  MethodOptions,
  Result,
  Spec as ContractSpec,
} from '@stellar/stellar-sdk/contract';
import type {
  u32,
  i32,
  u64,
  i64,
  u128,
  i128,
  u256,
  i256,
  Option,
  Typepoint,
  Duration,
} from '@stellar/stellar-sdk/contract';
export * from '@stellar/stellar-sdk'
export * as contract from '@stellar/stellar-sdk/contract'
export * as rpc from '@stellar/stellar-sdk/rpc'

if (typeof window !== 'undefined') {
  //@ts-ignore Buffer exists
  window.Buffer = window.Buffer || Buffer;
}


export const networks = {
  testnet: {
    networkPassphrase: "Test SDF Network ; September 2015",
    contractId: "CC7KPNSQWP2FKOAXMDI7LN7FREPJNQM44QO4VAL5WDDCAV4OC2YDGOWY",
  }
} as const

export type DataKey = {tag: "Config", values: void} | {tag: "MerchantData", values: readonly [string]} | {tag: "BillCounter", values: void} | {tag: "Bill", values: readonly [u64]} | {tag: "UserBills", values: readonly [string]};


export interface Config {
  admin: string;
  insurance_fund: string;
  liquidity_pool: string;
  treasury: string;
  usdc_token: string;
}


export interface MerchantData {
  merchant_info_id: string;
  status: MerchantStatus;
}

export type MerchantStatus = {tag: "None", values: void} | {tag: "Pending", values: void} | {tag: "Approved", values: void} | {tag: "Rejected", values: void} | {tag: "Suspended", values: void} | {tag: "Cancelled", values: void};


export interface Bill {
  created_at: u64;
  id: u64;
  merchant: string;
  order_id: string;
  paid_at: u64;
  principal: i128;
  status: BillStatus;
  user: string;
}

export type BillStatus = {tag: "None", values: void} | {tag: "Created", values: void} | {tag: "Expired", values: void} | {tag: "Paid", values: void} | {tag: "Repaid", values: void} | {tag: "Overdue", values: void} | {tag: "Liquidated", values: void};


export interface BorrowingPower {
  available_borrowing: i128;
  current_borrowed: i128;
  current_debt: i128;
  lp_balance: i128;
  max_borrowing: i128;
  overall_health_factor: i128;
  required_collateral: i128;
}


export interface MerchantEnrolledEvent {
  merchant: string;
  merchant_info_id: string;
  timestamp: u64;
}


export interface MerchantStatusUpdatedEvent {
  merchant: string;
  new_status: MerchantStatus;
  old_status: MerchantStatus;
  timestamp: u64;
}


export interface PaymentCompletedEvent {
  bill_id: u64;
  merchant: string;
  total_paid: i128;
  user: string;
}


export interface RepaymentEvent {
  amount_paid: i128;
  bill_id: u64;
  timestamp: u64;
  user: string;
}


export interface BillCreatedEvent {
  amount: i128;
  bill_id: u64;
  created_at: u64;
  merchant: string;
  order_id: string;
  user: string;
}


export interface LiquidationEvent {
  bill_id: u64;
  liquidator: string;
  total_liquidated: i128;
}

export const Errors = {
  1: {message:"AlreadyInitialized"},
  2: {message:"NotInitialized"},
  11: {message:"NotAdmin"},
  12: {message:"AdminAlreadySet"},
  13: {message:"CannotRemoveItself"},
  20: {message:"BillNotFound"},
  21: {message:"BillNotPayable"},
  22: {message:"BillNotPaid"},
  23: {message:"BillExpired"},
  24: {message:"LiquidationNotPossible"},
  25: {message:"InvalidAmount"},
  41: {message:"InvalidInstallmentNumber"},
  42: {message:"InsufficientCollateralForLiquidation"},
  43: {message:"GracePeriodNotExpired"},
  44: {message:"NonLpTokenHolder"},
  100: {message:"InvalidInput"},
  101: {message:"InternalError"},
  110: {message:"MerchantAlreadyEnrolled"},
  111: {message:"MerchantNotFound"},
  112: {message:"MerchantNotApproved"}
}


export interface TokenMetadata {
  decimal: u32;
  name: string;
  symbol: string;
}

export interface Client {
  /**
   * Construct and simulate a initialize transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  initialize: ({liquidity_pool, usdc_token, admin, treasury, insurance_fund}: {liquidity_pool: string, usdc_token: string, admin: string, treasury: string, insurance_fund: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a get_config transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_config: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Config>>

  /**
   * Construct and simulate a is_admin transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  is_admin: ({address}: {address: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<boolean>>

  /**
   * Construct and simulate a enroll_merchant transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Enroll a new merchant with application ID
   */
  enroll_merchant: ({merchant, merchant_info_id}: {merchant: string, merchant_info_id: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a update_merchant_status transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Update merchant status (admin only)
   */
  update_merchant_status: ({admin, merchant, new_status}: {admin: string, merchant: string, new_status: MerchantStatus}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a get_merchant transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get merchant data by address
   */
  get_merchant: ({merchant}: {merchant: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<MerchantData>>

  /**
   * Construct and simulate a create_bill transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  create_bill: ({merchant, user, amount, order_id}: {merchant: string, user: string, amount: i128, order_id: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<u64>>

  /**
   * Construct and simulate a get_bill transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_bill: ({bill_id}: {bill_id: u64}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Bill>>

  /**
   * Construct and simulate a get_user_bills transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_user_bills: ({user}: {user: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Array<u64>>>

  /**
   * Construct and simulate a pay_bill_bnpl transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  pay_bill_bnpl: ({bill_id}: {bill_id: u64}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a repay_bill transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  repay_bill: ({bill_id}: {bill_id: u64}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a liquidate_bill transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  liquidate_bill: ({bill_id, liquidator}: {bill_id: u64, liquidator: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a get_user_total_debt transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_user_total_debt: ({user}: {user: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<readonly [i128, i128]>>

  /**
   * Construct and simulate a get_user_required_collateral transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_user_required_collateral: ({user}: {user: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<i128>>

  /**
   * Construct and simulate a get_user_borrowing_power transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_user_borrowing_power: ({user}: {user: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<BorrowingPower>>

  /**
   * Construct and simulate a get_protocol_constants transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_protocol_constants: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Map<string, i128>>>

}
export class Client extends ContractClient {
  static async deploy<T = Client>(
    /** Options for initializing a Client as well as for calling a method, with extras specific to deploying. */
    options: MethodOptions &
      Omit<ContractClientOptions, "contractId"> & {
        /** The hash of the Wasm blob, which must already be installed on-chain. */
        wasmHash: Buffer | string;
        /** Salt used to generate the contract's ID. Passed through to {@link Operation.createCustomContract}. Default: random. */
        salt?: Buffer | Uint8Array;
        /** The format used to decode `wasmHash`, if it's provided as a string. */
        format?: "hex" | "base64";
      }
  ): Promise<AssembledTransaction<T>> {
    return ContractClient.deploy(null, options)
  }
  constructor(public readonly options: ContractClientOptions) {
    super(
      new ContractSpec([ "AAAAAgAAAAAAAAAAAAAAB0RhdGFLZXkAAAAABQAAAAAAAAAAAAAABkNvbmZpZwAAAAAAAQAAAAAAAAAMTWVyY2hhbnREYXRhAAAAAQAAABMAAAAAAAAAAAAAAAtCaWxsQ291bnRlcgAAAAABAAAAAAAAAARCaWxsAAAAAQAAAAYAAAABAAAAAAAAAAlVc2VyQmlsbHMAAAAAAAABAAAAEw==",
        "AAAAAQAAAAAAAAAAAAAABkNvbmZpZwAAAAAABQAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAAAAAA5pbnN1cmFuY2VfZnVuZAAAAAAAEwAAAAAAAAAObGlxdWlkaXR5X3Bvb2wAAAAAABMAAAAAAAAACHRyZWFzdXJ5AAAAEwAAAAAAAAAKdXNkY190b2tlbgAAAAAAEw==",
        "AAAAAQAAAAAAAAAAAAAADE1lcmNoYW50RGF0YQAAAAIAAAAAAAAAEG1lcmNoYW50X2luZm9faWQAAAAQAAAAAAAAAAZzdGF0dXMAAAAAB9AAAAAOTWVyY2hhbnRTdGF0dXMAAA==",
        "AAAAAgAAAAAAAAAAAAAADk1lcmNoYW50U3RhdHVzAAAAAAAGAAAAAAAAAAAAAAAETm9uZQAAAAAAAAAAAAAAB1BlbmRpbmcAAAAAAAAAAAAAAAAIQXBwcm92ZWQAAAAAAAAAAAAAAAhSZWplY3RlZAAAAAAAAAAAAAAACVN1c3BlbmRlZAAAAAAAAAAAAAAAAAAACUNhbmNlbGxlZAAAAA==",
        "AAAAAQAAAAAAAAAAAAAABEJpbGwAAAAIAAAAAAAAAApjcmVhdGVkX2F0AAAAAAAGAAAAAAAAAAJpZAAAAAAABgAAAAAAAAAIbWVyY2hhbnQAAAATAAAAAAAAAAhvcmRlcl9pZAAAABAAAAAAAAAAB3BhaWRfYXQAAAAABgAAAAAAAAAJcHJpbmNpcGFsAAAAAAAACwAAAAAAAAAGc3RhdHVzAAAAAAfQAAAACkJpbGxTdGF0dXMAAAAAAAAAAAAEdXNlcgAAABM=",
        "AAAAAgAAAAAAAAAAAAAACkJpbGxTdGF0dXMAAAAAAAcAAAAAAAAAAAAAAAROb25lAAAAAAAAAAAAAAAHQ3JlYXRlZAAAAAAAAAAAAAAAAAdFeHBpcmVkAAAAAAAAAAAAAAAABFBhaWQAAAAAAAAAAAAAAAZSZXBhaWQAAAAAAAAAAAAAAAAAB092ZXJkdWUAAAAAAAAAAAAAAAAKTGlxdWlkYXRlZAAA",
        "AAAAAQAAAAAAAAAAAAAADkJvcnJvd2luZ1Bvd2VyAAAAAAAHAAAAAAAAABNhdmFpbGFibGVfYm9ycm93aW5nAAAAAAsAAAAAAAAAEGN1cnJlbnRfYm9ycm93ZWQAAAALAAAAAAAAAAxjdXJyZW50X2RlYnQAAAALAAAAAAAAAApscF9iYWxhbmNlAAAAAAALAAAAAAAAAA1tYXhfYm9ycm93aW5nAAAAAAAACwAAAAAAAAAVb3ZlcmFsbF9oZWFsdGhfZmFjdG9yAAAAAAAACwAAAAAAAAATcmVxdWlyZWRfY29sbGF0ZXJhbAAAAAAL",
        "AAAAAQAAAAAAAAAAAAAAFU1lcmNoYW50RW5yb2xsZWRFdmVudAAAAAAAAAMAAAAAAAAACG1lcmNoYW50AAAAEwAAAAAAAAAQbWVyY2hhbnRfaW5mb19pZAAAABAAAAAAAAAACXRpbWVzdGFtcAAAAAAAAAY=",
        "AAAAAQAAAAAAAAAAAAAAGk1lcmNoYW50U3RhdHVzVXBkYXRlZEV2ZW50AAAAAAAEAAAAAAAAAAhtZXJjaGFudAAAABMAAAAAAAAACm5ld19zdGF0dXMAAAAAB9AAAAAOTWVyY2hhbnRTdGF0dXMAAAAAAAAAAAAKb2xkX3N0YXR1cwAAAAAH0AAAAA5NZXJjaGFudFN0YXR1cwAAAAAAAAAAAAl0aW1lc3RhbXAAAAAAAAAG",
        "AAAAAQAAAAAAAAAAAAAAFVBheW1lbnRDb21wbGV0ZWRFdmVudAAAAAAAAAQAAAAAAAAAB2JpbGxfaWQAAAAABgAAAAAAAAAIbWVyY2hhbnQAAAATAAAAAAAAAAp0b3RhbF9wYWlkAAAAAAALAAAAAAAAAAR1c2VyAAAAEw==",
        "AAAAAQAAAAAAAAAAAAAADlJlcGF5bWVudEV2ZW50AAAAAAAEAAAAAAAAAAthbW91bnRfcGFpZAAAAAALAAAAAAAAAAdiaWxsX2lkAAAAAAYAAAAAAAAACXRpbWVzdGFtcAAAAAAAAAYAAAAAAAAABHVzZXIAAAAT",
        "AAAAAQAAAAAAAAAAAAAAEEJpbGxDcmVhdGVkRXZlbnQAAAAGAAAAAAAAAAZhbW91bnQAAAAAAAsAAAAAAAAAB2JpbGxfaWQAAAAABgAAAAAAAAAKY3JlYXRlZF9hdAAAAAAABgAAAAAAAAAIbWVyY2hhbnQAAAATAAAAAAAAAAhvcmRlcl9pZAAAABAAAAAAAAAABHVzZXIAAAAT",
        "AAAAAQAAAAAAAAAAAAAAEExpcXVpZGF0aW9uRXZlbnQAAAADAAAAAAAAAAdiaWxsX2lkAAAAAAYAAAAAAAAACmxpcXVpZGF0b3IAAAAAABMAAAAAAAAAEHRvdGFsX2xpcXVpZGF0ZWQAAAAL",
        "AAAABAAAAAAAAAAAAAAABUVycm9yAAAAAAAAFAAAAAAAAAASQWxyZWFkeUluaXRpYWxpemVkAAAAAAABAAAAAAAAAA5Ob3RJbml0aWFsaXplZAAAAAAAAgAAAAAAAAAITm90QWRtaW4AAAALAAAAAAAAAA9BZG1pbkFscmVhZHlTZXQAAAAADAAAAAAAAAASQ2Fubm90UmVtb3ZlSXRzZWxmAAAAAAANAAAAAAAAAAxCaWxsTm90Rm91bmQAAAAUAAAAAAAAAA5CaWxsTm90UGF5YWJsZQAAAAAAFQAAAAAAAAALQmlsbE5vdFBhaWQAAAAAFgAAAAAAAAALQmlsbEV4cGlyZWQAAAAAFwAAAAAAAAAWTGlxdWlkYXRpb25Ob3RQb3NzaWJsZQAAAAAAGAAAAAAAAAANSW52YWxpZEFtb3VudAAAAAAAABkAAAAAAAAAGEludmFsaWRJbnN0YWxsbWVudE51bWJlcgAAACkAAAAAAAAAJEluc3VmZmljaWVudENvbGxhdGVyYWxGb3JMaXF1aWRhdGlvbgAAACoAAAAAAAAAFUdyYWNlUGVyaW9kTm90RXhwaXJlZAAAAAAAACsAAAAAAAAAEE5vbkxwVG9rZW5Ib2xkZXIAAAAsAAAAAAAAAAxJbnZhbGlkSW5wdXQAAABkAAAAAAAAAA1JbnRlcm5hbEVycm9yAAAAAAAAZQAAAAAAAAAXTWVyY2hhbnRBbHJlYWR5RW5yb2xsZWQAAAAAbgAAAAAAAAAQTWVyY2hhbnROb3RGb3VuZAAAAG8AAAAAAAAAE01lcmNoYW50Tm90QXBwcm92ZWQAAAAAcA==",
        "AAAAAAAAAAAAAAAKaW5pdGlhbGl6ZQAAAAAABQAAAAAAAAAObGlxdWlkaXR5X3Bvb2wAAAAAABMAAAAAAAAACnVzZGNfdG9rZW4AAAAAABMAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAAIdHJlYXN1cnkAAAATAAAAAAAAAA5pbnN1cmFuY2VfZnVuZAAAAAAAEwAAAAA=",
        "AAAAAAAAAAAAAAAKZ2V0X2NvbmZpZwAAAAAAAAAAAAEAAAfQAAAABkNvbmZpZwAA",
        "AAAAAAAAAAAAAAAIaXNfYWRtaW4AAAABAAAAAAAAAAdhZGRyZXNzAAAAABMAAAABAAAAAQ==",
        "AAAAAAAAAClFbnJvbGwgYSBuZXcgbWVyY2hhbnQgd2l0aCBhcHBsaWNhdGlvbiBJRAAAAAAAAA9lbnJvbGxfbWVyY2hhbnQAAAAAAgAAAAAAAAAIbWVyY2hhbnQAAAATAAAAAAAAABBtZXJjaGFudF9pbmZvX2lkAAAAEAAAAAEAAAPpAAAD7QAAAAAAAAAD",
        "AAAAAAAAACNVcGRhdGUgbWVyY2hhbnQgc3RhdHVzIChhZG1pbiBvbmx5KQAAAAAWdXBkYXRlX21lcmNoYW50X3N0YXR1cwAAAAAAAwAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAAAAAAhtZXJjaGFudAAAABMAAAAAAAAACm5ld19zdGF0dXMAAAAAB9AAAAAOTWVyY2hhbnRTdGF0dXMAAAAAAAEAAAPpAAAD7QAAAAAAAAAD",
        "AAAAAAAAABxHZXQgbWVyY2hhbnQgZGF0YSBieSBhZGRyZXNzAAAADGdldF9tZXJjaGFudAAAAAEAAAAAAAAACG1lcmNoYW50AAAAEwAAAAEAAAfQAAAADE1lcmNoYW50RGF0YQ==",
        "AAAAAAAAAAAAAAALY3JlYXRlX2JpbGwAAAAABAAAAAAAAAAIbWVyY2hhbnQAAAATAAAAAAAAAAR1c2VyAAAAEwAAAAAAAAAGYW1vdW50AAAAAAALAAAAAAAAAAhvcmRlcl9pZAAAABAAAAABAAAABg==",
        "AAAAAAAAAAAAAAAIZ2V0X2JpbGwAAAABAAAAAAAAAAdiaWxsX2lkAAAAAAYAAAABAAAH0AAAAARCaWxs",
        "AAAAAAAAAAAAAAAOZ2V0X3VzZXJfYmlsbHMAAAAAAAEAAAAAAAAABHVzZXIAAAATAAAAAQAAA+oAAAAG",
        "AAAAAAAAAAAAAAANcGF5X2JpbGxfYm5wbAAAAAAAAAEAAAAAAAAAB2JpbGxfaWQAAAAABgAAAAA=",
        "AAAAAAAAAAAAAAAKcmVwYXlfYmlsbAAAAAAAAQAAAAAAAAAHYmlsbF9pZAAAAAAGAAAAAA==",
        "AAAAAAAAAAAAAAAObGlxdWlkYXRlX2JpbGwAAAAAAAIAAAAAAAAAB2JpbGxfaWQAAAAABgAAAAAAAAAKbGlxdWlkYXRvcgAAAAAAEwAAAAA=",
        "AAAAAAAAAAAAAAATZ2V0X3VzZXJfdG90YWxfZGVidAAAAAABAAAAAAAAAAR1c2VyAAAAEwAAAAEAAAPtAAAAAgAAAAsAAAAL",
        "AAAAAAAAAAAAAAAcZ2V0X3VzZXJfcmVxdWlyZWRfY29sbGF0ZXJhbAAAAAEAAAAAAAAABHVzZXIAAAATAAAAAQAAAAs=",
        "AAAAAAAAAAAAAAAYZ2V0X3VzZXJfYm9ycm93aW5nX3Bvd2VyAAAAAQAAAAAAAAAEdXNlcgAAABMAAAABAAAH0AAAAA5Cb3Jyb3dpbmdQb3dlcgAA",
        "AAAAAAAAAAAAAAAWZ2V0X3Byb3RvY29sX2NvbnN0YW50cwAAAAAAAAAAAAEAAAPsAAAAEAAAAAs=",
        "AAAAAQAAAAAAAAAAAAAADVRva2VuTWV0YWRhdGEAAAAAAAADAAAAAAAAAAdkZWNpbWFsAAAAAAQAAAAAAAAABG5hbWUAAAAQAAAAAAAAAAZzeW1ib2wAAAAAABA=" ]),
      options
    )
  }
  public readonly fromJSON = {
    initialize: this.txFromJSON<null>,
        get_config: this.txFromJSON<Config>,
        is_admin: this.txFromJSON<boolean>,
        enroll_merchant: this.txFromJSON<Result<void>>,
        update_merchant_status: this.txFromJSON<Result<void>>,
        get_merchant: this.txFromJSON<MerchantData>,
        create_bill: this.txFromJSON<u64>,
        get_bill: this.txFromJSON<Bill>,
        get_user_bills: this.txFromJSON<Array<u64>>,
        pay_bill_bnpl: this.txFromJSON<null>,
        repay_bill: this.txFromJSON<null>,
        liquidate_bill: this.txFromJSON<null>,
        get_user_total_debt: this.txFromJSON<readonly [i128, i128]>,
        get_user_required_collateral: this.txFromJSON<i128>,
        get_user_borrowing_power: this.txFromJSON<BorrowingPower>,
        get_protocol_constants: this.txFromJSON<Map<string, i128>>
  }
}