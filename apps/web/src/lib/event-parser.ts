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
  merchant?: string;
  merchantInfoId?: string;
  timestamp?: string;
  newStatus?: string;
  oldStatus?: string;
  raw?: string;
}

// Merchant status from indexed events
export type MerchantOnChainStatus = 'Pending' | 'Approved' | 'Rejected' | 'Suspended' | 'None';

// Merchant data from indexed events
export interface IndexedMerchant {
  address: string;
  merchantInfoId?: string;
  status: MerchantOnChainStatus;
  enrolledAt: string;
  approvedAt?: string;
  ledgerSequence: string;
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

    // Handle map format events (LP_TOKEN, BNPL_CORE merchant events)
    if (parsed.map && Array.isArray(parsed.map)) {
      const result: ParsedData = {};
      for (const item of parsed.map) {
        const key = item.key?.symbol;
        const val = item.val;

        // LP_TOKEN: amount (i128)
        if (key === 'amount' && val?.i128) {
          const amount = BigInt(val.i128) / BigInt(10 ** 7);
          result.amount = `${amount.toString()} USDC`;
        }
        // LP_TOKEN: shares_minted/shares_burned (i128)
        if ((key === 'shares_minted' || key === 'shares_burned') && val?.i128) {
          const shares = BigInt(val.i128) / BigInt(10 ** 7);
          result.shares = `${shares.toString()} LP`;
        }
        // LP_TOKEN: fee (i128)
        if (key === 'fee' && val?.i128) {
          const fee = BigInt(val.i128) / BigInt(10 ** 7);
          result.raw = `Fee: ${fee.toString()} USDC`;
        }
        // BNPL_CORE m_enroll: merchant address
        if (key === 'merchant' && val?.address) {
          result.merchant = val.address;
        }
        // BNPL_CORE m_enroll: merchant_info_id (string)
        if (key === 'merchant_info_id' && val?.string) {
          result.merchantInfoId = val.string;
        }
        // BNPL_CORE m_enroll/m_status: timestamp (u64)
        if (key === 'timestamp' && val?.u64) {
          const ts = parseInt(val.u64, 10);
          result.timestamp = new Date(ts * 1000).toLocaleString();
        }
        // BNPL_CORE m_status: new_status (vec with symbol)
        if (key === 'new_status' && val?.vec && Array.isArray(val.vec)) {
          result.newStatus = val.vec[0]?.symbol || 'Unknown';
        }
        // BNPL_CORE m_status: old_status (vec with symbol)
        if (key === 'old_status' && val?.vec && Array.isArray(val.vec)) {
          result.oldStatus = val.vec[0]?.symbol || 'Unknown';
        }
      }
      if (result.amount || result.shares || result.merchant || result.newStatus) return result;
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

/**
 * Parse raw event data to extract merchant address (for m_status events)
 */
export function parseMerchantFromData(data: string | null): string | undefined {
  if (!data) return undefined;
  try {
    const parsed = JSON.parse(data);
    if (parsed.map && Array.isArray(parsed.map)) {
      for (const item of parsed.map) {
        if (item.key?.symbol === 'merchant' && item.val?.address) {
          return item.val.address;
        }
      }
    }
  } catch {
    return undefined;
  }
  return undefined;
}

/**
 * Build merchant list from indexed events
 * - m_enroll events create merchants with Pending status
 * - m_status events update the status
 */
export function buildMerchantListFromEvents(events: ContractEvent[]): IndexedMerchant[] {
  const merchantMap = new Map<string, IndexedMerchant>();

  // Sort events by ledger sequence (oldest first)
  const sortedEvents = [...events].sort((a, b) =>
    parseInt(a.ledgerSequence) - parseInt(b.ledgerSequence)
  );

  for (const event of sortedEvents) {
    if (event.contractName !== 'BNPL_CORE') continue;

    const { action } = parseTopics(event.topics);
    const data = parseData(event.data);

    if (action === 'm_enroll' && data.merchant) {
      // New merchant enrolled
      merchantMap.set(data.merchant, {
        address: data.merchant,
        merchantInfoId: data.merchantInfoId,
        status: 'Pending',
        enrolledAt: event.ledgerClosedAt,
        ledgerSequence: event.ledgerSequence,
      });
    } else if (action === 'm_status' && data.newStatus) {
      // Status update - get merchant address from data
      const merchantAddress = parseMerchantFromData(event.data);
      if (merchantAddress && merchantMap.has(merchantAddress)) {
        const merchant = merchantMap.get(merchantAddress)!;
        merchant.status = data.newStatus as MerchantOnChainStatus;
        if (data.newStatus === 'Approved') {
          merchant.approvedAt = event.ledgerClosedAt;
        }
      }
    }
  }

  // Return as array, sorted by enrollment date (newest first)
  return Array.from(merchantMap.values()).sort((a, b) =>
    new Date(b.enrolledAt).getTime() - new Date(a.enrolledAt).getTime()
  );
}
