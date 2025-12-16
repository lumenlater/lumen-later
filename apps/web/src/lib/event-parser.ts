/**
 * Event Parser Utility
 *
 * Parses Soroban contract events from Goldsky indexed data.
 * Used in user transactions and admin activity pages.
 */

import { CONTRACT_IDS } from '../../../../packages/contract-ids';

// Contract ID to name mapping
export const CONTRACT_NAMES: Record<string, string> = {
  [CONTRACT_IDS.BNPL_CORE]: 'BNPL_CORE',
  [CONTRACT_IDS.LP_TOKEN]: 'LP_TOKEN',
  [CONTRACT_IDS.USDC_TOKEN]: 'USDC_TOKEN',
};

// Contract badge colors
export const CONTRACT_COLORS: Record<string, string> = {
  BNPL_CORE: 'bg-purple-100 text-purple-800 border-purple-200',
  LP_TOKEN: 'bg-blue-100 text-blue-800 border-blue-200',
  USDC_TOKEN: 'bg-green-100 text-green-800 border-green-200',
  UNKNOWN: 'bg-gray-100 text-gray-800 border-gray-200',
};

// Event data interface
export interface ContractEvent {
  id: string;
  contractId: string;
  contractName: string;
  type: string | null;
  topics: string | null;
  data: string | null;
  ledgerSequence: string;
  ledgerClosedAt: string;
  transactionHash: string;
  transactionSuccessful: boolean;
}

// Parsed topics result
export interface ParsedTopics {
  action: string;
  from?: string;
  to?: string;
}

// Parsed data result
export interface ParsedData {
  amount?: string;
  shares?: string;
  expiration?: number;
  raw?: string;
}

/**
 * Parse event topics to extract action and addresses
 */
export function parseTopics(topics: string | null): ParsedTopics {
  if (!topics) return { action: 'unknown' };

  try {
    const parsed = JSON.parse(topics);
    if (!Array.isArray(parsed)) return { action: 'unknown' };

    // First element is usually the action (symbol)
    const action = parsed[0]?.symbol || parsed[0] || 'unknown';

    // Extract addresses from remaining elements
    let from: string | undefined;
    let to: string | undefined;

    for (let i = 1; i < parsed.length; i++) {
      const item = parsed[i];
      if (item?.address) {
        if (!from) from = item.address;
        else if (!to) to = item.address;
      }
    }

    return { action, from, to };
  } catch {
    return { action: 'unknown' };
  }
}

/**
 * Parse event data to extract amounts and other values
 */
export function parseData(data: string | null): ParsedData {
  if (!data) return { raw: '-' };

  try {
    const parsed = JSON.parse(data);

    // Handle simple i128 format (USDC transfer amount)
    if (parsed.i128) {
      const amount = BigInt(parsed.i128) / BigInt(10 ** 7);
      return { amount: `${amount.toString()} USDC` };
    }

    // Handle LP_TOKEN event format with map (deposit, withdraw, borrow, repay)
    if (parsed.map && Array.isArray(parsed.map)) {
      const result: ParsedData = {};
      for (const item of parsed.map) {
        const key = item.key?.symbol;
        const val = item.val?.i128;
        if (key === 'amount' && val) {
          const amount = BigInt(val) / BigInt(10 ** 7);
          result.amount = `${amount.toString()} USDC`;
        }
        if ((key === 'shares_minted' || key === 'shares_burned') && val) {
          const shares = BigInt(val) / BigInt(10 ** 7);
          result.shares = `${shares.toString()} LP`;
        }
        if (key === 'fee' && val) {
          const fee = BigInt(val) / BigInt(10 ** 7);
          result.raw = `Fee: ${fee.toString()} USDC`;
        }
      }
      if (result.amount || result.shares) return result;
    }

    // Handle approve format: {"vec":[{"i128":"amount"},{"u32":expiration}]}
    if (parsed.vec && Array.isArray(parsed.vec)) {
      const result: ParsedData = {};
      for (const item of parsed.vec) {
        if (item.i128) {
          const amount = BigInt(item.i128) / BigInt(10 ** 7);
          result.amount = `${amount.toString()} USDC`;
        }
        if (item.u32 !== undefined) {
          result.expiration = item.u32;
        }
      }
      if (result.amount) return result;
    }

    return { raw: JSON.stringify(parsed) };
  } catch {
    return { raw: data };
  }
}

/**
 * Shorten address for display
 */
export function shortenAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Filter and deduplicate events for display
 * - Removes UNKNOWN contracts
 * - Removes USDC transfers that are part of LP deposit/withdraw
 */
export function filterEvents(events: ContractEvent[]): ContractEvent[] {
  // Filter out UNKNOWN contracts
  const knownEvents = events.filter(e => e.contractName !== 'UNKNOWN');

  // Find txHashes that have LP_TOKEN deposit/withdraw
  const lpTxHashes = new Set(
    knownEvents
      .filter(e => {
        if (e.contractName !== 'LP_TOKEN') return false;
        const { action } = parseTopics(e.topics);
        return ['deposit', 'withdraw'].includes(action);
      })
      .map(e => e.transactionHash)
  );

  // Filter out USDC transfers that have same txHash as LP deposit/withdraw
  return knownEvents.filter(e => {
    if (e.contractName === 'USDC_TOKEN') {
      const { action } = parseTopics(e.topics);
      if (action === 'transfer' && lpTxHashes.has(e.transactionHash)) {
        return false;
      }
    }
    return true;
  });
}

/**
 * Get display label for action
 */
export function getActionLabel(action: string): string {
  const labels: Record<string, string> = {
    deposit: 'Deposit',
    withdraw: 'Withdraw',
    transfer: 'Transfer',
    approve: 'Approve',
    mint: 'Mint',
    burn: 'Burn',
    borrow: 'Borrow',
    repay: 'Repay',
    bill_new: 'New Bill',
    payment: 'Payment',
    liquidate: 'Liquidation',
    m_enroll: 'Merchant Enroll',
    m_status: 'Merchant Status',
    init: 'Initialize',
  };
  return labels[action] || action;
}

/**
 * Determine if event represents outgoing transaction
 */
export function isOutgoingEvent(event: ContractEvent, userAddress?: string): boolean {
  const { action, from } = parseTopics(event.topics);

  // LP events: deposit is outgoing, withdraw is incoming
  if (event.contractName === 'LP_TOKEN') {
    return action === 'deposit';
  }

  // For transfers, check if user is the sender
  if (userAddress && from === userAddress) {
    return true;
  }

  return false;
}
