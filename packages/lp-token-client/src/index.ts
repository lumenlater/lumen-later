import { Buffer } from "buffer";
import { Address } from "@stellar/stellar-sdk";
import {
  AssembledTransaction,
  Client as ContractClient,
  ClientOptions as ContractClientOptions,
  MethodOptions,
  Result,
  Spec as ContractSpec,
} from "@stellar/stellar-sdk/contract";
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
  Timepoint,
  Duration,
} from "@stellar/stellar-sdk/contract";
export * from "@stellar/stellar-sdk";
export * as contract from "@stellar/stellar-sdk/contract";
export * as rpc from "@stellar/stellar-sdk/rpc";

if (typeof window !== "undefined") {
  //@ts-ignore Buffer exists
  window.Buffer = window.Buffer || Buffer;
}


export const networks = {
  testnet: {
    networkPassphrase: "Test SDF Network ; September 2015",
    contractId: "CD52BXRSLRWICSTICLJKRNVT4R2EH54HGHYQIYKRCBOY35TOQ47AD2XS",
  }
} as const


export interface DepositEvent {
  amount: i128;
  shares_minted: u128;
  user: string;
}


export interface WithdrawEvent {
  amount: i128;
  shares_burned: u128;
  user: string;
}


export interface BorrowEvent {
  amount: i128;
  borrower: string;
}


export interface RepayEvent {
  amount: i128;
  repayer: string;
}


export interface LiquidationBurnEvent {
  amount_burned: i128;
  fee: i128;
  user: string;
}


export interface BorrowingPower {
  available_borrowing: i128;
  current_borrowed: i128;
  current_debt: i128;
  lp_balance: i128;
  max_borrowing: i128;
  overall_health_factor: i128;
  required_collateral: i128;
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
  initialize: ({admin, underlying_asset, metadata}: {admin: string, underlying_asset: string, metadata: TokenMetadata}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a update_index transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Update the index based on current underlying balance vs LP supply
   * This distributes any excess underlying tokens to all LP holders proportionally
   * 
   * Call this after sending tokens to the contract to distribute them as yield
   */
  update_index: (options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a deposit transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Deposit underlying assets and receive LP tokens
   * Returns the amount of LP tokens (USDC value) credited to the user
   */
  deposit: ({from, amount}: {from: string, amount: i128}, options?: MethodOptions) => Promise<AssembledTransaction<i128>>

  /**
   * Construct and simulate a withdraw transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Withdraw LP tokens and receive underlying assets
   * amount: The USDC value to withdraw (same as balance() units)
   * Returns the actual USDC amount received
   */
  withdraw: ({from, amount}: {from: string, amount: i128}, options?: MethodOptions) => Promise<AssembledTransaction<i128>>

  /**
   * Construct and simulate a exchange_rate transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get the current exchange rate (index)
   * 1 share = index / DECIMALS USDC
   */
  exchange_rate: (options?: MethodOptions) => Promise<AssembledTransaction<u128>>

  /**
   * Construct and simulate a underlying_asset transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get the underlying asset address
   */
  underlying_asset: (options?: MethodOptions) => Promise<AssembledTransaction<string>>

  /**
   * Construct and simulate a total_underlying transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get total underlying assets held by the contract
   */
  total_underlying: (options?: MethodOptions) => Promise<AssembledTransaction<i128>>

  /**
   * Construct and simulate a set_bnpl_core transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Set the BNPL Core contract address (admin only)
   */
  set_bnpl_core: ({bnpl_core}: {bnpl_core: string}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a get_bnpl_core transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get the BNPL Core contract address
   */
  get_bnpl_core: (options?: MethodOptions) => Promise<AssembledTransaction<Option<string>>>

  /**
   * Construct and simulate a borrow transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Borrow underlying assets (BNPL Core only)
   */
  borrow: ({to, amount}: {to: string, amount: i128}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a repay transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Repay borrowed amount (BNPL Core only)
   */
  repay: ({from, amount}: {from: string, amount: i128}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a total_borrowed transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get total amount borrowed
   */
  total_borrowed: (options?: MethodOptions) => Promise<AssembledTransaction<u128>>

  /**
   * Construct and simulate a repay_with_burn transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Repay with burn for liquidation (BNPL Core only)
   */
  repay_with_burn: ({from, amount, fee}: {from: string, amount: i128, fee: i128}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a utilization_ratio transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Calculate utilization ratio (borrowed / total_deposits)
   * Returns basis points (10000 = 100%)
   */
  utilization_ratio: (options?: MethodOptions) => Promise<AssembledTransaction<u32>>

  /**
   * Construct and simulate a get_locked_balance transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get locked LP tokens for a user based on BNPL Core requirements
   */
  get_locked_balance: ({user}: {user: string}, options?: MethodOptions) => Promise<AssembledTransaction<i128>>

  /**
   * Construct and simulate a available_balance transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get available balance (total balance - locked balance)
   */
  available_balance: ({user}: {user: string}, options?: MethodOptions) => Promise<AssembledTransaction<i128>>

  /**
   * Construct and simulate a get_balance_info transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get user balance info (total, locked, available)
   */
  get_balance_info: ({user}: {user: string}, options?: MethodOptions) => Promise<AssembledTransaction<readonly [i128, i128, i128]>>

  /**
   * Construct and simulate a mint transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  mint: ({to, amount}: {to: string, amount: i128}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a metadata transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  metadata: (options?: MethodOptions) => Promise<AssembledTransaction<TokenMetadata>>

  /**
   * Construct and simulate a total_supply transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Total supply in USDC value (not raw shares)
   */
  total_supply: (options?: MethodOptions) => Promise<AssembledTransaction<i128>>

  /**
   * Construct and simulate a raw_shares transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get user's raw shares (for debugging/transparency)
   */
  raw_shares: ({user}: {user: string}, options?: MethodOptions) => Promise<AssembledTransaction<u128>>

  /**
   * Construct and simulate a total_raw_shares transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get total raw shares (for debugging/transparency)
   */
  total_raw_shares: (options?: MethodOptions) => Promise<AssembledTransaction<u128>>

  /**
   * Construct and simulate a balance transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Balance in USDC value (shares * index / DECIMALS)
   */
  balance: ({user}: {user: string}, options?: MethodOptions) => Promise<AssembledTransaction<i128>>

  /**
   * Construct and simulate a allowance transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  allowance: ({from, spender}: {from: string, spender: string}, options?: MethodOptions) => Promise<AssembledTransaction<i128>>

  /**
   * Construct and simulate a approve transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  approve: ({from, spender, amount, expiration_ledger}: {from: string, spender: string, amount: i128, expiration_ledger: u32}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a transfer transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  transfer: ({from, to, amount}: {from: string, to: string, amount: i128}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a transfer_from transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  transfer_from: ({spender, from, to, amount}: {spender: string, from: string, to: string, amount: i128}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a burn transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  burn: ({from, amount}: {from: string, amount: i128}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a burn_from transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  burn_from: ({spender, from, amount}: {spender: string, from: string, amount: i128}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a decimals transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  decimals: (options?: MethodOptions) => Promise<AssembledTransaction<u32>>

  /**
   * Construct and simulate a name transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  name: (options?: MethodOptions) => Promise<AssembledTransaction<string>>

  /**
   * Construct and simulate a symbol transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  symbol: (options?: MethodOptions) => Promise<AssembledTransaction<string>>

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
      new ContractSpec([ "AAAAAQAAAAAAAAAAAAAADERlcG9zaXRFdmVudAAAAAMAAAAAAAAABmFtb3VudAAAAAAACwAAAAAAAAANc2hhcmVzX21pbnRlZAAAAAAAAAoAAAAAAAAABHVzZXIAAAAT",
        "AAAAAQAAAAAAAAAAAAAADVdpdGhkcmF3RXZlbnQAAAAAAAADAAAAAAAAAAZhbW91bnQAAAAAAAsAAAAAAAAADXNoYXJlc19idXJuZWQAAAAAAAAKAAAAAAAAAAR1c2VyAAAAEw==",
        "AAAAAQAAAAAAAAAAAAAAC0JvcnJvd0V2ZW50AAAAAAIAAAAAAAAABmFtb3VudAAAAAAACwAAAAAAAAAIYm9ycm93ZXIAAAAT",
        "AAAAAQAAAAAAAAAAAAAAClJlcGF5RXZlbnQAAAAAAAIAAAAAAAAABmFtb3VudAAAAAAACwAAAAAAAAAHcmVwYXllcgAAAAAT",
        "AAAAAQAAAAAAAAAAAAAAFExpcXVpZGF0aW9uQnVybkV2ZW50AAAAAwAAAAAAAAANYW1vdW50X2J1cm5lZAAAAAAAAAsAAAAAAAAAA2ZlZQAAAAALAAAAAAAAAAR1c2VyAAAAEw==",
        "AAAAAAAAAAAAAAAKaW5pdGlhbGl6ZQAAAAAAAwAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAAAAABB1bmRlcmx5aW5nX2Fzc2V0AAAAEwAAAAAAAAAIbWV0YWRhdGEAAAfQAAAADVRva2VuTWV0YWRhdGEAAAAAAAAA",
        "AAAAAAAAANxVcGRhdGUgdGhlIGluZGV4IGJhc2VkIG9uIGN1cnJlbnQgdW5kZXJseWluZyBiYWxhbmNlIHZzIExQIHN1cHBseQpUaGlzIGRpc3RyaWJ1dGVzIGFueSBleGNlc3MgdW5kZXJseWluZyB0b2tlbnMgdG8gYWxsIExQIGhvbGRlcnMgcHJvcG9ydGlvbmFsbHkKCkNhbGwgdGhpcyBhZnRlciBzZW5kaW5nIHRva2VucyB0byB0aGUgY29udHJhY3QgdG8gZGlzdHJpYnV0ZSB0aGVtIGFzIHlpZWxkAAAADHVwZGF0ZV9pbmRleAAAAAAAAAAA",
        "AAAAAAAAAHFEZXBvc2l0IHVuZGVybHlpbmcgYXNzZXRzIGFuZCByZWNlaXZlIExQIHRva2VucwpSZXR1cm5zIHRoZSBhbW91bnQgb2YgTFAgdG9rZW5zIChVU0RDIHZhbHVlKSBjcmVkaXRlZCB0byB0aGUgdXNlcgAAAAAAAAdkZXBvc2l0AAAAAAIAAAAAAAAABGZyb20AAAATAAAAAAAAAAZhbW91bnQAAAAAAAsAAAABAAAACw==",
        "AAAAAAAAAJVXaXRoZHJhdyBMUCB0b2tlbnMgYW5kIHJlY2VpdmUgdW5kZXJseWluZyBhc3NldHMKYW1vdW50OiBUaGUgVVNEQyB2YWx1ZSB0byB3aXRoZHJhdyAoc2FtZSBhcyBiYWxhbmNlKCkgdW5pdHMpClJldHVybnMgdGhlIGFjdHVhbCBVU0RDIGFtb3VudCByZWNlaXZlZAAAAAAAAAh3aXRoZHJhdwAAAAIAAAAAAAAABGZyb20AAAATAAAAAAAAAAZhbW91bnQAAAAAAAsAAAABAAAACw==",
        "AAAAAAAAAEVHZXQgdGhlIGN1cnJlbnQgZXhjaGFuZ2UgcmF0ZSAoaW5kZXgpCjEgc2hhcmUgPSBpbmRleCAvIERFQ0lNQUxTIFVTREMAAAAAAAANZXhjaGFuZ2VfcmF0ZQAAAAAAAAAAAAABAAAACg==",
        "AAAAAAAAACBHZXQgdGhlIHVuZGVybHlpbmcgYXNzZXQgYWRkcmVzcwAAABB1bmRlcmx5aW5nX2Fzc2V0AAAAAAAAAAEAAAAT",
        "AAAAAAAAADBHZXQgdG90YWwgdW5kZXJseWluZyBhc3NldHMgaGVsZCBieSB0aGUgY29udHJhY3QAAAAQdG90YWxfdW5kZXJseWluZwAAAAAAAAABAAAACw==",
        "AAAAAAAAAC9TZXQgdGhlIEJOUEwgQ29yZSBjb250cmFjdCBhZGRyZXNzIChhZG1pbiBvbmx5KQAAAAANc2V0X2JucGxfY29yZQAAAAAAAAEAAAAAAAAACWJucGxfY29yZQAAAAAAABMAAAAA",
        "AAAAAAAAACJHZXQgdGhlIEJOUEwgQ29yZSBjb250cmFjdCBhZGRyZXNzAAAAAAANZ2V0X2JucGxfY29yZQAAAAAAAAAAAAABAAAD6AAAABM=",
        "AAAAAAAAAClCb3Jyb3cgdW5kZXJseWluZyBhc3NldHMgKEJOUEwgQ29yZSBvbmx5KQAAAAAAAAZib3Jyb3cAAAAAAAIAAAAAAAAAAnRvAAAAAAATAAAAAAAAAAZhbW91bnQAAAAAAAsAAAAA",
        "AAAAAAAAACZSZXBheSBib3Jyb3dlZCBhbW91bnQgKEJOUEwgQ29yZSBvbmx5KQAAAAAABXJlcGF5AAAAAAAAAgAAAAAAAAAEZnJvbQAAABMAAAAAAAAABmFtb3VudAAAAAAACwAAAAA=",
        "AAAAAAAAABlHZXQgdG90YWwgYW1vdW50IGJvcnJvd2VkAAAAAAAADnRvdGFsX2JvcnJvd2VkAAAAAAAAAAAAAQAAAAo=",
        "AAAAAAAAADBSZXBheSB3aXRoIGJ1cm4gZm9yIGxpcXVpZGF0aW9uIChCTlBMIENvcmUgb25seSkAAAAPcmVwYXlfd2l0aF9idXJuAAAAAAMAAAAAAAAABGZyb20AAAATAAAAAAAAAAZhbW91bnQAAAAAAAsAAAAAAAAAA2ZlZQAAAAALAAAAAA==",
        "AAAAAAAAAFtDYWxjdWxhdGUgdXRpbGl6YXRpb24gcmF0aW8gKGJvcnJvd2VkIC8gdG90YWxfZGVwb3NpdHMpClJldHVybnMgYmFzaXMgcG9pbnRzICgxMDAwMCA9IDEwMCUpAAAAABF1dGlsaXphdGlvbl9yYXRpbwAAAAAAAAAAAAABAAAABA==",
        "AAAAAAAAAD9HZXQgbG9ja2VkIExQIHRva2VucyBmb3IgYSB1c2VyIGJhc2VkIG9uIEJOUEwgQ29yZSByZXF1aXJlbWVudHMAAAAAEmdldF9sb2NrZWRfYmFsYW5jZQAAAAAAAQAAAAAAAAAEdXNlcgAAABMAAAABAAAACw==",
        "AAAAAAAAADZHZXQgYXZhaWxhYmxlIGJhbGFuY2UgKHRvdGFsIGJhbGFuY2UgLSBsb2NrZWQgYmFsYW5jZSkAAAAAABFhdmFpbGFibGVfYmFsYW5jZQAAAAAAAAEAAAAAAAAABHVzZXIAAAATAAAAAQAAAAs=",
        "AAAAAAAAADBHZXQgdXNlciBiYWxhbmNlIGluZm8gKHRvdGFsLCBsb2NrZWQsIGF2YWlsYWJsZSkAAAAQZ2V0X2JhbGFuY2VfaW5mbwAAAAEAAAAAAAAABHVzZXIAAAATAAAAAQAAA+0AAAADAAAACwAAAAsAAAAL",
        "AAAAAAAAAAAAAAAEbWludAAAAAIAAAAAAAAAAnRvAAAAAAATAAAAAAAAAAZhbW91bnQAAAAAAAsAAAAA",
        "AAAAAAAAAAAAAAAIbWV0YWRhdGEAAAAAAAAAAQAAB9AAAAANVG9rZW5NZXRhZGF0YQAAAA==",
        "AAAAAAAAACtUb3RhbCBzdXBwbHkgaW4gVVNEQyB2YWx1ZSAobm90IHJhdyBzaGFyZXMpAAAAAAx0b3RhbF9zdXBwbHkAAAAAAAAAAQAAAAs=",
        "AAAAAAAAADJHZXQgdXNlcidzIHJhdyBzaGFyZXMgKGZvciBkZWJ1Z2dpbmcvdHJhbnNwYXJlbmN5KQAAAAAACnJhd19zaGFyZXMAAAAAAAEAAAAAAAAABHVzZXIAAAATAAAAAQAAAAo=",
        "AAAAAAAAADFHZXQgdG90YWwgcmF3IHNoYXJlcyAoZm9yIGRlYnVnZ2luZy90cmFuc3BhcmVuY3kpAAAAAAAAEHRvdGFsX3Jhd19zaGFyZXMAAAAAAAAAAQAAAAo=",
        "AAAAAAAAADFCYWxhbmNlIGluIFVTREMgdmFsdWUgKHNoYXJlcyAqIGluZGV4IC8gREVDSU1BTFMpAAAAAAAAB2JhbGFuY2UAAAAAAQAAAAAAAAAEdXNlcgAAABMAAAABAAAACw==",
        "AAAAAAAAAAAAAAAJYWxsb3dhbmNlAAAAAAAAAgAAAAAAAAAEZnJvbQAAABMAAAAAAAAAB3NwZW5kZXIAAAAAEwAAAAEAAAAL",
        "AAAAAAAAAAAAAAAHYXBwcm92ZQAAAAAEAAAAAAAAAARmcm9tAAAAEwAAAAAAAAAHc3BlbmRlcgAAAAATAAAAAAAAAAZhbW91bnQAAAAAAAsAAAAAAAAAEWV4cGlyYXRpb25fbGVkZ2VyAAAAAAAABAAAAAA=",
        "AAAAAAAAAAAAAAAIdHJhbnNmZXIAAAADAAAAAAAAAARmcm9tAAAAEwAAAAAAAAACdG8AAAAAABMAAAAAAAAABmFtb3VudAAAAAAACwAAAAA=",
        "AAAAAAAAAAAAAAANdHJhbnNmZXJfZnJvbQAAAAAAAAQAAAAAAAAAB3NwZW5kZXIAAAAAEwAAAAAAAAAEZnJvbQAAABMAAAAAAAAAAnRvAAAAAAATAAAAAAAAAAZhbW91bnQAAAAAAAsAAAAA",
        "AAAAAAAAAAAAAAAEYnVybgAAAAIAAAAAAAAABGZyb20AAAATAAAAAAAAAAZhbW91bnQAAAAAAAsAAAAA",
        "AAAAAAAAAAAAAAAJYnVybl9mcm9tAAAAAAAAAwAAAAAAAAAHc3BlbmRlcgAAAAATAAAAAAAAAARmcm9tAAAAEwAAAAAAAAAGYW1vdW50AAAAAAALAAAAAA==",
        "AAAAAAAAAAAAAAAIZGVjaW1hbHMAAAAAAAAAAQAAAAQ=",
        "AAAAAAAAAAAAAAAEbmFtZQAAAAAAAAABAAAAEA==",
        "AAAAAAAAAAAAAAAGc3ltYm9sAAAAAAAAAAAAAQAAABA=",
        "AAAAAQAAAAAAAAAAAAAADkJvcnJvd2luZ1Bvd2VyAAAAAAAHAAAAAAAAABNhdmFpbGFibGVfYm9ycm93aW5nAAAAAAsAAAAAAAAAEGN1cnJlbnRfYm9ycm93ZWQAAAALAAAAAAAAAAxjdXJyZW50X2RlYnQAAAALAAAAAAAAAApscF9iYWxhbmNlAAAAAAALAAAAAAAAAA1tYXhfYm9ycm93aW5nAAAAAAAACwAAAAAAAAAVb3ZlcmFsbF9oZWFsdGhfZmFjdG9yAAAAAAAACwAAAAAAAAATcmVxdWlyZWRfY29sbGF0ZXJhbAAAAAAL",
        "AAAAAQAAAAAAAAAAAAAADVRva2VuTWV0YWRhdGEAAAAAAAADAAAAAAAAAAdkZWNpbWFsAAAAAAQAAAAAAAAABG5hbWUAAAAQAAAAAAAAAAZzeW1ib2wAAAAAABA=" ]),
      options
    )
  }
  public readonly fromJSON = {
    initialize: this.txFromJSON<null>,
        update_index: this.txFromJSON<null>,
        deposit: this.txFromJSON<i128>,
        withdraw: this.txFromJSON<i128>,
        exchange_rate: this.txFromJSON<u128>,
        underlying_asset: this.txFromJSON<string>,
        total_underlying: this.txFromJSON<i128>,
        set_bnpl_core: this.txFromJSON<null>,
        get_bnpl_core: this.txFromJSON<Option<string>>,
        borrow: this.txFromJSON<null>,
        repay: this.txFromJSON<null>,
        total_borrowed: this.txFromJSON<u128>,
        repay_with_burn: this.txFromJSON<null>,
        utilization_ratio: this.txFromJSON<u32>,
        get_locked_balance: this.txFromJSON<i128>,
        available_balance: this.txFromJSON<i128>,
        get_balance_info: this.txFromJSON<readonly [i128, i128, i128]>,
        mint: this.txFromJSON<null>,
        metadata: this.txFromJSON<TokenMetadata>,
        total_supply: this.txFromJSON<i128>,
        raw_shares: this.txFromJSON<u128>,
        total_raw_shares: this.txFromJSON<u128>,
        balance: this.txFromJSON<i128>,
        allowance: this.txFromJSON<i128>,
        approve: this.txFromJSON<null>,
        transfer: this.txFromJSON<null>,
        transfer_from: this.txFromJSON<null>,
        burn: this.txFromJSON<null>,
        burn_from: this.txFromJSON<null>,
        decimals: this.txFromJSON<u32>,
        name: this.txFromJSON<string>,
        symbol: this.txFromJSON<string>
  }
}